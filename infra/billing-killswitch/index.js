// 예산 알림(Pub/Sub)을 받아, 이 프로젝트에 비용이 1원이라도 잡히면 프로젝트 결제를 끊는다.
// 결제가 끊기면 지도 SDK 등 유료 계정이 필요한 기능이 멈추지만 요금은 더 나가지 않는다.
// 다시 켜려면: 콘솔 > 결제 > 이 프로젝트에 결제 계정 다시 연결.
const functions = require('@google-cloud/functions-framework');
const { CloudBillingClient } = require('@google-cloud/billing');

const PROJECT_ID = process.env.TARGET_PROJECT;
const billing = new CloudBillingClient();

functions.cloudEvent('stopBilling', async (cloudEvent) => {
  const raw = cloudEvent.data?.message?.data;
  if (!raw) return;
  const msg = JSON.parse(Buffer.from(raw, 'base64').toString());
  const cost = Number(msg.costAmount ?? 0);
  console.log(`budget=${msg.budgetDisplayName} cost=${cost} ${msg.currencyCode}`);
  if (!(cost > 0)) return;

  const name = `projects/${PROJECT_ID}`;
  const [info] = await billing.getProjectBillingInfo({ name });
  if (!info.billingEnabled) {
    console.log('billing already disabled');
    return;
  }
  await billing.updateProjectBillingInfo({ name, projectBillingInfo: { billingAccountName: '' } });
  console.log(`billing disabled for ${PROJECT_ID} (cost ${cost} ${msg.currencyCode})`);
});

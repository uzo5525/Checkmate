/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { friendlyError } from './errors.ts';

test('한글 안내는 그대로', () => {
  assert.equal(friendlyError(new Error('방을 찾을 수 없어요.')), '방을 찾을 수 없어요.');
});

test('영문 오류는 쉬운 말로', () => {
  assert.match(friendlyError(new Error('TypeError: Failed to fetch')), /인터넷 연결/);
  assert.match(friendlyError('duplicate key value'), /인터넷 연결/);
});

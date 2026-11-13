import { getCountry } from '@/data/countries';
import { nightsLabel } from '@/lib/dates';

import type { CreateTripInput } from './types';

export function defaultTripTitle(input: Pick<CreateTripInput, 'countryCode' | 'departDate' | 'returnDate'>): string {
  const name = getCountry(input.countryCode)?.country.name ?? input.countryCode;
  return `${name} ${nightsLabel(input.departDate, input.returnDate)}`;
}

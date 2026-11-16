import { expect, it } from 'vitest';
import { isPerson } from './accounts';

it('tells automation accounts from people', () => {
  expect(isPerson('u1', 'Mark Peters', 'NATIVE')).toBe(true);
  expect(isPerson('u2', 'n8n', 'NATIVE')).toBe(false);
  expect(isPerson('u3', 'ServiceNow import', 'NATIVE')).toBe(false);
  expect(isPerson('u4', 'LeanIX Sync', undefined)).toBe(false);
  expect(isPerson('u5', 'Anna de Vries', 'EXTERNAL')).toBe(false);
  // A whole word only: Botha and Systemsson are people.
  expect(isPerson('u6', 'Pieter Botha', 'NATIVE')).toBe(true);
  expect(isPerson('u7', 'Ida Systemsson', 'NATIVE')).toBe(true);
  expect(isPerson('u8', 'E2ETest User01', 'NATIVE')).toBe(false);
  expect(isPerson('u9', 'achrafTest rizkTest', 'NATIVE')).toBe(false);
  expect(isPerson('u10', 'Lucia Testa', 'NATIVE')).toBe(true);
});

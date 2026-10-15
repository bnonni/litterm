import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {privacyFlagsAsBitmask} from '../../src/litd_requests/index.js';
import {privacyFlagsFromBitmask} from '../../src/litd_responses/index.js';

test('No bits are no flags', () => {
  deepStrictEqual(privacyFlagsFromBitmask('0'), []);
});

test('Bits are mapped to flag types', () => {
  deepStrictEqual(privacyFlagsFromBitmask('5'), [
    'clear_pubkeys',
    'clear_channel_ids',
  ]);
});

test('Unknown bits keep their bit number', () => {
  deepStrictEqual(privacyFlagsFromBitmask('9223372036854775936'), [
    'clear_network_addresses',
    'bit_63',
  ]);
});

test('A numeric bitmask is expected', () => {
  throws(
    () => privacyFlagsFromBitmask('x'),
    /ExpectedNumericPrivacyFlagsBitmask/,
  );
});

test('Flag types are mapped to bits', () => {
  equal(privacyFlagsAsBitmask(['clear_channel_ids', 'clear_pubkeys']), '5');
  equal(privacyFlagsAsBitmask([]), '0');
});

test('Known flag types are expected', () => {
  throws(
    () => privacyFlagsAsBitmask(['clear_all']),
    /ExpectedKnownPrivacyFlagType/,
  );
});

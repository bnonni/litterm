import privacyFlagTypes from './privacy_flag_types.js';

const bitCount = 64;
const isInteger = (n: unknown) => /^\d+$/.test(String(n));
const one = BigInt(1);

/** Privacy flag types from a privacy flags bitmask

  An unknown flag has the type `bit_<number>`

  <Privacy Flags Bitmask Numeric String>

  @throws
  <Error>

  @returns
  [<Privacy Flag Type String>]
*/
export default (bitmask: string): string[] => {
  if (!isInteger(bitmask)) {
    throw new Error('ExpectedNumericPrivacyFlagsBitmask');
  }

  const flags = BigInt(bitmask);

  return Array.from({length: bitCount}, (_, bit) => bit)
    .filter(bit => !!(flags & (one << BigInt(bit))))
    .map(bit => privacyFlagTypes[bit] || `bit_${bit}`);
};

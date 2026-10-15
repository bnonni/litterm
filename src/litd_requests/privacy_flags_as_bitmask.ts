import {privacyFlagTypes} from '../litd_responses/index.js';

const {isArray} = Array;
const one = BigInt(1);

/** Privacy flags bitmask from privacy flag types

  [<Privacy Flag Type String>]

  @throws
  <Error>

  @returns
  <Privacy Flags Bitmask Numeric String>
*/
export default (flags: string[]) => {
  if (!isArray(flags)) {
    throw new Error('ExpectedArrayOfPrivacyFlagTypes');
  }

  return flags
    .map(flag => {
      const bit = privacyFlagTypes.indexOf(flag);

      if (bit < 0) {
        throw new Error('ExpectedKnownPrivacyFlagType');
      }

      return one << BigInt(bit);
    })
    .reduce((sum, n) => sum | n, BigInt(0))
    .toString();
};

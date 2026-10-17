const jsonTokens = /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
const {parse} = JSON;
const quoted = (n: string) => (n.startsWith('"') ? n : `"${n}"`);

/** JSON value from lnd custom channel data, with numbers as numeric strings

  tapd writes the custom channel data of lnd responses as JSON. Asset amounts
  are uint64 numbers, and a JavaScript number can lose their precision. Thus
  each JSON number becomes a numeric string.

  <Custom Channel Data Buffer Object>

  @throws
  <Error>

  @returns
  <JSON Value Object> or <Undefined> // when there is no custom channel data
*/
export default (data?: Buffer | null): unknown => {
  // Exit early when there is no custom channel data
  if (!data?.length) {
    return undefined;
  }

  try {
    return parse(data.toString('utf8').replace(jsonTokens, quoted));
  } catch (err) {
    throw new Error('ExpectedJsonCustomChannelData', {cause: err});
  }
};

type Args = {
  method: string;
  litd?: unknown;
  type: string;
};

/** Determine if object is an expected litd Object

  {
    method: <Method Name String>
    [litd]: <litd Object>
    type: <Method Type String>
  }

  @returns
  <Is Expected litd Object Bool>
*/
export default ({method, litd, type}: Args) => {
  const service = (litd as Record<string, Record<string, unknown>>)?.[type];

  return !!service && typeof service[method] === 'function';
};

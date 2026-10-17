type Args = {
  method: string;
  litd?: unknown;
  type: string;
};

/** Determine if a litd Object has an lnd Object with the expected method

  {
    method: <Method Name String>
    [litd]: <litd Object>
    type: <lnd Service Type String>
  }

  @returns
  <Has Expected lnd Object Bool>
*/
export default ({method, litd, type}: Args) => {
  const lnd = (litd as {lnd?: Record<string, Record<string, unknown>>})?.lnd;

  return !!lnd?.[type] && typeof lnd[type][method] === 'function';
};

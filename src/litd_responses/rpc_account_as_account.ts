const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const {isArray} = Array;
const isInteger = (n: unknown) => typeof n === 'string' && /^-?\d+$/.test(n);
const noExpiry = '0';
const pendingStates = ['IN_FLIGHT', 'INITIATED'];

export type RpcAccount = {
  current_balance: string;
  expiration_date: string;
  id: string;
  initial_balance: string;
  invoices: {hash: Buffer}[];
  label: string;
  last_update: string;
  payments: {full_amount: string; hash: Buffer; state: string}[];
};

export type Account = {
  /** Current Balance Tokens */
  balance: number;
  /** Account Expires At ISO 8601 Date */
  expires_at?: string;
  /** Account Id Hex */
  id: string;
  /** Initial Balance Tokens */
  initial_balance: number;
  invoices: {
    /** Invoice Payment Hash Hex */
    id: string;
  }[];
  /** Account Label */
  label?: string;
  payments: {
    /** Payment Hash Hex */
    id: string;
    /** Payment Is Confirmed */
    is_confirmed: boolean;
    /** Payment Failed */
    is_failed: boolean;
    /** Payment Is Pending */
    is_pending: boolean;
    /** Reserved Tokens Including the Fee Limit */
    tokens: number;
  }[];
  /** Account Updated At ISO 8601 Date */
  updated_at: string;
};

/** Account from an RPC account

  {
    current_balance: <Current Balance Satoshis Numeric String>
    expiration_date: <Expires At Unix Seconds Numeric String> // 0 is no expiry
    id: <Account Id Hex String>
    initial_balance: <Initial Balance Satoshis Numeric String>
    invoices: [{
      hash: <Invoice Payment Hash Buffer Object>
    }]
    label: <Account Label String>
    last_update: <Updated At Unix Seconds Numeric String>
    payments: [{
      full_amount: <Reserved Satoshis Including Fee Limit Numeric String>
      hash: <Payment Hash Buffer Object>
      state: <Payment State String>
    }]
  }

  @throws
  <Error>

  @returns
  {
    balance: <Current Balance Tokens Number>
    [expires_at]: <Account Expires At ISO 8601 Date String>
    id: <Account Id Hex String>
    initial_balance: <Initial Balance Tokens Number>
    invoices: [{
      id: <Invoice Payment Hash Hex String>
    }]
    [label]: <Account Label String>
    payments: [{
      id: <Payment Hash Hex String>
      is_confirmed: <Payment Is Confirmed Bool>
      is_failed: <Payment Failed Bool>
      is_pending: <Payment Is Pending Bool>
      tokens: <Reserved Tokens Including the Fee Limit Number>
    }]
    updated_at: <Account Updated At ISO 8601 Date String>
  }
*/
export default (account?: RpcAccount | null): Account => {
  if (!account) {
    throw new Error('ExpectedRpcAccountDetails');
  }

  if (!account.id) {
    throw new Error('ExpectedAccountIdInRpcAccountDetails');
  }

  if (!isInteger(account.current_balance)) {
    throw new Error('ExpectedCurrentBalanceInRpcAccountDetails');
  }

  if (!isInteger(account.expiration_date)) {
    throw new Error('ExpectedExpirationDateInRpcAccountDetails');
  }

  if (!isInteger(account.initial_balance)) {
    throw new Error('ExpectedInitialBalanceInRpcAccountDetails');
  }

  if (!isArray(account.invoices)) {
    throw new Error('ExpectedArrayOfInvoicesInRpcAccountDetails');
  }

  if (!isInteger(account.last_update)) {
    throw new Error('ExpectedLastUpdateInRpcAccountDetails');
  }

  if (!isArray(account.payments)) {
    throw new Error('ExpectedArrayOfPaymentsInRpcAccountDetails');
  }

  if (account.invoices.some(invoice => !isBuffer(invoice?.hash))) {
    throw new Error('ExpectedInvoiceHashesInRpcAccountDetails');
  }

  account.payments.forEach(payment => {
    if (!isBuffer(payment?.hash)) {
      throw new Error('ExpectedPaymentHashInRpcAccountPayment');
    }

    if (!isInteger(payment.full_amount)) {
      throw new Error('ExpectedFullAmountInRpcAccountPayment');
    }

    if (!payment.state) {
      throw new Error('ExpectedPaymentStateInRpcAccountPayment');
    }
  });

  const hasExpiry = account.expiration_date !== noExpiry;

  return {
    balance: Number(account.current_balance),
    expires_at: hasExpiry ? dateFrom(account.expiration_date) : undefined,
    id: account.id,
    initial_balance: Number(account.initial_balance),
    invoices: account.invoices.map(invoice => ({
      id: invoice.hash.toString('hex'),
    })),
    label: account.label || undefined,
    payments: account.payments.map(payment => ({
      id: payment.hash.toString('hex'),
      is_confirmed: payment.state === 'SUCCEEDED',
      is_failed: payment.state === 'FAILED',
      is_pending: pendingStates.includes(payment.state),
      tokens: Number(payment.full_amount),
    })),
    updated_at: dateFrom(account.last_update),
  };
};

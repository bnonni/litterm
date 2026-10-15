import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {authenticatedLitdGrpc} from '../../src/index.js';

const lnd = {default: {getInfo: () => {}}};
const protosPath = fileURLToPath(new URL('../../protos/', import.meta.url));
const tapd = {default: {newAddr: () => {}}};

// One method of each service shows that its proto file loaded
const expectedMethods = {
  accounts: 'accountInfo',
  autopilot: 'listAutopilotFeatures',
  default: 'getInfo',
  firewall: 'listActions',
  sessions: 'addSession',
  status: 'subServerStatus',
};

const services = Object.keys(expectedMethods).sort();

const tests = [
  {
    args: {macaroon: Buffer.alloc(1).toString('hex')},
    description: 'An authenticated litd gRPC Object is returned',
    expected: {services},
  },
  {
    args: {cert: '00', macaroon: Buffer.alloc(1).toString('hex')},
    description: 'Passing a cert for the authenticated litd gRPC is supported',
    expected: {services},
  },
  {
    args: {path: protosPath},
    description: 'The path can be specified',
    expected: {services},
  },
  {
    args: {lnd, tapd},
    description: 'The lnd and tapd objects are added to litd',
    expected: {services: [...services, 'lnd', 'tapd'].sort()},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    const {litd} = authenticatedLitdGrpc(args);

    deepStrictEqual(Object.keys(litd).sort(), expected.services, 'Services');

    Object.entries(expectedMethods).forEach(([type, method]) => {
      const service = litd[type as keyof typeof expectedMethods];

      equal(typeof service[method], 'function', `Got ${type}.${method}`);
    });

    equal(litd.lnd, args.lnd, 'Got lnd');
    equal(litd.tapd, args.tapd, 'Got tapd');

    return;
  });
});

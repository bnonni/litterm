import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import test from 'node:test';

import {unauthenticatedLitdGrpc} from '../../src/index.js';

const tests = [
  {
    args: {},
    description: 'An unauthenticated litd gRPC Object is returned',
  },
  {
    args: {cert: '00'},
    description: 'A cert for the unauthenticated litd gRPC is supported',
  },
];

tests.forEach(({args, description}) => {
  return test(description, () => {
    const {litd} = unauthenticatedLitdGrpc(args);

    deepStrictEqual(Object.keys(litd), ['status'], 'Got services');
    equal(typeof litd.status.subServerStatus, 'function', 'Got method');

    return;
  });
});

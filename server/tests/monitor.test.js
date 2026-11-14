
const test = require('node:test');
const assert = require('node:assert/strict');

// Set test configuration before loading monitor.js.
// monitor.js imports db.js, which initializes the application config.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'pulsewatch-test-secret-at-least-32-characters-long';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_NAME = process.env.DB_NAME || 'pulsewatch';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';

const {
  transitionMonitorState
} = require('../src/services/monitor');

test('UP monitor remains UP after a successful check', () => {
  const result = transitionMonitorState(
    {
      status: 'UP',
      failure_threshold: 3,
      recovery_threshold: 2,
      consecutive_failures: 0,
      consecutive_successes: 0
    },
    'UP'
  );

  assert.equal(result.nextStatus, 'UP');
  assert.equal(result.consecutiveSuccesses, 1);
  assert.equal(result.consecutiveFailures, 0);
  assert.equal(result.transitionedToDown, false);
  assert.equal(result.transitionedToUp, false);
});

test('monitor transitions to DOWN only after failure threshold', () => {
  const monitor = {
    status: 'UP',
    failure_threshold: 3,
    recovery_threshold: 2,
    consecutive_failures: 1,
    consecutive_successes: 0
  };

  const secondFailure = transitionMonitorState(monitor, 'DOWN');

  assert.equal(secondFailure.nextStatus, 'UP');
  assert.equal(secondFailure.consecutiveFailures, 2);
  assert.equal(secondFailure.transitionedToDown, false);

  const thirdFailure = transitionMonitorState(
    {
      ...monitor,
      consecutive_failures: 2
    },
    'DOWN'
  );

  assert.equal(thirdFailure.nextStatus, 'DOWN');
  assert.equal(thirdFailure.consecutiveFailures, 3);
  assert.equal(thirdFailure.transitionedToDown, true);
});

test('already DOWN monitor does not generate another DOWN transition', () => {
  const result = transitionMonitorState(
    {
      status: 'DOWN',
      failure_threshold: 3,
      recovery_threshold: 2,
      consecutive_failures: 3,
      consecutive_successes: 0
    },
    'DOWN'
  );

  assert.equal(result.nextStatus, 'DOWN');
  assert.equal(result.transitionedToDown, false);
  assert.equal(result.consecutiveFailures, 4);
});

test('DOWN monitor requires recovery threshold before becoming UP', () => {
  const monitor = {
    status: 'DOWN',
    failure_threshold: 3,
    recovery_threshold: 2,
    consecutive_failures: 3,
    consecutive_successes: 0
  };

  const firstSuccess = transitionMonitorState(monitor, 'UP');

  assert.equal(firstSuccess.nextStatus, 'DOWN');
  assert.equal(firstSuccess.consecutiveSuccesses, 1);
  assert.equal(firstSuccess.transitionedToUp, false);

  const secondSuccess = transitionMonitorState(
    {
      ...monitor,
      consecutive_successes: 1,
      consecutive_failures: 0
    },
    'UP'
  );

  assert.equal(secondSuccess.nextStatus, 'UP');
  assert.equal(secondSuccess.consecutiveSuccesses, 2);
  assert.equal(secondSuccess.transitionedToUp, true);
});

test('DOWN monitor resets successful checks after another failure', () => {
  const result = transitionMonitorState(
    {
      status: 'DOWN',
      failure_threshold: 3,
      recovery_threshold: 2,
      consecutive_failures: 3,
      consecutive_successes: 1
    },
    'DOWN'
  );

  assert.equal(result.nextStatus, 'DOWN');
  assert.equal(result.consecutiveSuccesses, 0);
  assert.equal(result.transitionedToUp, false);
});

test('PENDING monitor becomes UP after recovery threshold', () => {
  const result = transitionMonitorState(
    {
      status: 'PENDING',
      failure_threshold: 3,
      recovery_threshold: 2,
      consecutive_failures: 0,
      consecutive_successes: 1
    },
    'UP'
  );

  assert.equal(result.nextStatus, 'UP');
  assert.equal(result.consecutiveSuccesses, 2);
  assert.equal(result.transitionedToUp, false);
});

test('default thresholds are used when threshold values are missing', () => {
  const firstFailure = transitionMonitorState(
    {
      status: 'UP',
      consecutive_failures: 0,
      consecutive_successes: 0
    },
    'DOWN'
  );

  assert.equal(firstFailure.nextStatus, 'UP');
  assert.equal(firstFailure.consecutiveFailures, 1);
  assert.equal(firstFailure.transitionedToDown, false);
});

/**
 * test/run.js — Personal Dashboard test runner
 *
 * Requires each test file and reports aggregate pass/fail counts.
 * Run with: node test/run.js
 *
 * NOTE: localStorage is unavailable in Node.js. Each test file is responsible
 * for setting up its own mock or the harness below sets a global stub before
 * any module code runs.
 */

'use strict';

/* --------------------------------------------------------------------------
   Minimal localStorage mock for Node.js
   -------------------------------------------------------------------------- */
if (typeof localStorage === 'undefined') {
  var _store = {};
  global.localStorage = {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(_store, key)
        ? _store[key]
        : null;
    },
    setItem: function (key, value) {
      _store[key] = String(value);
    },
    removeItem: function (key) {
      delete _store[key];
    },
    clear: function () {
      _store = {};
    }
  };
}

/* --------------------------------------------------------------------------
   Minimal document stub so app.js does not crash when required
   -------------------------------------------------------------------------- */
if (typeof document === 'undefined') {
  global.document = {
    addEventListener: function () {},
    getElementById: function () { return null; },
    documentElement: { classList: { add: function () {}, remove: function () {}, toggle: function () {} } }
  };
}

if (typeof window === 'undefined') {
  global.window = global;
}

/* --------------------------------------------------------------------------
   Test file registry — add new test files here as they are created
   -------------------------------------------------------------------------- */
var testFiles = [
  './unit/greeting.test.js',
  './unit/username.test.js',
  './unit/timer.test.js',
  './unit/tasks.test.js',
  './unit/links.test.js'
];

/* --------------------------------------------------------------------------
   Runner
   -------------------------------------------------------------------------- */
var totalPassed = 0;
var totalFailed = 0;
var totalFiles  = 0;

testFiles.forEach(function (filePath) {
  try {
    var result = require(filePath);
    // Each test file may export { passed: n, failed: n } for aggregation.
    if (result && typeof result === 'object') {
      var p = Number(result.passed) || 0;
      var f = Number(result.failed) || 0;
      totalPassed += p;
      totalFailed += f;
      if (p > 0 || f > 0) {
        console.log('[' + filePath + '] passed: ' + p + ', failed: ' + f);
      } else {
        console.log('[' + filePath + '] loaded (no tests yet)');
      }
    } else {
      console.log('[' + filePath + '] loaded (no exports)');
    }
    totalFiles++;
  } catch (err) {
    console.error('[' + filePath + '] ERROR: ' + err.message);
    totalFailed++;
  }
});

console.log('\n========================================');
console.log('Test files : ' + totalFiles);
console.log('Passed     : ' + totalPassed);
console.log('Failed     : ' + totalFailed);
console.log('========================================');

if (totalFailed > 0) {
  process.exit(1);
}

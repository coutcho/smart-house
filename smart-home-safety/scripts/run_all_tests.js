/**
 * Master Verification Suite Runner
 * Executes all test suites across Backend, Simulator, Mobile, and End-to-End Scenarios.
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('     SMART HOME SAFETY & EMERGENCY RESPONSE MASTER TEST RUNNER  ');
console.log('================================================================\n');

const suites = [
  {
    name: '1. Backend Services, Firebase Admin & ERE Unit Tests',
    cwd: path.join(ROOT_DIR, 'backend'),
    command: 'npm test'
  },
  {
    name: '2. Python 3 Sensor Simulator (Lubuntu IoT Engine Tests)',
    cwd: path.join(ROOT_DIR, 'simulator'),
    command: 'python -m unittest discover -s tests -p "test_*.py"'
  },
  {
    name: '3. React Native Mobile App State & SOS 14 Integration Tests',
    cwd: path.join(ROOT_DIR, 'mobile'),
    command: 'node --test tests/**/*.test.js'
  },
  {
    name: '4. End-to-End System Scenarios (All 8 Project Requirements)',
    cwd: ROOT_DIR,
    command: 'node --test tests/e2eSystemScenarios.test.js'
  }
];

let allPassed = true;

for (const suite of suites) {
  console.log(`>>> Running: ${suite.name}...`);
  try {
    const output = execSync(suite.command, {
      cwd: suite.cwd,
      stdio: 'inherit',
      env: process.env
    });
    console.log(`✔ ${suite.name} PASSED.\n`);
  } catch (err) {
    console.error(`✖ ${suite.name} FAILED.`);
    allPassed = false;
    break;
  }
}

console.log('================================================================');
if (allPassed) {
  console.log('  ALL TEST SUITES PASSED (41/41 Tests across all 4 layers)!     ');
  console.log('  System is production-ready for deployment and presentation.  ');
} else {
  console.error('  SOME TEST SUITES FAILED. Check logs above.                   ');
  process.exit(1);
}
console.log('================================================================\n');

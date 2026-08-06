const { spawnSync } = require('node:child_process');
const path = require('node:path');

const tests = [
  'tests/practice.test.ts',
  'tests/assessment.test.ts',
  'tests/migrations.test.ts',
  'tests/expoGoCompatibility.test.ts',
  'tests/training.test.ts',
  'tests/drills.test.ts',
].map((file) => path.join(process.cwd(), file));

const result = spawnSync(
  process.execPath,
  ['--test', '--require', path.join(process.cwd(), 'scripts/ts-register.cjs'), ...tests],
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);

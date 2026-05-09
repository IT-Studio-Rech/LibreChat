#!/usr/bin/env node
'use strict';

const { spawnSync, spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TFW_SERVICES_DIR = path.join(ROOT, 'tfw-services');

function ok(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`\n\x1b[31m✗ ERROR:\x1b[0m ${msg}`);
}

function ensureMongoRunning() {
  console.log('\n\x1b[36m[pre]\x1b[0m \x1b[1mEnsuring tfw-mongo is running...\x1b[0m');

  const runningCheck = spawnSync('docker', ['ps', '-q', '--filter', 'name=tfw-mongo'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (runningCheck.stdout && runningCheck.stdout.trim()) {
    ok('tfw-mongo already running');
    return;
  }

  const existsCheck = spawnSync('docker', ['ps', '-aq', '--filter', 'name=tfw-mongo'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (existsCheck.stdout && existsCheck.stdout.trim()) {
    ok('Starting existing tfw-mongo container...');
    const start = spawnSync('docker', ['start', 'tfw-mongo'], { stdio: 'inherit' });
    if (start.status !== 0) {
      fail('Could not start tfw-mongo.\n  Run: docker start tfw-mongo\n  Or: npm run dev:setup');
      process.exit(1);
    }
    ok('tfw-mongo started');
  } else {
    fail(
      'tfw-mongo container not found.\n' +
        '  Run: npm run dev:setup\n' +
        '  This will create and configure the MongoDB container.',
    );
    process.exit(1);
  }
}

function startAll() {
  console.log('\n\x1b[1m\x1b[35m=== TFW Dev Start ===\x1b[0m');
  console.log('  Starting: services | backend | frontend');
  console.log('  Press Ctrl-C to stop all processes.\n');

  // Use npx concurrently — installed on demand if needed (it's in root package.json after setup)
  const args = [
    '--kill-others-on-fail',
    '--prefix-colors', 'cyan,green,magenta',
    '--names', 'services,backend,frontend',
    '--prefix', '[{name}]',
    // tfw-services dev
    `cd "${TFW_SERVICES_DIR}" && npm run dev`,
    // LibreChat backend dev
    'npm run backend:dev',
    // LibreChat frontend dev
    'npm run frontend:dev',
  ];

  const proc = spawn('npx', ['concurrently', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  const forward = (sig) => proc.kill(sig);
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  proc.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

ensureMongoRunning();
startAll();

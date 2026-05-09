#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const TFW_SERVICES_DIR = path.join(ROOT, 'tfw-services');
const TFW_ENV_PATH = path.join(TFW_SERVICES_DIR, '.env');
const TFW_ENV_EXAMPLE_PATH = path.join(TFW_SERVICES_DIR, '.env.example');
const LIBRECHAT_YAML_PATH = path.join(ROOT, 'librechat.yaml');
const LIBRECHAT_DEV_YAML_PATH = path.join(ROOT, 'librechat.dev.yaml');
const GITIGNORE_PATH = path.join(ROOT, '.gitignore');

const PLACEHOLDER_PATTERN = /^(<[^>]+>|PLACEHOLDER|placeholder|changeme|change-me|change_me|TODO|todo|your[_-]?key|your[_-]?secret|dev-secret[^"']*|sk-ant-PLACEHOLDER|sk-PLACEHOLDER)$/i;

function step(n, total, msg) {
  console.log(`\n\x1b[36m[${n}/${total}]\x1b[0m \x1b[1m${msg}\x1b[0m`);
}

function promptYesNo(question, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  process.stdout.write(`\n  \x1b[33m?\x1b[0m ${question} ${hint} `);
  try {
    const buf = Buffer.alloc(64);
    const bytes = fs.readSync(0, buf, 0, 64);
    const answer = buf.toString('utf8', 0, bytes).trim().toLowerCase();
    if (!answer) return defaultYes;
    return answer === 'y' || answer === 'yes' || answer === 'j' || answer === 'ja';
  } catch {
    return defaultYes;
  }
}

function ok(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`\n\x1b[31m✗ ERROR:\x1b[0m ${msg}`);
}

// --- env parsing / writing (keeps comments and ordering) ---

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return { lines: [], values: {} };
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const values = {};
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return { lines, values };
}

function writeEnvValue(filePath, key, value) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = content.split('\n');
  const idx = lines.findIndex((l) => l.match(new RegExp(`^${key}=`)));
  if (idx >= 0) {
    lines[idx] = `${key}=${value}`;
  } else {
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function isPlaceholder(val) {
  if (!val || val.trim() === '') return true;
  return PLACEHOLDER_PATTERN.test(val.trim());
}

function hexSecret(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

// --- Step 1: Pre-flight ---

function checkPrerequisites() {
  step(1, 8, 'Checking prerequisites...');

  const nodeVer = process.versions.node.split('.').map(Number);
  const major = nodeVer[0];
  const minor = nodeVer[1];
  const patch = nodeVer[2];
  const isValidNode =
    (major === 20 && (minor > 19 || (minor === 19 && patch >= 0))) ||
    (major === 22 && minor >= 12) ||
    major >= 23;

  if (!isValidNode) {
    fail(
      `Node.js v${process.version} is not supported.\n` +
        '  Required: v20.19.0+, v22.12.0+, or >=v23.0.0\n' +
        '  Install via: https://nodejs.org/ or use nvm/fnm',
    );
    process.exit(1);
  }
  ok(`Node.js ${process.version}`);

  const docker = spawnSync('docker', ['info'], { stdio: 'pipe' });
  if (docker.status !== 0) {
    fail(
      'Docker is not running or not installed.\n' +
        '  Install: https://docs.docker.com/get-docker/\n' +
        '  Then start Docker Desktop and re-run this command.',
    );
    process.exit(1);
  }
  ok('Docker available');
}

// --- Step 2: Generate secrets ---

function generateSecrets() {
  step(2, 8, 'Generating secrets...');

  const SECRET_FIELDS = [
    { key: 'CREDS_KEY', bytes: 32 },
    { key: 'CREDS_IV', bytes: 16 },
    { key: 'JWT_SECRET', bytes: 32 },
    { key: 'JWT_REFRESH_SECRET', bytes: 32 },
    { key: 'MEILI_MASTER_KEY', bytes: 32 },
    { key: 'TFW_SERVICES_SHARED_SECRET', bytes: 32 },
  ];

  const { values } = parseEnv(ENV_PATH);
  let changed = 0;

  for (const { key, bytes } of SECRET_FIELDS) {
    const current = values[key] || '';
    if (isPlaceholder(current)) {
      const secret = hexSecret(bytes);
      writeEnvValue(ENV_PATH, key, secret);
      ok(`Generated ${key}`);
      changed++;
    } else {
      ok(`${key} already set — skipped`);
    }
  }

  if (changed === 0) ok('All secrets already configured');
}

// --- Step 3: tfw-services/.env ---

function setupTfwEnv() {
  step(3, 8, 'Setting up tfw-services/.env...');

  if (!fs.existsSync(TFW_SERVICES_DIR)) {
    warn('tfw-services directory not found — skipping');
    return;
  }

  if (fs.existsSync(TFW_ENV_PATH)) {
    ok('tfw-services/.env already exists — skipping creation');
  } else {
    if (!fs.existsSync(TFW_ENV_EXAMPLE_PATH)) {
      fail(
        'tfw-services/.env.example not found.\n' +
          '  Create tfw-services/.env.example first, then re-run.',
      );
      process.exit(1);
    }
    let content = fs.readFileSync(TFW_ENV_EXAMPLE_PATH, 'utf8');
    fs.writeFileSync(TFW_ENV_PATH, content, 'utf8');
    ok('Created tfw-services/.env from .env.example');
  }

  // Sync TFW_SERVICES_SHARED_SECRET from root .env
  const { values: rootVals } = parseEnv(ENV_PATH);
  const sharedSecret = rootVals['TFW_SERVICES_SHARED_SECRET'] || '';
  if (!isPlaceholder(sharedSecret)) {
    writeEnvValue(TFW_ENV_PATH, 'TFW_SERVICES_SHARED_SECRET', sharedSecret);
    ok('Synced TFW_SERVICES_SHARED_SECRET to tfw-services/.env');
  } else {
    warn('TFW_SERVICES_SHARED_SECRET not set in root .env — cannot sync');
  }

  // Set MONGO_URI for local dev
  const { values: tfwVals } = parseEnv(TFW_ENV_PATH);
  const tfwMongoUri = tfwVals['MONGO_URI'] || '';
  if (isPlaceholder(tfwMongoUri) || tfwMongoUri === '') {
    writeEnvValue(TFW_ENV_PATH, 'MONGO_URI', 'mongodb://127.0.0.1:27017/tfw-services');
    ok('Set MONGO_URI in tfw-services/.env');
  } else {
    ok('MONGO_URI in tfw-services/.env already set — skipped');
  }
}

// --- Step 4: MongoDB Docker container ---

function ensureMongoContainer() {
  step(4, 8, 'Setting up MongoDB Docker container (tfw-mongo)...');

  const runningCheck = spawnSync('docker', ['ps', '-q', '--filter', 'name=tfw-mongo'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (runningCheck.stdout && runningCheck.stdout.trim()) {
    ok('tfw-mongo container already running');
    return;
  }

  const existsCheck = spawnSync(
    'docker',
    ['ps', '-aq', '--filter', 'name=tfw-mongo'],
    { stdio: 'pipe', encoding: 'utf8' },
  );

  if (existsCheck.stdout && existsCheck.stdout.trim()) {
    ok('tfw-mongo container exists but is stopped — starting...');
    const start = spawnSync('docker', ['start', 'tfw-mongo'], { stdio: 'inherit' });
    if (start.status !== 0) {
      fail('Failed to start tfw-mongo container.\n  Run: docker start tfw-mongo');
      process.exit(1);
    }
    ok('tfw-mongo started');
  } else {
    ok('Creating tfw-mongo container...');
    const run = spawnSync(
      'docker',
      [
        'run', '-d',
        '--name', 'tfw-mongo',
        '-p', '27017:27017',
        '-v', 'tfw-mongo-data:/data/db',
        'mongo:7',
      ],
      { stdio: 'inherit' },
    );
    if (run.status !== 0) {
      fail(
        'Failed to create tfw-mongo container.\n' +
          '  Try manually: docker run -d --name tfw-mongo -p 27017:27017 -v tfw-mongo-data:/data/db mongo:7',
      );
      process.exit(1);
    }
    ok('tfw-mongo container created and started');
  }
}

// --- Step 5: Install dependencies ---

function installDependencies() {
  step(5, 8, 'Installing dependencies & building LibreChat packages...');

  ok('Running smart-reinstall (install + turbo build, cached)...');
  const runReinstall = (force) =>
    spawnSync('npm', force ? ['run', 'smart-reinstall', '--', '--force'] : ['run', 'smart-reinstall'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

  let rootInstall = runReinstall(false);
  if (rootInstall.status !== 0) {
    warn('smart-reinstall failed — usually means a stale node_modules from a previous run.');
    const retry = promptYesNo('Retry with --force (clean rebuild from scratch)?', true);
    if (!retry) {
      fail(
        'Aborted by user.\n' +
          '  When ready, run manually:\n' +
          '  npm run smart-reinstall -- --force',
      );
      process.exit(1);
    }
    ok('Retrying with --force...');
    rootInstall = runReinstall(true);
  }

  if (rootInstall.status !== 0) {
    if (suggestNpmCacheChownIfNeeded()) process.exit(1);
    fail(
      'smart-reinstall --force also failed.\n' +
        '  Manually clean and retry:\n' +
        '  rm -rf node_modules packages/data-provider/node_modules packages/data-schemas/node_modules packages/client/node_modules packages/api/node_modules client/node_modules api/node_modules\n' +
        '  npm run dev:setup',
    );
    process.exit(1);
  }
  ok('Root dependencies installed and packages built');
}

function suggestNpmCacheChownIfNeeded() {
  const npmCacheDir = path.join(process.env.HOME || '', '.npm', '_cacache');
  if (!fs.existsSync(npmCacheDir)) return false;
  try {
    const stat = fs.statSync(npmCacheDir);
    if (typeof stat.uid === 'number' && typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
      const realUid = process.getuid();
      const realGid = typeof process.getgid === 'function' ? process.getgid() : 20;
      fail(
        'npm cache contains root-owned files from a past "sudo npm" run.\n' +
          '  Fix once with:\n' +
          `  sudo chown -R ${realUid}:${realGid} "${path.dirname(npmCacheDir)}"\n` +
          '  Then re-run: npm run dev:setup',
      );
      return true;
    }
  } catch {
    /* ignore stat errors */
  }
  return false;

  if (fs.existsSync(TFW_SERVICES_DIR)) {
    ok('Installing tfw-services dependencies...');
    const tfwInstall = spawnSync('npm', ['install'], {
      cwd: TFW_SERVICES_DIR,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (tfwInstall.status !== 0) {
      fail('npm install failed in tfw-services.\n  Check the error above and retry.');
      process.exit(1);
    }
    ok('tfw-services dependencies installed');
  } else {
    warn('tfw-services not found — skipping');
  }
}

// --- Step 6: Build tfw-services ---

function buildTfwServices() {
  step(6, 8, 'Building tfw-services...');

  if (!fs.existsSync(TFW_SERVICES_DIR)) {
    warn('tfw-services not found — skipping build');
    return;
  }

  const build = spawnSync('npm', ['run', 'build'], {
    cwd: TFW_SERVICES_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (build.status !== 0) {
    fail('tfw-services build failed.\n  Run: cd tfw-services && npm run build');
    process.exit(1);
  }
  ok('tfw-services compiled');

  const buildOpenApi = spawnSync('npm', ['run', 'build:openapi'], {
    cwd: TFW_SERVICES_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (buildOpenApi.status !== 0) {
    fail(
      'tfw-services build:openapi failed.\n  Run: cd tfw-services && npm run build:openapi',
    );
    process.exit(1);
  }
  ok('tfw-services OpenAPI spec generated');
}

// --- Step 7: librechat.dev.yaml for local dev without Anthropic key ---

function setupDevYaml() {
  step(7, 8, 'Configuring librechat.dev.yaml...');

  const { values } = parseEnv(ENV_PATH);
  const anthropicKey = values['ANTHROPIC_API_KEY'] || '';
  const openaiKey = values['OPENAI_API_KEY'] || '';

  if (!isPlaceholder(anthropicKey)) {
    ok('ANTHROPIC_API_KEY is set — no dev yaml override needed');
    return;
  }

  if (isPlaceholder(openaiKey) || openaiKey.trim() === '') {
    warn('Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set — skipping dev yaml');
    warn('Set at least one API key in .env, then re-run dev:setup');
    return;
  }

  // Build a dev yaml that overrides default spec to gpt-4o
  if (!fs.existsSync(LIBRECHAT_DEV_YAML_PATH)) {
    const base = fs.readFileSync(LIBRECHAT_YAML_PATH, 'utf8');

    // Replace the default: true spec with a gpt-4o based one
    const devYaml = base
      .replace(
        /- name: taras-ki-assistentin[\s\S]*?model: claude-sonnet-4-6/m,
        [
          '- name: taras-ki-assistentin',
          '      label: "Taras KI-Assistentin"',
          '      description: "Deine persoenliche KI-Assistentin — auf die weibliche Art."',
          '      default: true',
          '      preset:',
          '        endpoint: openAI',
          '        model: gpt-4o',
        ].join('\n      '),
      )
      .replace(
        /actions:\n  allowedDomains:\n(.*)/m,
        'actions:\n  allowedDomains:\n$1\n    - \'localhost\'',
      );

    const header = '# AUTO-GENERATED by dev:setup — DO NOT COMMIT\n# Local dev override: uses OpenAI instead of Anthropic\n';
    fs.writeFileSync(LIBRECHAT_DEV_YAML_PATH, header + devYaml, 'utf8');
    ok('Created librechat.dev.yaml');
  } else {
    ok('librechat.dev.yaml already exists — skipped');
  }

  // Add localhost to allowedDomains in dev yaml (already done above, but ensure idempotent)
  // Set CONFIG_PATH in root .env
  const configPath = values['CONFIG_PATH'] || '';
  if (!configPath || configPath.trim() === '') {
    writeEnvValue(ENV_PATH, 'CONFIG_PATH', './librechat.dev.yaml');
    ok('Set CONFIG_PATH=./librechat.dev.yaml in .env');
  } else {
    ok(`CONFIG_PATH already set to: ${configPath}`);
  }

  // Ensure librechat.dev.yaml is in .gitignore
  if (fs.existsSync(GITIGNORE_PATH)) {
    const gitignore = fs.readFileSync(GITIGNORE_PATH, 'utf8');
    if (!gitignore.includes('librechat.dev.yaml')) {
      fs.appendFileSync(GITIGNORE_PATH, '\n# Local dev config override (auto-generated)\nlibrechat.dev.yaml\n');
      ok('Added librechat.dev.yaml to .gitignore');
    } else {
      ok('librechat.dev.yaml already in .gitignore');
    }
  }
}

// --- Step 8: Final status ---

function printFinalStatus() {
  step(8, 8, 'Setup complete!');

  const { values } = parseEnv(ENV_PATH);
  const openaiKey = values['OPENAI_API_KEY'] || '';
  const anthropicKey = values['ANTHROPIC_API_KEY'] || '';

  console.log('');

  if (isPlaceholder(openaiKey) && isPlaceholder(anthropicKey)) {
    console.log('\x1b[33m┌─────────────────────────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[33m│  ACTION REQUIRED: Set an API key in .env                │\x1b[0m');
    console.log('\x1b[33m│                                                         │\x1b[0m');
    console.log('\x1b[33m│  OPENAI_API_KEY=sk-...   (recommended for local dev)    │\x1b[0m');
    console.log('\x1b[33m│  — or —                                                 │\x1b[0m');
    console.log('\x1b[33m│  ANTHROPIC_API_KEY=sk-ant-...                           │\x1b[0m');
    console.log('\x1b[33m│                                                         │\x1b[0m');
    console.log('\x1b[33m│  Then run:  npm run dev:setup  (re-run)                 │\x1b[0m');
    console.log('\x1b[33m│  Then run:  npm run dev:start                           │\x1b[0m');
    console.log('\x1b[33m└─────────────────────────────────────────────────────────┘\x1b[0m');
  } else {
    console.log('\x1b[32m┌─────────────────────────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[32m│  Setup complete!                                        │\x1b[0m');
    console.log('\x1b[32m│                                                         │\x1b[0m');
    console.log('\x1b[32m│  Run:  npm run dev:start                                │\x1b[0m');
    console.log('\x1b[32m│                                                         │\x1b[0m');
    console.log('\x1b[32m│  After first start, run:                                │\x1b[0m');
    console.log('\x1b[32m│    npm run dev:promote-admin  (make yourself admin)     │\x1b[0m');
    console.log('\x1b[32m│    npm run seed:agents        (seed TFW agents)         │\x1b[0m');
    console.log('\x1b[32m└─────────────────────────────────────────────────────────┘\x1b[0m');
  }
  console.log('');
}

// --- Main ---

async function main() {
  console.log('\n\x1b[1m\x1b[35m=== TFW Dev Setup ===\x1b[0m');
  checkPrerequisites();
  generateSecrets();
  setupTfwEnv();
  ensureMongoContainer();
  installDependencies();
  buildTfwServices();
  setupDevYaml();
  printFinalStatus();
  process.exit(0);
}

main().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});

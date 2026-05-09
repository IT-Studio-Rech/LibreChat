#!/usr/bin/env node
'use strict';

const path = require('path');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });

const connect = require('./connect');
const { User } = require('~/db/models');

async function promoteAdmin() {
  await connect();

  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('\n\x1b[33m!\x1b[0m No users found in the database.');
    console.log('  Register a user first at \x1b[36mhttp://localhost:3090\x1b[0m');
    console.log('  Then re-run: \x1b[1mnpm run dev:promote-admin\x1b[0m\n');
    process.exit(0);
  }

  const earliest = await User.findOne().sort({ createdAt: 1 }).lean();
  if (!earliest) {
    console.error('Could not retrieve first user.');
    process.exit(1);
  }

  if (earliest.role === 'ADMIN') {
    console.log(`\n\x1b[32m✓\x1b[0m User \x1b[1m${earliest.email}\x1b[0m is already ADMIN — nothing to do.\n`);
    process.exit(0);
  }

  await User.updateOne({ _id: earliest._id }, { $set: { role: 'ADMIN' } });

  console.log(`\n\x1b[32m✓\x1b[0m Promoted \x1b[1m${earliest.email}\x1b[0m to ADMIN.`);
  console.log('  You may need to log out and back in for role changes to take effect.\n');
  process.exit(0);
}

promoteAdmin().catch((err) => {
  console.error('\x1b[31mError:\x1b[0m', err.message);
  process.exit(1);
});

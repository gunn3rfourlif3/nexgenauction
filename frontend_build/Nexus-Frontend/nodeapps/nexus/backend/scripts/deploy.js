// Deployment orchestrator: runs DB migrations and seeds initial data
// Usage: node backend/scripts/deploy.js [--count N]
// Env: MONGODB_URI (recommended), FORCE_DB_CONNECTION=true for production
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function runNodeScript(scriptRelPath, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(rootDir, scriptRelPath);
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptRelPath)} exited with code ${code}`));
    });
  });
}

async function main() {
  const countFlagIndex = process.argv.findIndex(a => a === '--count');
  const countArg = (countFlagIndex !== -1 && process.argv[countFlagIndex + 1]) ? process.argv[countFlagIndex + 1] : undefined;

  if (!process.env.MONGODB_URI) {
    console.warn('Warning: MONGODB_URI is not set. Using default local URI if scripts support it.');
  }

  console.log('Starting deployment: running migrations...');
  await runNodeScript(path.join('scripts', 'migrateScheduledToUpcoming.js'));

  console.log('Running category seeder...');
  await runNodeScript(path.join('scripts', 'seedUpcomingCategory.js'));

  console.log('Running upcoming auctions seeder...');
  const args = [];
  if (countArg) {
    args.push('--count', countArg);
  }
  await runNodeScript(path.join('scripts', 'seedUpcomingAuctions.js'), args);

  console.log('Deployment tasks completed successfully.');
}

main().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
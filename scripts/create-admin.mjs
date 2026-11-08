import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import nextEnv from '@next/env';
import {
  authSetupRequired,
  createBootstrapAdmin,
  initNeonDatabase,
  isNeonConfigured,
} from '../src/lib/db.ts';
import { hashPassword } from '../src/lib/auth-crypto.ts';
import { isValidLoginIdentifier, isValidPassword, normalizeLoginIdentifier } from '../src/lib/auth.ts';

async function ask(question) {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return (await prompt.question(question)).trim();
  } finally {
    prompt.close();
  }
}

function readHidden(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal so the password can be hidden.');
  }

  stdout.write(question);
  stdin.setEncoding('utf8');
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\r\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') return finish(new Error('Cancelled.'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u0008' || character === '\u007f') {
          const characters = Array.from(value);
          if (characters.length) {
            characters.pop();
            value = characters.join('');
            stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ') {
          value += character;
          stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  if (!isNeonConfigured()) {
    throw new Error('Set DATABASE_URL in the untracked .env.local file before running this command.');
  }

  const initialized = await initNeonDatabase();
  if (!initialized.success) {
    throw new Error('Could not initialize the database. Check DATABASE_URL and database permissions.');
  }
  if (!(await authSetupRequired())) {
    throw new Error('An account already exists. First-admin setup is permanently closed.');
  }

  const enteredIdentifier = await ask('Administrator username or email [admin]: ');
  const email = normalizeLoginIdentifier(enteredIdentifier || 'admin');
  if (!isValidLoginIdentifier(email)) throw new Error('Enter a valid username or email address.');

  const password = await readHidden('New password (12–128 characters): ');
  if (!isValidPassword(password)) throw new Error('Password must be 12 to 128 characters.');
  const confirmation = await readHidden('Confirm password: ');
  if (password !== confirmation) throw new Error('Passwords do not match.');

  const passwordHash = await hashPassword(password);
  const user = await createBootstrapAdmin(email, passwordHash);
  if (!user) throw new Error('First-admin setup has already been completed.');

  stdout.write(`Administrator account created for ${user.email}. Sign in at /login.\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Could not create the administrator account.');
  process.exitCode = 1;
});

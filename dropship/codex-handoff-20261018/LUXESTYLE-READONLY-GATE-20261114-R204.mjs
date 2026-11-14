#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_SHOP = 'au3j0y-hq.myshopify.com';
const PINNED = {
  'automation/diagnose_actions_zugang.mjs': '86fe9eac9d08b1664503ca93d887fb427ed5f0505eb13ef855c3b363b9eba506',
  'automation/lib/shopify_secret.mjs': '2d9da92ebe5b50a489a516baf089289f204fd8411a53e1f52af3b44c59e1273c',
};

export function assertLuxeStyleShop(raw) {
  if (typeof raw !== 'string' || raw.trim().toLowerCase() !== EXPECTED_SHOP) {
    throw new Error('Shop configuration rejected.');
  }
  return EXPECTED_SHOP;
}

export function createReadPlan(env) {
  const shop = assertLuxeStyleShop(env.SHOPIFY_SHOP);
  return Object.freeze({ shop, configurationMatches: true, runtimeIdentityVerified: false, networkStarted: false, mode: 'preflight-only' });
}

export async function verifyPinnedSources(root) {
  const verified = {};
  for (const [relative, expected] of Object.entries(PINNED)) {
    const bytes = await readFile(path.join(root, relative));
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== expected) throw new Error('Pinned diagnosis source validation failed.');
    verified[relative] = actual;
  }
  return verified;
}

export async function runPreflight(env, root) {
  const plan = createReadPlan(env); // Host gate must precede all source-file access.
  const sourceSha256 = await verifyPinnedSources(root);
  return Object.freeze({ ...plan, sourceSha256 });
}

async function main(argv, env) {
  let root = path.resolve(here, '../..');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo-root' && argv[i + 1] && !argv[i + 1].startsWith('--')) root = path.resolve(argv[++i]);
    else {
      console.error('Unsupported argument. This tool supports preflight only.');
      process.exitCode = 2;
      return;
    }
  }
  try {
    console.log(JSON.stringify(await runPreflight(env, root)));
  } catch (error) {
    if (error.message === 'Shop configuration rejected.') {
      console.error('Shop configuration rejected.');
      process.exitCode = 3;
    } else {
      console.error('Pinned diagnosis source validation failed.');
      process.exitCode = 4;
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), process.env).catch(() => { console.error('Preflight failed.'); process.exitCode = 5; });
}

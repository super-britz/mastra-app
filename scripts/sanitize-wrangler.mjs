import { readFile, writeFile } from 'node:fs/promises';

const wranglerPath = new URL('../wrangler.jsonc', import.meta.url);
const banner =
  '/* This file was auto-generated through Mastra. Edit the CloudflareDeployer() instance directly. */';

const source = await readFile(wranglerPath, 'utf8');
const sanitizedSource = source.replace(/\/\*[\s\S]*?\*\//, '').trim();
const config = JSON.parse(sanitizedSource);

delete config.vars;

config.alias = {
  ...(config.alias || {}),
  typescript: './.mastra/output/typescript-stub.mjs',
  execa: './.mastra/output/execa-stub.mjs',
};

const output = `${banner}\n${JSON.stringify(config, null, 2)}\n`;

await writeFile(wranglerPath, output);

import { readFile, writeFile } from 'node:fs/promises';
import { validateSiteUrl, validateFormEndpoint } from './config.mjs';

const configFile = new URL('../site.config.json', import.meta.url);
const config = JSON.parse(await readFile(configFile, 'utf8'));
const args = process.argv.slice(2);
if (!args.length) {
  console.log('Usage: npm run configure -- --url https://your-site.example [--form https://your-form-endpoint]\nUse --form "" to restore the email-draft fallback. Public settings only; never add secrets.');
  process.exit(0);
}
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (!['--url', '--form'].includes(flag) || value === undefined) throw new Error('Expected --url or --form followed by a value.');
  if (flag === '--url') config.siteUrl = validateSiteUrl(value);
  if (flag === '--form') config.formEndpoint = validateFormEndpoint(value);
}
await writeFile(configFile, JSON.stringify(config, null, 2) + '\n');
console.log('Updated public site settings. Run npm run build to regenerate deployment files.');

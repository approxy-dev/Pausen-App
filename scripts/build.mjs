import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root, getConfig, renderDocument, renderDiscoveryFile, discoveryFiles, publicPages, publicFiles, publicDirectories } from './config.mjs';

const config = await getConfig();
const output = join(root, 'dist');
await mkdir(output, { recursive: true });
for (const page of publicPages) {
  await writeFile(join(output, page), renderDocument(await readFile(join(root, page), 'utf8'), page, config));
}
for (const file of discoveryFiles) {
  const source = await readFile(join(root, file), 'utf8');
  await writeFile(join(output, file), renderDiscoveryFile(source, file, config));
}
for (const file of publicFiles) {
  await copyFile(join(root, file), join(output, file));
}
for (const directory of publicDirectories) {
  await cp(join(root, directory), join(output, directory), { recursive: true });
}
console.log(`Built static site in ${output}`);
console.log(config.siteUrl ? `Public URLs: ${config.siteUrl}` : 'No public URL yet. Local output is noindex; Vercel supplies its deployment domain automatically.');
console.log(config.feedbackEnabled ? 'Contact delivery: private feedback endpoint.' : config.formEndpoint ? 'Contact delivery: configured form provider.' : 'Contact delivery: email draft (no message is automatically sent).');

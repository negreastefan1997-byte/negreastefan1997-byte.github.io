import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pages = ['index.html', 'privacy.html'];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const combined = pages.map(read).join('\n');

for (const page of pages) {
  const html = read(page);
  for (const token of ['<!doctype html>', '<html lang="en">', '<meta name="viewport"', '<main', '</main>', '<footer', '</html>']) {
    if (!html.includes(token)) throw new Error(`${page}: missing required document structure: ${token}`);
  }

  if (/<(?:script|form|iframe)\b/i.test(html)) throw new Error(`${page}: active collection or embedded content is not allowed.`);

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith('https://developers.google.com/terms/api-services-user-data-policy')) continue;
    if (/^https?:/i.test(href)) throw new Error(`${page}: unapproved external destination: ${href}`);
    const target = href.split('#')[0];
    if (target && !fs.existsSync(path.join(root, target))) throw new Error(`${page}: missing local link target: ${target}`);
  }
}

const forbidden = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b(?:client_secret|refresh_token|access_token|spreadsheetId|scriptId)\b/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
for (const pattern of forbidden) {
  if (pattern.test(combined)) throw new Error(`Public pages contain forbidden private material matching ${pattern}.`);
}

const privacy = read('privacy.html');
for (const statement of [
  'two separate Google authorization profiles',
  '<strong>Read-only authorization</strong>',
  '<strong>Privileged development authorization</strong>',
  'without requesting spreadsheet cell contents',
  'Other explicitly initiated engineering workflows may read spreadsheet data or Apps Script source',
  'There is no publisher-operated server copy',
]) {
  if (!privacy.includes(statement)) throw new Error(`Privacy policy lost a required scope or custody disclosure: ${statement}`);
}

const css = read('styles.css');
if (/url\s*\(/i.test(css)) throw new Error('The public stylesheet must not load external assets.');

console.log('Public site verification passed.');

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '..', '..', 'users.json');
const apiUrl = process.env.BUBBLE_USERS_URL ?? 'https://archv2.bubbleapps.io/api/1.1/obj/User';
const token = process.env.BUBBLE_API_TOKEN;
const pageSize = Number(process.env.BUBBLE_PAGE_SIZE ?? 100);

async function fetchPage(cursor) {
  const url = new URL(apiUrl);
  url.searchParams.set('cursor', String(cursor));
  url.searchParams.set('limit', String(pageSize));

  const headers = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Bubble request failed (${response.status} ${response.statusText}): ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  const users = [];
  let cursor = 0;

  while (true) {
    const json = await fetchPage(cursor);
    const payload = json.response ?? json;
    const results = payload.results ?? [];

    users.push(...results);

    const remaining = Number(payload.remaining ?? 0);
    if (!remaining) break;

    cursor += results.length || pageSize;
  }

  await writeFile(outputPath, JSON.stringify(users, null, 2), 'utf8');
  console.log(`Wrote ${users.length} users to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

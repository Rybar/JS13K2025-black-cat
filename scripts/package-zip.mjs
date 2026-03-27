import { readFile, writeFile } from 'node:fs/promises';
import { zipSync, strToU8 } from 'fflate';

const inputHtmlPath = new URL('../dist/index.roadrolled.html', import.meta.url);
const outputZipPath = new URL('../dist/gamejam.zip', import.meta.url);

async function main() {
  const packedHtml = await readFile(inputHtmlPath, 'utf8');
  const zipped = zipSync({
    'index.html': strToU8(packedHtml),
  }, {
    level: 9,
  });

  await writeFile(outputZipPath, Buffer.from(zipped));
  console.log(`Wrote dist/gamejam.zip (${zipped.length} bytes)`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
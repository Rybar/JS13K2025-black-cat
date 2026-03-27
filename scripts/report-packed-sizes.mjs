import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { strToU8, zipSync } from 'fflate';

const files = [
  { label: 'Raw JS', path: new URL('../dist/game.js', import.meta.url) },
  { label: 'Roadrolled JS', path: new URL('../dist/game.roadrolled.js', import.meta.url) },
  { label: 'Raw HTML', path: new URL('../dist/index.html', import.meta.url) },
  { label: 'Roadrolled HTML', path: new URL('../dist/index.roadrolled.html', import.meta.url) },
];

function zipSize(name, source) {
  return zipSync({ [name]: strToU8(source) }, { level: 9 }).length;
}

function formatRow(label, rawBytes, zippedBytes) {
  return `${label.padEnd(16)} raw ${String(rawBytes).padStart(6)} B  zip ${String(zippedBytes).padStart(6)} B`;
}

async function main() {
  const entries = await Promise.all(files.map(async (file) => {
    const source = await readFile(file.path, 'utf8');
    return {
      label: file.label,
      rawBytes: Buffer.byteLength(source),
      zippedBytes: zipSize(basename(file.path.pathname), source),
    };
  }));

  for (const entry of entries) {
    console.log(formatRow(entry.label, entry.rawBytes, entry.zippedBytes));
  }

  const rawHtml = entries.find((entry) => entry.label === 'Raw HTML');
  const packedHtml = entries.find((entry) => entry.label === 'Roadrolled HTML');
  if (rawHtml && packedHtml) {
    const delta = packedHtml.zippedBytes - rawHtml.zippedBytes;
    const direction = delta <= 0 ? 'smaller' : 'larger';
    console.log(`Roadrolled HTML zip is ${Math.abs(delta)} bytes ${direction} than raw HTML zip.`);
  }

  const distributableZipPath = new URL('../dist/gamejam.zip', import.meta.url);
  const distributableZip = await stat(distributableZipPath);
  console.log(`Final distributable zip  size ${String(distributableZip.size).padStart(6)} B  file dist/gamejam.zip`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
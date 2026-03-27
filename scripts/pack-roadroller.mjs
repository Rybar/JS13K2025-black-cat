import { readFile, writeFile } from 'node:fs/promises';
import { Packer } from 'roadroller';

const inputJsPath = new URL('../dist/game.js', import.meta.url);
const inputHtmlPath = new URL('../dist/index.html', import.meta.url);
const outputJsPath = new URL('../dist/game.roadrolled.js', import.meta.url);
const outputHtmlPath = new URL('../dist/index.roadrolled.html', import.meta.url);

function injectPackedScript(html, script) {
  const escapedScript = script.replaceAll('</script', String.raw`<\/script`);
  const nextHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/i, `<script>${escapedScript}</script>`);

  if (nextHtml === html) {
    throw new Error('Unable to locate a script tag in dist/index.html for Roadroller output.');
  }

  return nextHtml;
}

async function main() {
  const [sourceJs, sourceHtml] = await Promise.all([
    readFile(inputJsPath, 'utf8'),
    readFile(inputHtmlPath, 'utf8'),
  ]);

  const packer = new Packer([
    {
      data: sourceJs,
      type: 'js',
      action: 'eval',
    },
  ], {
    allowFreeVars: true,
    maxMemoryMB: 150,
  });

  await packer.optimize(1);
  const packed = packer.makeDecoder();
  const packedJs = `${packed.firstLine}\n${packed.secondLine}`;
  const packedHtml = injectPackedScript(sourceHtml, packedJs);

  await Promise.all([
    writeFile(outputJsPath, packedJs),
    writeFile(outputHtmlPath, packedHtml),
  ]);

  console.log(`Roadroller estimated JS size: ${packed.estimateLength()} bytes`);
  console.log('Wrote dist/game.roadrolled.js and dist/index.roadrolled.html');
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
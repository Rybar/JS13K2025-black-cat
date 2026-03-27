export function parseIndexedAtlas(paletteImage) {
  const imageWidth = paletteImage.width;
  const imageHeight = paletteImage.height;
  if (imageWidth < 2 || imageWidth > 256 || imageHeight < 2) {
    throw new Error('Palette atlas must be at least 2x2 and no wider than 256 pixels.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(paletteImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight).data;

  const paletteCount = imageWidth;
  const paletteRGBA = new Uint8Array(paletteCount * 4);
  const colorToIndex = new Map();

  for (let index = 0; index < paletteCount; index++) {
    const offset = index * 4;
    const r = imageData[offset];
    const g = imageData[offset + 1];
    const b = imageData[offset + 2];
    const a = imageData[offset + 3];
    paletteRGBA.set([r, g, b, a], offset);
    colorToIndex.set(`${r},${g},${b},${a}`, index);
  }

  const atlasWidth = imageWidth;
  const atlasHeight = imageHeight - 1;
  const atlasIndices = new Uint8Array(atlasWidth * atlasHeight);

  for (let y = 0; y < atlasHeight; y++) {
    const sourceY = y + 1;
    for (let x = 0; x < atlasWidth; x++) {
      const offset = (sourceY * imageWidth + x) * 4;
      const key = `${imageData[offset]},${imageData[offset + 1]},${imageData[offset + 2]},${imageData[offset + 3]}`;
      atlasIndices[y * atlasWidth + x] = colorToIndex.get(key) ?? 0;
    }
  }

  return { paletteRGBA, paletteCount, atlasIndices, atlasWidth, atlasHeight };
}
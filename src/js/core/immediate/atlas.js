function readImageData(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height).data;
}

function createColorKey(r, g, b, a) {
  return `${r},${g},${b},${a}`;
}

export function createPaletteIndex(paletteRGBA, paletteCount) {
  const colorToIndex = new Map();

  for (let index = 0; index < paletteCount; index++) {
    const offset = index * 4;
    colorToIndex.set(
      createColorKey(
        paletteRGBA[offset],
        paletteRGBA[offset + 1],
        paletteRGBA[offset + 2],
        paletteRGBA[offset + 3],
      ),
      index,
    );
  }

  return colorToIndex;
}

export function parsePaletteImage(paletteImage) {
  const imageWidth = paletteImage.width;
  const imageHeight = paletteImage.height;
  const paletteCount = imageWidth * imageHeight;
  if (imageWidth < 1 || imageHeight < 1 || paletteCount < 2 || paletteCount > 256) {
    throw new Error('Palette image must contain between 2 and 256 colors.');
  }

  const imageData = readImageData(paletteImage);
  const paletteRGBA = new Uint8Array(paletteCount * 4);

  for (let index = 0; index < paletteCount; index++) {
    const offset = index * 4;
    paletteRGBA.set([
      imageData[offset],
      imageData[offset + 1],
      imageData[offset + 2],
      imageData[offset + 3],
    ], offset);
  }

  return {
    paletteRGBA,
    paletteCount,
    colorToIndex: createPaletteIndex(paletteRGBA, paletteCount),
  };
}

export function parseIndexedImage(image, colorToIndex) {
  const imageWidth = image.width;
  const imageHeight = image.height;
  if (imageWidth < 1 || imageHeight < 1) {
    throw new Error('Indexed atlas image must be at least 1x1 pixels.');
  }

  const imageData = readImageData(image);
  const atlasIndices = new Uint8Array(imageWidth * imageHeight);

  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const offset = (y * imageWidth + x) * 4;
      const key = createColorKey(
        imageData[offset],
        imageData[offset + 1],
        imageData[offset + 2],
        imageData[offset + 3],
      );
      atlasIndices[y * imageWidth + x] = colorToIndex.get(key) ?? 0;
    }
  }

  return {
    atlasIndices,
    atlasWidth: imageWidth,
    atlasHeight: imageHeight,
  };
}
(function () {
  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('sprite-canvas');
  const context = canvas.getContext('2d');

  const nameInput = document.getElementById('sprite-name');
  const widthInput = document.getElementById('sprite-width');
  const heightInput = document.getElementById('sprite-height');
  const titleNode = document.getElementById('sprite-title');
  const pathNode = document.getElementById('sprite-path');
  const paletteNode = document.getElementById('palette');
  const selectedColorLabel = document.getElementById('selected-color-label');
  const fillButton = document.getElementById('fill-button');
  const clearButton = document.getElementById('clear-button');

  const paletteColors = [
    '#111111', '#f3efe0', '#d1495b', '#edae49',
    '#00798c', '#30638e', '#003d5b', '#8f2d56',
    '#6d597a', '#355070', '#588157', '#a7c957',
    '#bc4749', '#f28482', '#84a59d', '#f6bd60'
  ];

  let sprite = null;
  let selectedColor = 1;

  function cloneSprite(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function renderDocument(nextSprite, relativePath) {
    sprite = cloneSprite(nextSprite);
    titleNode.textContent = sprite.name;
    pathNode.textContent = relativePath;
    nameInput.value = sprite.name;
    widthInput.value = sprite.width;
    heightInput.value = sprite.height;
    renderPalette();
    renderCanvas();
  }

  function renderPalette() {
    paletteNode.textContent = '';
    const count = Math.max(2, Math.min(32, sprite.paletteSize || 16));

    for (let colorIndex = 0; colorIndex < count; colorIndex += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'palette-button';
      if (colorIndex === selectedColor) {
        button.classList.add('is-selected');
      }

      button.style.background = paletteColors[colorIndex % paletteColors.length];
      button.title = `Color ${colorIndex}`;
      button.addEventListener('click', () => {
        selectedColor = colorIndex;
        selectedColorLabel.textContent = `Color ${colorIndex}`;
        renderPalette();
      });

      paletteNode.appendChild(button);
    }

    selectedColorLabel.textContent = `Color ${selectedColor}`;
  }

  function renderCanvas() {
    const frame = sprite.frames[0];
    const pixelWidth = canvas.width / sprite.width;
    const pixelHeight = canvas.height / sprite.height;

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < sprite.height; y += 1) {
      for (let x = 0; x < sprite.width; x += 1) {
        const colorIndex = frame.pixels[y][x] || 0;
        context.fillStyle = paletteColors[colorIndex % paletteColors.length];
        context.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight);
      }
    }

    context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    context.lineWidth = 1;

    for (let x = 0; x <= sprite.width; x += 1) {
      context.beginPath();
      context.moveTo(Math.round(x * pixelWidth) + 0.5, 0);
      context.lineTo(Math.round(x * pixelWidth) + 0.5, canvas.height);
      context.stroke();
    }

    for (let y = 0; y <= sprite.height; y += 1) {
      context.beginPath();
      context.moveTo(0, Math.round(y * pixelHeight) + 0.5);
      context.lineTo(canvas.width, Math.round(y * pixelHeight) + 0.5);
      context.stroke();
    }
  }

  function postSpriteUpdate() {
    vscode.postMessage({
      type: 'updateSprite',
      sprite
    });
  }

  function resizeSprite(width, height) {
    const currentFrame = sprite.frames[0];
    const nextPixels = [];
    for (let y = 0; y < height; y += 1) {
      const row = [];
      for (let x = 0; x < width; x += 1) {
        row.push(currentFrame.pixels[y]?.[x] ?? 0);
      }
      nextPixels.push(row);
    }

    sprite.width = width;
    sprite.height = height;
    currentFrame.pixels = nextPixels;
    renderCanvas();
    postSpriteUpdate();
  }

  nameInput.addEventListener('change', () => {
    if (!sprite) {
      return;
    }

    sprite.name = nameInput.value.trim() || 'untitled-sprite';
    titleNode.textContent = sprite.name;
    postSpriteUpdate();
  });

  widthInput.addEventListener('change', () => {
    if (!sprite) {
      return;
    }
    const nextWidth = Math.max(1, Math.min(64, Number.parseInt(widthInput.value, 10) || sprite.width));
    widthInput.value = String(nextWidth);
    resizeSprite(nextWidth, sprite.height);
  });

  heightInput.addEventListener('change', () => {
    if (!sprite) {
      return;
    }
    const nextHeight = Math.max(1, Math.min(64, Number.parseInt(heightInput.value, 10) || sprite.height));
    heightInput.value = String(nextHeight);
    resizeSprite(sprite.width, nextHeight);
  });

  fillButton.addEventListener('click', () => {
    if (!sprite) {
      return;
    }

    sprite.frames[0].pixels = sprite.frames[0].pixels.map((row) => row.map(() => selectedColor));
    renderCanvas();
    postSpriteUpdate();
  });

  clearButton.addEventListener('click', () => {
    if (!sprite) {
      return;
    }

    sprite.frames[0].pixels = sprite.frames[0].pixels.map((row) => row.map(() => 0));
    renderCanvas();
    postSpriteUpdate();
  });

  canvas.addEventListener('click', (event) => {
    if (!sprite) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * sprite.width);
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * sprite.height);

    if (x < 0 || x >= sprite.width || y < 0 || y >= sprite.height) {
      return;
    }

    sprite.frames[0].pixels[y][x] = selectedColor;
    renderCanvas();
    postSpriteUpdate();
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.type !== 'document') {
      return;
    }

    renderDocument(message.sprite, message.path);
  });
})();
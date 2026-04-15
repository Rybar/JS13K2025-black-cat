export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function resizeCanvas(canvas, baseWidth, baseHeight, scale = 1) {
  const width = Math.max(1, Math.floor(baseWidth * scale));
  const height = Math.max(1, Math.floor(baseHeight * scale));

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

export function screenToCanvas(clientX, clientY, rect, baseWidth, baseHeight) {
  return {
    x: clamp(Math.floor((clientX - rect.left) * (baseWidth / rect.width)), 0, baseWidth - 1),
    y: clamp(Math.floor((clientY - rect.top) * (baseHeight / rect.height)), 0, baseHeight - 1),
  };
}





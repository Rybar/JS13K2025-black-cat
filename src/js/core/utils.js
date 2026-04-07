export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function resizeCanvas(canvas, baseWidth, baseHeight) {
  const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
  const appliedScale = scale >= 1 ? Math.floor(scale) : scale;
  const width = Math.max(1, Math.floor(baseWidth * appliedScale));
  const height = Math.max(1, Math.floor(baseHeight * appliedScale));

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

export function screenToCanvas(clientX, clientY, rect, baseWidth, baseHeight) {
  return {
    x: clamp(Math.floor((clientX - rect.left) * (baseWidth / rect.width)), 0, baseWidth - 1),
    y: clamp(Math.floor((clientY - rect.top) * (baseHeight / rect.height)), 0, baseHeight - 1),
  };
}





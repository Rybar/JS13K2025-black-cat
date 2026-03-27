export const SHAPE_VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;
attribute float aColorIndex;
attribute float aColorIndexB;
attribute float aDitherMix;

uniform vec2 uResolution;

varying float vColorIndex;
varying float vColorIndexB;
varying float vDitherMix;

void main() {
  vec2 clip = (aPosition / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vColorIndex = aColorIndex;
  vColorIndexB = aColorIndexB;
  vDitherMix = aDitherMix;
}
`;

export const SHAPE_FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform sampler2D uPaletteTexture;
uniform float uPaletteSize;

varying float vColorIndex;
varying float vColorIndexB;
varying float vDitherMix;

float bayer4(vec2 p) {
  vec2 cell = mod(floor(p), 4.0);
  float index = cell.x + cell.y * 4.0;

  if (index < 0.5) return 0.0 / 16.0;
  if (index < 1.5) return 8.0 / 16.0;
  if (index < 2.5) return 2.0 / 16.0;
  if (index < 3.5) return 10.0 / 16.0;
  if (index < 4.5) return 12.0 / 16.0;
  if (index < 5.5) return 4.0 / 16.0;
  if (index < 6.5) return 14.0 / 16.0;
  if (index < 7.5) return 6.0 / 16.0;
  if (index < 8.5) return 3.0 / 16.0;
  if (index < 9.5) return 11.0 / 16.0;
  if (index < 10.5) return 1.0 / 16.0;
  if (index < 11.5) return 9.0 / 16.0;
  if (index < 12.5) return 15.0 / 16.0;
  if (index < 13.5) return 7.0 / 16.0;
  if (index < 14.5) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

void main() {
  float mixAmount = clamp(vDitherMix, 0.0, 1.0);
  float threshold = bayer4(gl_FragCoord.xy);
  float useSecondary = step(threshold, mixAmount - 0.001);
  float finalIndex = mix(floor(vColorIndex + 0.5), floor(vColorIndexB + 0.5), useSecondary);
  float paletteX = (finalIndex + 0.5) / uPaletteSize;
  gl_FragColor = texture2D(uPaletteTexture, vec2(paletteX, 0.5));
}
`;

export const SPRITE_VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;
attribute vec2 aUv;
attribute vec4 aRemapSource;
attribute vec4 aRemapTarget;

uniform vec2 uResolution;

varying vec2 vUv;
varying vec4 vRemapSource;
varying vec4 vRemapTarget;

void main() {
  vec2 clip = (aPosition / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vUv = aUv;
  vRemapSource = aRemapSource;
  vRemapTarget = aRemapTarget;
}
`;

export const SPRITE_FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform sampler2D uAtlasTexture;
uniform sampler2D uPaletteTexture;
uniform float uPaletteSize;

varying vec2 vUv;
varying vec4 vRemapSource;
varying vec4 vRemapTarget;

void main() {
  float index = floor(texture2D(uAtlasTexture, vUv).r * 255.0 + 0.5);
  if (index < 0.5) {
    discard;
  }

  if (vRemapSource.x >= 0.0 && abs(index - vRemapSource.x) < 0.5) index = vRemapTarget.x;
  if (vRemapSource.y >= 0.0 && abs(index - vRemapSource.y) < 0.5) index = vRemapTarget.y;
  if (vRemapSource.z >= 0.0 && abs(index - vRemapSource.z) < 0.5) index = vRemapTarget.z;
  if (vRemapSource.w >= 0.0 && abs(index - vRemapSource.w) < 0.5) index = vRemapTarget.w;

  float paletteX = (index + 0.5) / uPaletteSize;
  gl_FragColor = texture2D(uPaletteTexture, vec2(paletteX, 0.5));
}
`;

export const ELLIPSE_VERTEX_SHADER_SOURCE = `
attribute vec2 aPosition;
attribute vec2 aLocalOffset;
attribute vec2 aRadius;
attribute float aRotation;
attribute float aColorIndex;
attribute float aColorIndexB;
attribute float aDitherMix;

uniform vec2 uResolution;

varying vec2 vLocalOffset;
varying vec2 vRadius;
varying float vRotation;
varying float vColorIndex;
varying float vColorIndexB;
varying float vDitherMix;

void main() {
  vec2 clip = (aPosition / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vLocalOffset = aLocalOffset;
  vRadius = aRadius;
  vRotation = aRotation;
  vColorIndex = aColorIndex;
  vColorIndexB = aColorIndexB;
  vDitherMix = aDitherMix;
}
`;

export const ELLIPSE_FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform sampler2D uPaletteTexture;
uniform float uPaletteSize;

varying vec2 vLocalOffset;
varying vec2 vRadius;
varying float vRotation;
varying float vColorIndex;
varying float vColorIndexB;
varying float vDitherMix;

float bayer4(vec2 p) {
  vec2 cell = mod(floor(p), 4.0);
  float index = cell.x + cell.y * 4.0;

  if (index < 0.5) return 0.0 / 16.0;
  if (index < 1.5) return 8.0 / 16.0;
  if (index < 2.5) return 2.0 / 16.0;
  if (index < 3.5) return 10.0 / 16.0;
  if (index < 4.5) return 12.0 / 16.0;
  if (index < 5.5) return 4.0 / 16.0;
  if (index < 6.5) return 14.0 / 16.0;
  if (index < 7.5) return 6.0 / 16.0;
  if (index < 8.5) return 3.0 / 16.0;
  if (index < 9.5) return 11.0 / 16.0;
  if (index < 10.5) return 1.0 / 16.0;
  if (index < 11.5) return 9.0 / 16.0;
  if (index < 12.5) return 15.0 / 16.0;
  if (index < 13.5) return 7.0 / 16.0;
  if (index < 14.5) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

void main() {
  vec2 safeRadius = max(vRadius, vec2(0.0001));
  float c = cos(vRotation);
  float s = sin(vRotation);
  vec2 local = vec2(
    vLocalOffset.x * c + vLocalOffset.y * s,
    -vLocalOffset.x * s + vLocalOffset.y * c
  );
  vec2 normalized = local / safeRadius;
  if (dot(normalized, normalized) > 1.0) {
    discard;
  }

  float mixAmount = clamp(vDitherMix, 0.0, 1.0);
  float threshold = bayer4(gl_FragCoord.xy);
  float useSecondary = step(threshold, mixAmount - 0.001);
  float finalIndex = mix(floor(vColorIndex + 0.5), floor(vColorIndexB + 0.5), useSecondary);
  float paletteX = (finalIndex + 0.5) / uPaletteSize;
  gl_FragColor = texture2D(uPaletteTexture, vec2(paletteX, 0.5));
}
`;
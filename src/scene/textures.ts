import * as THREE from 'three';

function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2d(xi, yi);
  const b = hash2d(xi + 1, yi);
  const c = hash2d(xi, yi + 1);
  const d = hash2d(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x: number, y: number, octaves = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

export interface TexturePair {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

export function createWoodTextures(
  baseHex: string,
  grainHex: string,
  maxAnisotropy: number,
  seedOffset = 0
): TexturePair {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const c1 = new THREE.Color(baseHex);
  const c2 = new THREE.Color(grainHex);

  const cImg = cCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 4 + seedOffset;
      const ny = (y / size) * 1.4 + seedOffset;
      const n = fbm(nx * 2.5, ny * 6.0, 4);
      const ring = Math.sin((ny * 14 + n * 5.2) * Math.PI) * 0.5 + 0.5;
      const fine = valueNoise(nx * 40, ny * 8) * 0.18;
      const t = THREE.MathUtils.clamp(ring * 0.72 + fine + n * 0.18, 0, 1);

      const r = Math.round(THREE.MathUtils.lerp(c1.r, c2.r, t) * 255);
      const g = Math.round(THREE.MathUtils.lerp(c1.g, c2.g, t) * 255);
      const b = Math.round(THREE.MathUtils.lerp(c1.b, c2.b, t) * 255);

      const idx = (y * size + x) * 4;
      cImg.data[idx] = r;
      cImg.data[idx + 1] = g;
      cImg.data[idx + 2] = b;
      cImg.data[idx + 3] = 255;

      const bumpVal = Math.round((1 - t * 0.65) * 255);
      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createMarbleTextures(
  baseHex: string,
  veinHex: string,
  maxAnisotropy: number,
  seedOffset = 0
): TexturePair {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const c1 = new THREE.Color(baseHex);
  const c2 = new THREE.Color(veinHex);

  const cImg = cCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 4 + seedOffset;
      const ny = (y / size) * 4 + seedOffset;
      const turbulence = fbm(nx * 1.8, ny * 1.8, 5);
      const veinRaw = Math.abs(Math.sin((nx + ny * 0.7 + turbulence * 3.1) * Math.PI));
      const vein = Math.pow(1 - veinRaw, 4.5);
      const cloud = fbm(nx * 3.5, ny * 3.5, 3) * 0.16;
      const t = THREE.MathUtils.clamp(vein * 0.85 + cloud, 0, 1);

      const r = Math.round(THREE.MathUtils.lerp(c1.r, c2.r, t) * 255);
      const g = Math.round(THREE.MathUtils.lerp(c1.g, c2.g, t) * 255);
      const b = Math.round(THREE.MathUtils.lerp(c1.b, c2.b, t) * 255);

      const idx = (y * size + x) * 4;
      cImg.data[idx] = r;
      cImg.data[idx + 1] = g;
      cImg.data[idx + 2] = b;
      cImg.data[idx + 3] = 255;

      const bumpVal = Math.round((225 - vein * 70) * 1);
      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createBoardCoordinateTexture(
  label: string,
  textColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = textColor;
  ctx.font = '600 58px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

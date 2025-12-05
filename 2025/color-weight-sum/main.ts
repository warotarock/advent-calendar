
import chroma from 'chroma-js';

// 色合成処理 /////////////////////////////////////////////

class Color {
  constructor(public r: number, public g: number, public b: number, public a = 1.0) {}
}

// ストレートアルファ合成
function blendColors_StraightAlpha(colors: Color[], weights: number[]): Color {
  let rSum = 0,
    gSum = 0,
    bSum = 0,
    aSum = 0;
  for (let i = 0; i < colors.length; i++) {
    const { r, g, b, a } = colors[i];
    const w = weights[i];
    const alpha = a * w
    rSum = rSum * (1 - alpha) + r * alpha;
    gSum = gSum * (1 - alpha) + g * alpha;
    bSum = bSum * (1 - alpha) + b * alpha;
    aSum = aSum * (1 - alpha) + a * alpha;
  }
  return new Color(rSum, gSum, bSum, aSum);
}

// 乗算済みアルファ合成
function blendColors_PreMultipliedAlpha(colors: Color[], weights: number[]): Color {
  let wSum = 0,
    rSum = 0,
    gSum = 0,
    bSum = 0,
    aSum = 0;
  for (let i = 0; i < colors.length; i++) {
    const { r, g, b, a } = colors[i];
    const w = weights[i];
    wSum += w;
    rSum += w * r * a;
    gSum += w * g * a;
    bSum += w * b * a;
    aSum += w * a;
  }
  if (wSum === 0) {
    return new Color(0, 0, 0, 0);
  }
  if (wSum < 1.0) {
    wSum = 1.0; // ウェイトが1未満の場合、残り分の透明色が存在するとみなして補正する
  }
  let A = aSum / wSum;
  if (A === 0) {
    return new Color(0, 0, 0, 0);
  }
  return new Color(rSum / (wSum * A), gSum / (wSum * A), bSum / (wSum * A), A);
}

// OKLCh色空間での色合成
function blendColors_OKLCh(colors: Color[], weights: number[]): Color {
  let wSum = 0,
    lSum = 0,
    cSum = 0,
    aSum = 0;
  const hVec = { x: 0, y: 0 };
  for (let i = 0; i < colors.length; i++) {
    const { r, g, b, a } = colors[i];
    const w = weights[i];
    const [ l, c, h ] = chroma.rgb(r * 255, g * 255, b * 255).oklch();
    wSum += w;
    lSum += w * l * a;
    cSum += w * c * a;
    aSum += w * a;
    if (!isNaN(h)) {
      hVec.x += w * c * Math.cos(h / 180 * Math.PI) * a;
      hVec.y += w * c * Math.sin(h / 180 * Math.PI) * a;
    }
  }
  if (wSum === 0) {
    return new Color(0, 0, 0, 0);
  }
  if (wSum < 1.0) {
    wSum = 1.0; // ウェイトが1未満の場合、残り分の透明色が存在するとみなして補正する
  }
  let A = aSum / wSum;
  if (A === 0) {
    return new Color(0, 0, 0, 0);
  }
  const L = lSum / (wSum * A);
  const C = cSum / (wSum * A);
  let H = Math.atan2(hVec.y, hVec.x);
  if (H < 0) {
    H += Math.PI * 2;
  }
  const [r, g, b] = chroma.oklch(L, C, H * 180 / Math.PI).rgb();
  return new Color(r / 255, g / 255, b / 255, A);
}

// HTMLヘルパー ///////////////////////////////////////////

function getColorElement(parent: HTMLElement, i: number, type: 'color' | 'alpha' | 'weight'): HTMLInputElement {
  return parent.querySelector(`.${type}${i}`) as HTMLInputElement;
}

// 色設定UI ///////////////////////////////////////////////

function addColorSettingRow(controls: HTMLDivElement, className: number, color: string, weight: number) {
  const div = document.createElement('div');
  div.className = 'color-row';
  div.innerHTML = `
    <input type="color" class="color${className}" value="${color}">
    <label>α <input type="range" class="alpha${className}" min="0" max="1" step="0.01" value="1"></label>
    <label>重み <input type="range" class="weight${className}" min="0" max="1" step="0.01" value="${weight}"></label>
  `;
  controls.appendChild(div);
}

function getColorsAndWeights(controls: HTMLDivElement): { colors: Color[]; weights: number[] } {
  // 要素の取得
  const rows = controls.querySelectorAll('.color-row');
  // 色と重みの取得
  const colors: Color[] = [];
  const weights: number[] = [];
  rows.forEach((_row, i) => {
    const color = getColorElement(controls, i, 'color').value;
    const alpha = parseFloat(getColorElement(controls, i, 'alpha').value);
    const weight = parseFloat(getColorElement(controls, i, 'weight').value);
    const rgb = chroma(color).rgb();
    colors.push(new Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, alpha));
    weights.push(weight);
  });
  return { colors, weights };
}

function updateCanvas(blendedColor: Color, colors: Color[], weights: number[], ctx: CanvasRenderingContext2D | null, canvas: HTMLCanvasElement) {
  if (!ctx) {
    return;
  }

  // 背景クリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 元の色サンプル表示
  const unitWidth = canvas.width / colors.length;
  for (const [i, color] of colors.entries()) {
    ctx.fillStyle = `rgba(${color.r * 255},${color.g * 255},${color.b * 255},${color.a})`;
    ctx.fillRect(i * unitWidth, 0, unitWidth, canvas.height / 2);
  }

  // 合成結果表示
  ctx.fillStyle = `rgba(${blendedColor.r * 255},${blendedColor.g * 255},${blendedColor.b * 255},${blendedColor.a})`;
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  const canvasText = document.getElementById('canvas-text');
  if (canvasText) {
    canvasText.textContent = `結果: rgba(${(blendedColor.r * 255).toFixed(0)}, ${(blendedColor.g * 255).toFixed(0)}, ${(blendedColor.b * 255).toFixed(0)}, ${blendedColor.a.toFixed(2)})`;
  }
}

// メイン処理 /////////////////////////////////////////////

function initializeMethodContainer(containerID: string, method: 'straight-alpha' | 'premul-alpha' | 'oklch') {
  const methodContainer = document.getElementById(containerID) as HTMLDivElement;
  const controls = methodContainer.querySelector('.controls') as HTMLDivElement;
  const canvas = methodContainer.querySelector('.preview-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  // 初期設定
  const initialColors = [
    {color: '#ff8800', weight: 1.0 },
    {color: '#0000ff', weight: 1.0 }
  ];
  for (const [i, color] of initialColors.entries()) {
    addColorSettingRow(controls, i, color.color, color.weight);
  }
  let colorCount = initialColors.length;

  // 描画更新
  function redrawCanvas() {
    const { colors, weights } = getColorsAndWeights(controls);
    let blendedColor: Color;
    if (method === 'straight-alpha') {
      blendedColor = blendColors_StraightAlpha(colors, weights);
    } else if (method === 'premul-alpha') {
      blendedColor = blendColors_PreMultipliedAlpha(colors, weights);
    } else {
      blendedColor = blendColors_OKLCh(colors, weights);
    }
    updateCanvas(blendedColor, colors, weights, ctx, canvas);
  }

  // イベント登録
  controls.addEventListener('input', redrawCanvas);
  (methodContainer.querySelector('.addColor') as HTMLButtonElement).addEventListener('click', () => {
    addColorSettingRow(controls, colorCount, '#ffffff', 1.0);
    colorCount++;
    redrawCanvas();
  });
  (methodContainer.querySelector('.removeColor') as HTMLButtonElement).addEventListener('click', () => {
    if (colorCount > 2 && controls.lastElementChild) {
      controls.removeChild(controls.lastElementChild);
      colorCount--;
      redrawCanvas();
    }
  });

  redrawCanvas();
}

function main() {
  initializeMethodContainer('method-container1', 'straight-alpha');
  initializeMethodContainer('method-container2', 'premul-alpha');
  initializeMethodContainer('method-container3', 'oklch');
}

document.addEventListener('DOMContentLoaded', main);

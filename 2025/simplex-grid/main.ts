import { GLSLShader, ModelBuffer } from '../common/webgl-helper'

// シェーダ /////////////////////////////////////////////

// なんかいい感じな普通のグラデーションのシェーダ
class ColorGradationShader extends GLSLShader {
  protected initializeFragmentShaderSource() {
    this.fragmentShaderSource = /*cs*/`
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  vec2 p = gl_FragCoord.xy / maxRes;

  gl_FragColor.r = p.x * abs(cos(iTime));
  gl_FragColor.g = p.y * abs(cos(iTime * 0.7));
  gl_FragColor.b = (1.0 - (p.x + p.y) * 0.5) * abs(sin(iTime * 1.1));
  gl_FragColor.a = 1.0;
}
`
  }
}

// シンプレックスグリッドのシェーダ
class SimplexGridShader extends GLSLShader {
  protected simplexGridLogic = /*cs*/`

// 回転角度15度のシンプレックス座標への座標変換行列とその逆行列
const mat2 SIMPLEX_MAT     = mat2( 0.96592,  0.25882,
                                   0.25882,  0.96592);
const mat2 INV_SIMPLEX_MAT = mat2( 1.11537, -0.29887,
                                  -0.29887,  1.11537);

// シンプレックス座標への変換
void uvToSimplex(
  vec2 uv,
  out vec2 floorPos,    // 整数座標
  out vec2 fractPos,    // 小数座標
  out float simplexSide // 方向 1:下側の三角形、-1:上側の三角形
) {
    vec2 simPos = uv * INV_SIMPLEX_MAT;

    floorPos = floor(simPos);
    fractPos = fract(simPos);
    simplexSide = 1.0;

    // 上側/下側の三角形の判定
    if (fractPos.y > 1.0 - fractPos.x) {
      // 上側の三角形の場合、座標を反転（三角形の右上から左下に向かう座標となる）
      floorPos = floorPos + 1.0;
      fractPos = 1.0 - fractPos;
      simplexSide = -1.0;
    }
}

// UV座標への変換
vec2 simplexToUV(vec2 simplexPos) {
    return simplexPos * SIMPLEX_MAT;
}

// シンプレックスグリッドの描画
vec3 simplexGrid(vec2 uv) {
  vec2 floorPos, fractPos;
  float simplexSide;
  uvToSimplex(uv, floorPos, fractPos, simplexSide);
  return vec3(fractPos.x * 0.5, fractPos.y * 0.5, 0.0);
}
`

  protected initializeFragmentShaderSource() {
    this.fragmentShaderSource = /*cs*/`
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexGridLogic}

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  float zoom = 5.0;
  vec2 p = gl_FragCoord.xy / maxRes;
  vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.5) * zoom);

  // シンプレックスグリッドの描画
  vec3 simplexGrid = simplexGrid(uv);

  gl_FragColor.r = simplexGrid.r;
  gl_FragColor.g = simplexGrid.g;
  gl_FragColor.b = 0.0;
  gl_FragColor.a = 1.0;
}
`
  }
}

// シンプレックスノイズのシェーダ
class SimplexNoiseShader extends SimplexGridShader {

  protected initializeFragmentShaderSource() {
    this.fragmentShaderSource = /*cs*/`
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexGridLogic}

// ２次元ベクトルのランダムな勾配ベクトル
// 参考:https://www.shadertoy.com/view/tXsSRS
const float PI = 3.1415626535;
float random(vec2 p)
{
	return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453123);
}
vec2 randomGradient(vec2 p)
{
  float angle = random(p) * 2.0 * PI;
  float radius = sqrt(random(p + vec2(100.0)));
  return vec2(cos(angle), sin(angle)) * radius;
}

// 隣接３セルのオフセット（シンプレックス座標）
const mat3 vertesOffsets = mat3(
  0.0, 0.0, 0.0,
  1.0, 0.0, 0.0,
  0.0, 1.0, 0.0
);

// シンプレックスノイズの描画
float simplexNoise(vec2 uv, float randomScale) {
  float sum = 0.0;

  // 中心セル
  vec2 floorPos, fractPos;
  float simplexSide;
  uvToSimplex(uv, floorPos, fractPos, simplexSide);

  // 中心セルの三つの頂点ごとに処理
  for (int i = 0; i < 3; i++) {
    // 頂点のシンプレックス座標
    vec2 vertexSimplex = floorPos + vertesOffsets[i].xy * simplexSide;
    // 頂点のUV座標
    vec2 vertexUV = simplexToUV(vertexSimplex);
    // UV座標のオフセット
    vec2 offsetUV = uv - vertexUV;

    // 距離によるガウス関数的な重み付け
    float weight = max(0.0, 1.15 - dot(offsetUV, offsetUV)); // コントラストを上げるため1.15に設定。1.2あたりを超えると色飛びします。最適値は不明…
    weight = weight * weight;
    weight = weight * weight;

    // ランダムな勾配ベクトルとの内積を重み付きで加算
    vec2 gradient = randomGradient(vertexSimplex);
    sum += (weight * dot(offsetUV, gradient));

    // ウェイトの可視化（デバッグ用）
    // sum += (weight * random(vertexSimplex));
  }

  return 0.5 + sum;
}

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  float zoom = 30.0;
  vec2 p = gl_FragCoord.xy / maxRes;
  vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.5) * zoom);

  // ノイズの描画
  float randomScale = 0.2;
  float val = simplexNoise(uv, randomScale);

  // グリッドの描画
  vec3 simplexGrid = simplexGrid(uv) * 0.0;

  gl_FragColor.r = val + simplexGrid.r;
  gl_FragColor.g = val + simplexGrid.g;
  gl_FragColor.b = val;
  gl_FragColor.a = 1.0;
}
`
  }
}

// シンプレックスグリッド上にパターンを描画するシェーダ
class XmasPatternShader extends SimplexGridShader {

  protected initializeFragmentShaderSource() {
    this.fragmentShaderSource = /*cs*/`
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexGridLogic}

// 簡易な乱数
float random21(vec2 p) {
	return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453123);
}

vec2 random22(vec2 p) {
  float k = 6.283185307 * random21(p);
  return vec2(cos(k), sin(k));
}

// セル中心のオフセット（シンプレックス座標）
const vec2 SIMPLEX_CELL_CENTER = vec2(0.33333, 0.33333);

// 中心＋隣接３セルのオフセット（シンプレックス座標）
const mat4 CELL_OFFSETS = mat4(
   0.00000,  0.00000, 0.0, 0.0,
  -0.66666,  0.33333, 0.0, 0.0,
   0.33333,  0.33333, 0.0, 0.0,
   0.33333, -0.66666, 0.0, 0.0
);

// 光の点の描画
float lightPoint(vec2 uv, vec2 simCenter, float randomScale, float pointScale) {
  vec2 floorPos = floor(simCenter);
  vec2 uvCenter = simplexToUV(simCenter)                       // セル中心のUV座標
               + (random22(floorPos) - 0.5) * randomScale;     // ランダムにオフセット
  float scale = pointScale * (1.0 + random21(floorPos) * 1.2); // ランダムな大きさ
  float dist = length(uvCenter - uv);                          // 中心からの距離
  float val = smoothstep(0.0, 1.0, clamp(1.0 - dist * scale, 0.0, 1.0)); // 距離に応じたフェードで光を表現
  return val;
}

// シンプレックスグリッドに光の点を描画
float cellPattern(vec2 uv, float randomScale, float pointScale) {
  float result = 0.0;

  // 中心セル
  vec2 floorPos1, fractPos1;
  float simplexSide1;
  uvToSimplex(uv, floorPos1, fractPos1, simplexSide1); // セル原点のシンプレックス座標

  // 中心セルと隣接セルの光の点を描画
  for (int i = 0; i < 4; i++) {
    // セル中心のシンプレックス座標
    vec2 simCenter2 = floorPos1
      + SIMPLEX_CELL_CENTER * simplexSide1
      + CELL_OFFSETS[i].xy * simplexSide1;
    result += lightPoint(uv, simCenter2, randomScale, pointScale);
  }

  return result;
}

// 回転角度50度の座標変換行列
const mat2 rotMat50  = mat2( 0.6427, 0.7660, -0.7660, 0.6427);

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  vec2 p = gl_FragCoord.xy / maxRes;

  // アニメーション
  float zoom = 5.0;
  vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.5) * zoom);
  // vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.0) * zoom);

  // 大小パターンを加算して描画
  float pointScale = 1.0 / 0.4;
  float val = cellPattern(uv, 0.2, pointScale) // 小さい点
    + cellPattern((uv + iTime) * rotMat50 * 0.5, 0.2, pointScale) * 0.7; // 大きい点

  // グリッドの描画
  vec3 simplexGrid = simplexGrid(uv);

  gl_FragColor.r = val + simplexGrid.r;
  gl_FragColor.g = val + simplexGrid.g;
  gl_FragColor.b = val;
  gl_FragColor.a = 1.0;
}
`
  }
}

// メイン処理 /////////////////////////////////////////////

function main() {

  // WebGL初期化
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement
  const gl = canvas.getContext('webgl') as WebGLRenderingContext
  gl.viewport(0, 0, canvas.width, canvas.height)

  // シェーダ初期化
  const colorGradationShader = new ColorGradationShader()
  const simplexGridShader = new SimplexGridShader()
  const simplexNoiseShader = new SimplexNoiseShader()
  const xmasPatternShader = new XmasPatternShader()
  for (const shader of [colorGradationShader, simplexGridShader, simplexNoiseShader, xmasPatternShader]) {
    shader.build(gl)
  }

  // モデルのバッファ初期化
  const verticesData = new Float32Array([
    -1.0,  1.0,
    -1.0, -1.0,
     1.0,  1.0,
     1.0, -1.0,
  ])
  const modelBuffer = new ModelBuffer()
  modelBuffer.allocate(gl, verticesData)

  // シェーダ選択
  let currentShader: GLSLShader = colorGradationShader;
  const patternRadioButton = document.getElementById('shader_pattern') as HTMLInputElement
  const gridRadioButton = document.getElementById('shader_grid') as HTMLInputElement
  const noiseRadioButton = document.getElementById('shader_noise') as HTMLInputElement
  const colorRadioButton = document.getElementById('shader_color') as HTMLInputElement
  const handleShaderChange = () => {
    if (patternRadioButton.checked) {
      currentShader = xmasPatternShader;
    }
    else if (gridRadioButton.checked) {
      currentShader = simplexGridShader;
    }
    else if (noiseRadioButton.checked) {
      currentShader = simplexNoiseShader;
    }
    else {
      currentShader = colorGradationShader;
    }
    draw();
  }
  [patternRadioButton, gridRadioButton, noiseRadioButton, colorRadioButton].forEach(rb => {
    rb.addEventListener('change', handleShaderChange);
  });

  // 再生・停止ボタン
  const pauseButton = document.getElementById('btn_pause') as HTMLButtonElement
  let isPaused = true
  function togglePause() {
    isPaused = !isPaused
    pauseButton.textContent = isPaused ? '再生' : '停止'
    if (!isPaused) {
      update();
    }
  }
  pauseButton.addEventListener('click', () => {
    togglePause();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === ' ') {
      togglePause();
      ev.preventDefault();
    }
  });

  // レンダリングループ
  let time = 0.0

  function draw() {
    gl.useProgram(currentShader.shaderProgram)
    currentShader.setUniforms(gl, [canvas.width, canvas.height], time)
    currentShader.enableAttributes(gl)

    modelBuffer.bind(gl)

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();
  }

  function update() {
    draw();

    if (!isPaused) {
      time += 0.004
      requestAnimationFrame(update)
    }
  }

  handleShaderChange()
  update()
}

document.addEventListener('DOMContentLoaded', main)

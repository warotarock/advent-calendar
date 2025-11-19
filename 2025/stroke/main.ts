
// 簡易シェーダクラス /////////////////////////////////////
class GLSLShader {
  shaderProgram: WebGLProgram | null = null
  vertexShaderSource: string = ''
  fragmentShaderSource: string = ''
  vertexShader: WebGLShader | null = null
  fragmentShader: WebGLShader | null = null
  iResolution_uniform: WebGLUniformLocation | null = null
  iTime_uniform: WebGLUniformLocation | null = null
  position_attribute: number = -1

  // シェーダのコンパイルとプログラムのリンク
  build(gl: WebGLRenderingContext) {
    this.initializeShaderSources()
    this.createShaders(gl)
    this.createProgram(gl)
    this.linkShaders(gl)
    this.initializeShaderVariables(gl)
  }

  // シェーダソースの初期化
  protected initializeShaderSources() {
    this.initializeVertexShaderSource()
    this.initializeFragmentShaderSource()
  }

  // 頂点シェーダソースの初期化（継承先クラスで実装）
  protected initializeVertexShaderSource() {
    this.vertexShaderSource = /*cs*/`
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`
  }

  // フラグメントシェーダソースの初期化（継承先クラスで実装）
  protected initializeFragmentShaderSource() {
  }

  private createShaders(gl: WebGLRenderingContext) {
    this.vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource)
    this.fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource)
  }

  private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader) {
      throw new Error('Failed to create shader.')
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (!compiled) {
      const error = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error('Failed to compile shader: ' + error)
    }

    return shader
  }

  private createProgram(gl: WebGLRenderingContext) {
    this.shaderProgram = gl.createProgram()
    if (!this.shaderProgram) {
      throw new Error('Failed to create shader program.')
    }
  }

  private linkShaders(gl: WebGLRenderingContext) {
    const shaderProgram = this.shaderProgram
    const vertexShader = this.vertexShader
    const fragmentShader = this.fragmentShader
    if (!shaderProgram || !vertexShader || !fragmentShader) {
      throw new Error('Shaders or program have not been created.')
    }
    gl.attachShader(shaderProgram, vertexShader)
    gl.attachShader(shaderProgram, fragmentShader)
    gl.linkProgram(shaderProgram)
    const linked = gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)
    if (!linked) {
      const error = gl.getProgramInfoLog(shaderProgram)
      gl.deleteProgram(shaderProgram)
      throw new Error('Failed to link program: ' + error)
    }
  }

  private initializeShaderVariables(gl: WebGLRenderingContext) {
    const shaderProgram = this.shaderProgram
    if (!shaderProgram) {
      throw new Error('Shader program has not been created.')
    }
    this.iResolution_uniform = gl.getUniformLocation(shaderProgram, 'iResolution')
    if (!this.iResolution_uniform) {
      throw new Error('Failed to get the storage location of iResolution.')
    }
    this.iTime_uniform = gl.getUniformLocation(shaderProgram, 'iTime')
    if (!this.iTime_uniform) {
      throw new Error('Failed to get the storage location of iTime.')
    }
    this.position_attribute = gl.getAttribLocation(shaderProgram, 'aPosition')
    if (this.position_attribute === -1) {
      throw new Error('Failed to get the storage location of aPosition.')
    }
  }

  enableAttributes(gl: WebGLRenderingContext) {
    gl.enableVertexAttribArray(this.position_attribute)
    gl.vertexAttribPointer(this.position_attribute, 2, gl.FLOAT, false, 0, 0)
  }

  disableAttributes(gl: WebGLRenderingContext) {
    gl.disableVertexAttribArray(this.position_attribute)
  }

  setUniforms(gl: WebGLRenderingContext, iResolution: [number, number], iTime: number) {
    if (!this.iResolution_uniform || !this.iTime_uniform) {
      throw new Error('Uniform locations have not been initialized.')
    }
    gl.uniform2fv(this.iResolution_uniform, iResolution)
    gl.uniform1f(this.iTime_uniform, iTime)
  }
}

// 簡易バッファクラス /////////////////////////////////////
class ModelBuffer {
  vertexBuffer: WebGLBuffer | null = null
  vertexCount: number = 0

  allocate(gl: WebGLRenderingContext, verticesData: Float32Array) {
    const vertexBuffer = gl.createBuffer()
    if (!vertexBuffer) {
      throw new Error('Failed to create vertex buffer.')
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, verticesData, gl.STATIC_DRAW)

    this.vertexBuffer = vertexBuffer
    this.vertexCount = verticesData.length / 3
  }

  bind(gl: WebGLRenderingContext) {
    if (!this.vertexBuffer) {
      throw new Error('Vertex buffer has not been created.')
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
  }
}

// glMatrixの部分移植 /////////////////////////////////////
type Vec3 = [number, number, number]
type Mat4 = number[] // 4 x 4
const vec3 = {
  create: (): Vec3 => {
    return [0, 0, 0]
  },
  fromValues: (x: number, y: number, z: number): Vec3 => {
    return [x, y, z]
  },
  copy: (out: Vec3, a: Vec3): Vec3 => {
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
  },
  add: (out: Vec3, a: Vec3, b: Vec3): Vec3 => {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    out[2] = a[2] + b[2]
    return out
  },
  subtract: (out: Vec3, a: Vec3, b: Vec3): Vec3 => {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    out[2] = a[2] - b[2]
    return out
  },
  scale: (out: Vec3, a: Vec3, s: number): Vec3 => {
    out[0] = a[0] * s
    out[1] = a[1] * s
    out[2] = a[2] * s
    return out
  },
  transformMat4: (out: Vec3, a: Vec3, m: Mat4): Vec3 => {
    const x = a[0],
      y = a[1],
      z = a[2]
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12]
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13]
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14]
    return out
  }
}
const mat4 = {
  create: (): Mat4 => {
    return new Array(16).fill(0)
  },
  identity: (out: Mat4): Mat4 => {
    out[0] = 1
    out[1] = 0
    out[2] = 0
    out[3] = 0
    out[4] = 0
    out[5] = 1
    out[6] = 0
    out[7] = 0
    out[8] = 0
    out[9] = 0
    out[10] = 1
    out[11] = 0
    out[12] = 0
    out[13] = 0
    out[14] = 0
    out[15] = 1
    return out
  },
  multiply: (out: Mat4, a: Mat4, b: Mat4): Mat4 => {
    var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3]
    var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7]
    var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11]
    var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]
    var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3]
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
    b0 = b[4]
    b1 = b[5]
    b2 = b[6]
    b3 = b[7]
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
    b0 = b[8]
    b1 = b[9]
    b2 = b[10]
    b3 = b[11]
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
    b0 = b[12]
    b1 = b[13]
    b2 = b[14]
    b3 = b[15]
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
    return out
  },
  invert: (out: Mat4, a: Mat4): Mat4 | null => {
    var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3]
    var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7]
    var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11]
    var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]
    var b00 = a00 * a11 - a01 * a10
    var b01 = a00 * a12 - a02 * a10
    var b02 = a00 * a13 - a03 * a10
    var b03 = a01 * a12 - a02 * a11
    var b04 = a01 * a13 - a03 * a11
    var b05 = a02 * a13 - a03 * a12
    var b06 = a20 * a31 - a21 * a30
    var b07 = a20 * a32 - a22 * a30
    var b08 = a20 * a33 - a23 * a30
    var b09 = a21 * a32 - a22 * a31
    var b10 = a21 * a33 - a23 * a31
    var b11 = a22 * a33 - a23 * a32
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
    if (!det) {
      return null
    }
    det = 1.0 / det
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det
    return out
  },
  projection: (out: Mat4, width: number, height: number): Mat4 => {
    out[0] = 2 / width;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = -2 / height;
    out[5] = 0;
    out[6] = -1;
    out[7] = 1;
    out[8] = 1;
    return out;
  }
}

// メイン処理 /////////////////////////////////////////////
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

class SimplexGridShader extends GLSLShader {
  protected simplexTransformLogic = /*cs*/`

// 回転角度15度のシンプレックス座標への座標変換行列
const mat2 mat  = mat2(1.0   ,  0.258819, 0.258819, 1.0   );
const mat2 imat = mat2(1.0718, -0.2774  , -0.2774 , 1.0718);

// シンプレックス座標への変換
void uvToSimplex(
  vec2 uv,
  out vec2 intPos, // 整数座標
  out vec2 localPos, // 小数座標
  out float direction
) {
    vec2 local = uv * imat;

    intPos = floor(local);
    localPos = fract(local);
    direction = 1.0;

    if (localPos.x + localPos.y > 1.0) {
        intPos = intPos + 1.0;
        localPos = 1.0 - localPos;
        direction = -1.;
    }
}

// UV座標への変換
vec2 simplexToUV(vec2 simplexPos)
{
    return simplexPos * mat;
}

// シンプレックスグリッドの描画
vec3 simplexGrid(vec2 uv)
{
  vec2 intPos, localPos;
  float direction;
  uvToSimplex(uv, intPos, localPos, direction);

  return vec3(localPos.x * 0.5, localPos.y * 0.5, 0.0);
}
`

  protected initializeFragmentShaderSource() {
    this.fragmentShaderSource = /*cs*/`
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexTransformLogic}

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

class SimplexPatternShader extends SimplexGridShader {

  protected initializeFragmentShaderSource() {
    this.fragmentShaderSource = /*cs*/`
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexTransformLogic}

// 乱数
float random21(vec2 x)
{
  return fract(sin(dot(x, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 random22(vec2 x)
{
    float k = 6.283185307 * random21(x);
    return vec2(cos(k), sin(k));
}

// 隣接３セルのオフセット（GLSL3なら配列で書けます）
vec2 getSideCellOffset(int index)
{
    if (index == 0) return vec2(  .66666,   .66666);
    if (index == 1) return vec2(-0.33333,   .66666);
    return vec2(  .66666, -0.33333);
}


// 光の点の描画
float lightPoint(vec2 uv, vec2 cellPos, float scale)
{
    float d = length(cellPos - uv) * scale;
    float val = smoothstep(0.0, 1.0, clamp(1.0 - d, 0.0, 1.0));
    return val;
}

// シンプレックスグリッドに光の点を描画
float cellPattern(vec2 uv, float randomScale, float pointRadius)
{
    float resutl = 0.0;

    // 中心セル
    vec2 intPos, localPos, simCenter, uvCenter;
    float direction;
    uvToSimplex(uv, intPos, localPos, direction);             // シンプレックス座標
    simCenter = intPos + vec2(0.33333, 0.33333) * direction;  // セル中心のシンプレックス座標
    uvCenter = simplexToUV(simCenter);                        // セル中心のUV座標
    uvCenter += (random22(intPos) - 0.5) * randomScale;       // ランダムにオフセット
    resutl += lightPoint(uv, uvCenter, pointRadius);

    // 隣接セル
    vec2 intPos2, localPos2, simCenter2, uvCenter2;
    float direction2;
    for (int i = 0; i < 3; i++)
    {
        vec2 cellUV = simplexToUV(intPos + getSideCellOffset(i) * direction); // 隣接セルのUV座標
        uvToSimplex(cellUV, intPos2, localPos2, direction2);                  // 隣接セルのシンプレックス座標
        simCenter2 = intPos2 + vec2(0.33333, 0.33333) * direction2;           // セル中心のシンプレックス座標
        uvCenter2 = simplexToUV(simCenter2);                                  // セル中心のUV座標
        uvCenter2 += (random22(intPos2) - 0.5) * randomScale;                 // ランダムにオフセット
        resutl += lightPoint(uv, uvCenter2, pointRadius);
    }

    return resutl;
}

// 回転角度60/120度の座標変換行列
const mat2 rotMat60 = mat2(0.5, -0.866, 0.866, 0.5);
const mat2 rotMat120 = mat2(-0.5, -0.866, 0.866, -0.5);

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  float zoom = 5.0;
  vec2 p = gl_FragCoord.xy / maxRes;
  vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.5) * zoom);

  // 3パターンを加算して描画
  float randomScale = 0.2;
  float pointRadius = 1.0 / 0.3;
  float val =
      cellPattern(uv, randomScale, pointRadius)
      + cellPattern((uv * rotMat60 + vec2(0.2, 0.4)), randomScale, pointRadius * 1.2)
      + cellPattern((uv * rotMat120 + vec2(0.6, 0.8)), randomScale, pointRadius * 1.6);

  // シンプレックスグリッドの描画
  vec3 simplexGrid = simplexGrid(uv);

  gl_FragColor.r = val + simplexGrid.r;
  gl_FragColor.g = val + simplexGrid.g;
  gl_FragColor.b = val;
  gl_FragColor.a = 1.0;
}
`
  }
}

function main() {

  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement
  const gl = canvas.getContext('webgl') as WebGLRenderingContext
  gl.viewport(0, 0, canvas.width, canvas.height)

  const simpleRadioButton = document.getElementById('shader_simple') as HTMLInputElement
  const gridRadioButton = document.getElementById('shader_grid') as HTMLInputElement
  const patternRadioButton = document.getElementById('shader_pattern') as HTMLInputElement

  const colorGradationShader = new ColorGradationShader()
  const simplexGridShader = new SimplexGridShader()
  const simplexPatternShader = new SimplexPatternShader()
  for (const shader of [colorGradationShader, simplexGridShader, simplexPatternShader]) {
    shader.build(gl)
  }

  let currentShader: GLSLShader = colorGradationShader;

  const handleShaderChange = () => {
    if (patternRadioButton.checked) {
      currentShader = simplexPatternShader;
    }
    else if (gridRadioButton.checked) {
      currentShader = simplexGridShader;
    }
    else {
      currentShader = colorGradationShader;
    }
  }
  simpleRadioButton.addEventListener('change', handleShaderChange)
  gridRadioButton.addEventListener('change', handleShaderChange)
  patternRadioButton.addEventListener('change', handleShaderChange)

  const verticesData = new Float32Array([
    -1.0,  1.0,
    -1.0, -1.0,
     1.0,  1.0,
     1.0, -1.0,
  ])
  const modelBuffer = new ModelBuffer()
  modelBuffer.allocate(gl, verticesData)

  let time = 0.0

  function update() {

    gl.useProgram(currentShader.shaderProgram)
    currentShader.setUniforms(gl, [canvas.width, canvas.height], time)
    currentShader.enableAttributes(gl)

    modelBuffer.bind(gl)

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();

    const projectionMat = mat4.create()
    mat4.projection(projectionMat, canvas.width, canvas.height)

    time += 0.004

    requestAnimationFrame(update)
  }

  handleShaderChange()
  update()
}

document.addEventListener('DOMContentLoaded', main)

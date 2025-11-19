"use strict";
(() => {
  // ../common/webgl-helper.ts
  var GLSLShader = class {
    shaderProgram = null;
    vertexShaderSource = "";
    fragmentShaderSource = "";
    vertexShader = null;
    fragmentShader = null;
    iResolution_uniform = null;
    iTime_uniform = null;
    position_attribute = -1;
    // シェーダのコンパイルとプログラムのリンク
    build(gl) {
      this.initializeShaderSources();
      this.createShaders(gl);
      this.createProgram(gl);
      this.linkShaders(gl);
      this.initializeShaderVariables(gl);
    }
    // シェーダソースの初期化
    initializeShaderSources() {
      this.initializeVertexShaderSource();
      this.initializeFragmentShaderSource();
    }
    // 頂点シェーダソースの初期化（継承先クラスで実装）
    initializeVertexShaderSource() {
      this.vertexShaderSource = /*cs*/
      `
precision mediump float;

attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
    }
    // フラグメントシェーダソースの初期化（継承先クラスで実装）
    initializeFragmentShaderSource() {
    }
    createShaders(gl) {
      this.vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
      this.fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
    }
    createShader(gl, type, source) {
      const shader = gl.createShader(type);
      if (!shader) {
        throw new Error("Failed to create shader.");
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      if (!compiled) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Failed to compile shader: " + error);
      }
      return shader;
    }
    createProgram(gl) {
      this.shaderProgram = gl.createProgram();
      if (!this.shaderProgram) {
        throw new Error("Failed to create shader program.");
      }
    }
    linkShaders(gl) {
      const shaderProgram = this.shaderProgram;
      const vertexShader = this.vertexShader;
      const fragmentShader = this.fragmentShader;
      if (!shaderProgram || !vertexShader || !fragmentShader) {
        throw new Error("Shaders or program have not been created.");
      }
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);
      const linked = gl.getProgramParameter(shaderProgram, gl.LINK_STATUS);
      if (!linked) {
        const error = gl.getProgramInfoLog(shaderProgram);
        gl.deleteProgram(shaderProgram);
        throw new Error("Failed to link program: " + error);
      }
    }
    initializeShaderVariables(gl) {
      const shaderProgram = this.shaderProgram;
      if (!shaderProgram) {
        throw new Error("Shader program has not been created.");
      }
      this.iResolution_uniform = gl.getUniformLocation(shaderProgram, "iResolution");
      if (!this.iResolution_uniform) {
        throw new Error("Failed to get the storage location of iResolution.");
      }
      this.iTime_uniform = gl.getUniformLocation(shaderProgram, "iTime");
      if (!this.iTime_uniform) {
        throw new Error("Failed to get the storage location of iTime.");
      }
      this.position_attribute = gl.getAttribLocation(shaderProgram, "aPosition");
      if (this.position_attribute === -1) {
        throw new Error("Failed to get the storage location of aPosition.");
      }
    }
    enableAttributes(gl) {
      gl.enableVertexAttribArray(this.position_attribute);
      gl.vertexAttribPointer(this.position_attribute, 2, gl.FLOAT, false, 0, 0);
    }
    disableAttributes(gl) {
      gl.disableVertexAttribArray(this.position_attribute);
    }
    setUniforms(gl, iResolution, iTime) {
      if (!this.iResolution_uniform || !this.iTime_uniform) {
        throw new Error("Uniform locations have not been initialized.");
      }
      gl.uniform2fv(this.iResolution_uniform, iResolution);
      gl.uniform1f(this.iTime_uniform, iTime);
    }
  };
  var ModelBuffer = class {
    vertexBuffer = null;
    vertexCount = 0;
    allocate(gl, verticesData) {
      const vertexBuffer = gl.createBuffer();
      if (!vertexBuffer) {
        throw new Error("Failed to create vertex buffer.");
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, verticesData, gl.STATIC_DRAW);
      this.vertexBuffer = vertexBuffer;
      this.vertexCount = verticesData.length / 3;
    }
    bind(gl) {
      if (!this.vertexBuffer) {
        throw new Error("Vertex buffer has not been created.");
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    }
  };

  // main.ts
  var ColorGradationShader = class extends GLSLShader {
    initializeFragmentShaderSource() {
      this.fragmentShaderSource = /*cs*/
      `
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
`;
    }
  };
  var SimplexGridShader = class extends GLSLShader {
    simplexGridLogic = (
      /*cs*/
      `

// \u56DE\u8EE2\u89D2\u5EA615\u5EA6\u306E\u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19\u3078\u306E\u5EA7\u6A19\u5909\u63DB\u884C\u5217\u3068\u305D\u306E\u9006\u884C\u5217
const mat2 SIMPLEX_MAT     = mat2( 0.96592,  0.25882,
                                   0.25882,  0.96592);
const mat2 INV_SIMPLEX_MAT = mat2( 1.11537, -0.29887,
                                  -0.29887,  1.11537);

// \u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19\u3078\u306E\u5909\u63DB
void uvToSimplex(
  vec2 uv,
  out vec2 floorPos,    // \u6574\u6570\u5EA7\u6A19
  out vec2 fractPos,    // \u5C0F\u6570\u5EA7\u6A19
  out float simplexSide // \u65B9\u5411 1:\u4E0B\u5074\u306E\u4E09\u89D2\u5F62\u3001-1:\u4E0A\u5074\u306E\u4E09\u89D2\u5F62
) {
    vec2 simPos = uv * INV_SIMPLEX_MAT;

    floorPos = floor(simPos);
    fractPos = fract(simPos);
    simplexSide = 1.0;

    // \u4E0A\u5074/\u4E0B\u5074\u306E\u4E09\u89D2\u5F62\u306E\u5224\u5B9A
    if (fractPos.y > 1.0 - fractPos.x) {
      // \u4E0A\u5074\u306E\u4E09\u89D2\u5F62\u306E\u5834\u5408\u3001\u5EA7\u6A19\u3092\u53CD\u8EE2\uFF08\u4E09\u89D2\u5F62\u306E\u53F3\u4E0A\u304B\u3089\u5DE6\u4E0B\u306B\u5411\u304B\u3046\u5EA7\u6A19\u3068\u306A\u308B\uFF09
      floorPos = floorPos + 1.0;
      fractPos = 1.0 - fractPos;
      simplexSide = -1.0;
    }
}

// UV\u5EA7\u6A19\u3078\u306E\u5909\u63DB
vec2 simplexToUV(vec2 simplexPos) {
    return simplexPos * SIMPLEX_MAT;
}

// \u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u30B0\u30EA\u30C3\u30C9\u306E\u63CF\u753B
vec3 simplexGrid(vec2 uv) {
  vec2 floorPos, fractPos;
  float simplexSide;
  uvToSimplex(uv, floorPos, fractPos, simplexSide);
  return vec3(fractPos.x * 0.5, fractPos.y * 0.5, 0.0);
}
`
    );
    initializeFragmentShaderSource() {
      this.fragmentShaderSource = /*cs*/
      `
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexGridLogic}

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  float zoom = 5.0;
  vec2 p = gl_FragCoord.xy / maxRes;
  vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.5) * zoom);

  // \u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u30B0\u30EA\u30C3\u30C9\u306E\u63CF\u753B
  vec3 simplexGrid = simplexGrid(uv);

  gl_FragColor.r = simplexGrid.r;
  gl_FragColor.g = simplexGrid.g;
  gl_FragColor.b = 0.0;
  gl_FragColor.a = 1.0;
}
`;
    }
  };
  var SimplexNoiseShader = class extends SimplexGridShader {
    initializeFragmentShaderSource() {
      this.fragmentShaderSource = /*cs*/
      `
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexGridLogic}

// \uFF12\u6B21\u5143\u30D9\u30AF\u30C8\u30EB\u306E\u30E9\u30F3\u30C0\u30E0\u306A\u52FE\u914D\u30D9\u30AF\u30C8\u30EB
// \u53C2\u8003:https://www.shadertoy.com/view/tXsSRS
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

// \u96A3\u63A5\uFF13\u30BB\u30EB\u306E\u30AA\u30D5\u30BB\u30C3\u30C8\uFF08\u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19\uFF09
const mat3 vertesOffsets = mat3(
  0.0, 0.0, 0.0,
  1.0, 0.0, 0.0,
  0.0, 1.0, 0.0
);

// \u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u30CE\u30A4\u30BA\u306E\u63CF\u753B
float simplexNoise(vec2 uv, float randomScale) {
  float sum = 0.0;

  // \u4E2D\u5FC3\u30BB\u30EB
  vec2 floorPos, fractPos;
  float simplexSide;
  uvToSimplex(uv, floorPos, fractPos, simplexSide);

  // \u4E2D\u5FC3\u30BB\u30EB\u306E\u4E09\u3064\u306E\u9802\u70B9\u3054\u3068\u306B\u51E6\u7406
  for (int i = 0; i < 3; i++) {
    // \u9802\u70B9\u306E\u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19
    vec2 vertexSimplex = floorPos + vertesOffsets[i].xy * simplexSide;
    // \u9802\u70B9\u306EUV\u5EA7\u6A19
    vec2 vertexUV = simplexToUV(vertexSimplex);
    // UV\u5EA7\u6A19\u306E\u30AA\u30D5\u30BB\u30C3\u30C8
    vec2 offsetUV = uv - vertexUV;

    // \u8DDD\u96E2\u306B\u3088\u308B\u30AC\u30A6\u30B9\u95A2\u6570\u7684\u306A\u91CD\u307F\u4ED8\u3051
    float weight = max(0.0, 1.15 - dot(offsetUV, offsetUV)); // \u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u3092\u4E0A\u3052\u308B\u305F\u30811.15\u306B\u8A2D\u5B9A\u30021.2\u3042\u305F\u308A\u3092\u8D85\u3048\u308B\u3068\u8272\u98DB\u3073\u3057\u307E\u3059\u3002\u6700\u9069\u5024\u306F\u4E0D\u660E\u2026
    weight = weight * weight;
    weight = weight * weight;

    // \u30E9\u30F3\u30C0\u30E0\u306A\u52FE\u914D\u30D9\u30AF\u30C8\u30EB\u3068\u306E\u5185\u7A4D\u3092\u91CD\u307F\u4ED8\u304D\u3067\u52A0\u7B97
    vec2 gradient = randomGradient(vertexSimplex);
    sum += (weight * dot(offsetUV, gradient));

    // \u30A6\u30A7\u30A4\u30C8\u306E\u53EF\u8996\u5316\uFF08\u30C7\u30D0\u30C3\u30B0\u7528\uFF09
    // sum += (weight * random(vertexSimplex));
  }

  return 0.5 + sum;
}

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  float zoom = 30.0;
  vec2 p = gl_FragCoord.xy / maxRes;
  vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.5) * zoom);

  // \u30CE\u30A4\u30BA\u306E\u63CF\u753B
  float randomScale = 0.2;
  float val = simplexNoise(uv, randomScale);

  // \u30B0\u30EA\u30C3\u30C9\u306E\u63CF\u753B
  vec3 simplexGrid = simplexGrid(uv) * 0.0;

  gl_FragColor.r = val + simplexGrid.r;
  gl_FragColor.g = val + simplexGrid.g;
  gl_FragColor.b = val;
  gl_FragColor.a = 1.0;
}
`;
    }
  };
  var XmasPatternShader = class extends SimplexGridShader {
    initializeFragmentShaderSource() {
      this.fragmentShaderSource = /*cs*/
      `
precision mediump float;

uniform float iTime;
uniform vec2 iResolution;

${this.simplexGridLogic}

// \u7C21\u6613\u306A\u4E71\u6570
float random21(vec2 p) {
	return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453123);
}

vec2 random22(vec2 p) {
  float k = 6.283185307 * random21(p);
  return vec2(cos(k), sin(k));
}

// \u30BB\u30EB\u4E2D\u5FC3\u306E\u30AA\u30D5\u30BB\u30C3\u30C8\uFF08\u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19\uFF09
const vec2 SIMPLEX_CELL_CENTER = vec2(0.33333, 0.33333);

// \u4E2D\u5FC3\uFF0B\u96A3\u63A5\uFF13\u30BB\u30EB\u306E\u30AA\u30D5\u30BB\u30C3\u30C8\uFF08\u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19\uFF09
const mat4 CELL_OFFSETS = mat4(
   0.00000,  0.00000, 0.0, 0.0,
  -0.66666,  0.33333, 0.0, 0.0,
   0.33333,  0.33333, 0.0, 0.0,
   0.33333, -0.66666, 0.0, 0.0
);

// \u5149\u306E\u70B9\u306E\u63CF\u753B
float lightPoint(vec2 uv, vec2 simCenter, float randomScale, float pointScale) {
  vec2 floorPos = floor(simCenter);
  vec2 uvCenter = simplexToUV(simCenter)                       // \u30BB\u30EB\u4E2D\u5FC3\u306EUV\u5EA7\u6A19
               + (random22(floorPos) - 0.5) * randomScale;     // \u30E9\u30F3\u30C0\u30E0\u306B\u30AA\u30D5\u30BB\u30C3\u30C8
  float scale = pointScale * (1.0 + random21(floorPos) * 1.2); // \u30E9\u30F3\u30C0\u30E0\u306A\u5927\u304D\u3055
  float dist = length(uvCenter - uv);                          // \u4E2D\u5FC3\u304B\u3089\u306E\u8DDD\u96E2
  float val = smoothstep(0.0, 1.0, clamp(1.0 - dist * scale, 0.0, 1.0)); // \u8DDD\u96E2\u306B\u5FDC\u3058\u305F\u30D5\u30A7\u30FC\u30C9\u3067\u5149\u3092\u8868\u73FE
  return val;
}

// \u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u30B0\u30EA\u30C3\u30C9\u306B\u5149\u306E\u70B9\u3092\u63CF\u753B
float cellPattern(vec2 uv, float randomScale, float pointScale) {
  float result = 0.0;

  // \u4E2D\u5FC3\u30BB\u30EB
  vec2 floorPos1, fractPos1;
  float simplexSide1;
  uvToSimplex(uv, floorPos1, fractPos1, simplexSide1); // \u30BB\u30EB\u539F\u70B9\u306E\u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19

  // \u4E2D\u5FC3\u30BB\u30EB\u3068\u96A3\u63A5\u30BB\u30EB\u306E\u5149\u306E\u70B9\u3092\u63CF\u753B
  for (int i = 0; i < 4; i++) {
    // \u30BB\u30EB\u4E2D\u5FC3\u306E\u30B7\u30F3\u30D7\u30EC\u30C3\u30AF\u30B9\u5EA7\u6A19
    vec2 simCenter2 = floorPos1
      + SIMPLEX_CELL_CENTER * simplexSide1
      + CELL_OFFSETS[i].xy * simplexSide1;
    result += lightPoint(uv, simCenter2, randomScale, pointScale);
  }

  return result;
}

// \u56DE\u8EE2\u89D2\u5EA650\u5EA6\u306E\u5EA7\u6A19\u5909\u63DB\u884C\u5217
const mat2 rotMat50  = mat2( 0.6427, 0.7660, -0.7660, 0.6427);

void main() {
  float maxRes = max(iResolution.x, iResolution.y);
  vec2 p = gl_FragCoord.xy / maxRes;

  // \u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3
  float zoom = 5.0;
  vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.5) * zoom);
  // vec2 uv = p * (4.0 + abs(0.5 + sin(iTime) * 0.0) * zoom);

  // \u5927\u5C0F\u30D1\u30BF\u30FC\u30F3\u3092\u52A0\u7B97\u3057\u3066\u63CF\u753B
  float pointScale = 1.0 / 0.4;
  float val = cellPattern(uv, 0.2, pointScale) // \u5C0F\u3055\u3044\u70B9
    + cellPattern((uv + iTime) * rotMat50 * 0.5, 0.2, pointScale) * 0.7; // \u5927\u304D\u3044\u70B9

  // \u30B0\u30EA\u30C3\u30C9\u306E\u63CF\u753B
  vec3 simplexGrid = simplexGrid(uv);

  gl_FragColor.r = val + simplexGrid.r;
  gl_FragColor.g = val + simplexGrid.g;
  gl_FragColor.b = val;
  gl_FragColor.a = 1.0;
}
`;
    }
  };
  function main() {
    const canvas = document.getElementById("mainCanvas");
    const gl = canvas.getContext("webgl");
    gl.viewport(0, 0, canvas.width, canvas.height);
    const colorGradationShader = new ColorGradationShader();
    const simplexGridShader = new SimplexGridShader();
    const simplexNoiseShader = new SimplexNoiseShader();
    const xmasPatternShader = new XmasPatternShader();
    for (const shader of [colorGradationShader, simplexGridShader, simplexNoiseShader, xmasPatternShader]) {
      shader.build(gl);
    }
    const verticesData = new Float32Array([
      -1,
      1,
      -1,
      -1,
      1,
      1,
      1,
      -1
    ]);
    const modelBuffer = new ModelBuffer();
    modelBuffer.allocate(gl, verticesData);
    let currentShader = colorGradationShader;
    const patternRadioButton = document.getElementById("shader_pattern");
    const gridRadioButton = document.getElementById("shader_grid");
    const noiseRadioButton = document.getElementById("shader_noise");
    const colorRadioButton = document.getElementById("shader_color");
    const handleShaderChange = () => {
      if (patternRadioButton.checked) {
        currentShader = xmasPatternShader;
      } else if (gridRadioButton.checked) {
        currentShader = simplexGridShader;
      } else if (noiseRadioButton.checked) {
        currentShader = simplexNoiseShader;
      } else {
        currentShader = colorGradationShader;
      }
      draw();
    };
    [patternRadioButton, gridRadioButton, noiseRadioButton, colorRadioButton].forEach((rb) => {
      rb.addEventListener("change", handleShaderChange);
    });
    const pauseButton = document.getElementById("btn_pause");
    let isPaused = false;
    function togglePause() {
      isPaused = !isPaused;
      pauseButton.textContent = isPaused ? "\u518D\u958B" : "\u505C\u6B62";
      if (!isPaused) {
        update();
      }
    }
    pauseButton.addEventListener("click", () => {
      togglePause();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === " ") {
        togglePause();
        ev.preventDefault();
      }
    });
    let time = 0;
    function draw() {
      gl.useProgram(currentShader.shaderProgram);
      currentShader.setUniforms(gl, [canvas.width, canvas.height], time);
      currentShader.enableAttributes(gl);
      modelBuffer.bind(gl);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.flush();
    }
    function update() {
      draw();
      if (!isPaused) {
        time += 4e-3;
        requestAnimationFrame(update);
      }
    }
    handleShaderChange();
    update();
  }
  document.addEventListener("DOMContentLoaded", main);
})();
//# sourceMappingURL=bundle.js.map

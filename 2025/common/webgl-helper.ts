
/** 簡易シェーダクラス */
export class GLSLShader {
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
precision mediump float;

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

/** 簡易バッファクラス */
export class ModelBuffer {
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

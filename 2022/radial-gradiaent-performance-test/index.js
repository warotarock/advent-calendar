
window.onload = () => {

  function generateParticles(particleCount, particleSize) {

    const result = []
    for (let i = 0; i < particleCount; i++) {
  
      const rgb = `0.0, ${randomNumberText(50, 230)}, ${randomNumberText(50, 230)}`
      const alpha = `${randomNumberText(0.1, 1.0)}`
      
      result.push({
        x: randomNumberText(30.0, 340.0),
        y: randomNumberText(30.0, 240.0),
        radius: randomNumberText(particleSize.min, particleSize.range),
        color1: `rgba(${rgb}, ${alpha})`,
        color2: `rgba(${rgb}, 0.0)`
      })
    }

    return result
  }

  function createGradient(x, y, radius, color1, color2, ctx) {

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0.0, color1)
    gradient.addColorStop(1.0, color2)

    return gradient
  }

  function randomNumberText(min, range) {
    return (min + Math.random() * range).toFixed(2)
  }

  const _canvas = document.getElementById('canvas')
  _canvas.width = 400
  _canvas.height = 300
  const _ctx = _canvas.getContext('2d')

  let _logs = []
  const particleSizes = [
    { min: 2, range: 3 },
    { min: 5, range: 5 },
    { min: 10, range: 5 },
    { min: 15, range: 15 },
    { min: 30, range: 20 },
  ]

  const _particleCount = getParticleCount()
  const _particleSize = getParticleSize()
  let _particles = generateParticles(_particleCount, _particleSize)

  function draw(particles, ctx) {

    for (const particle of particles) {

      const gradient = createGradient(
        particle.x,
        particle.y,
        particle.radius,
        particle.color1,
        particle.color2,
        ctx
      )

      ctx.fillStyle = gradient

      ctx.fillRect(
        particle.x - particle.radius,
        particle.y - particle.radius,
        particle.radius * 2,
        particle.radius * 2
      )
    }
  }

  function createGradientsOnly(particles, ctx) {

    for (const particle of particles) {

      createGradient(
        particle.x,
        particle.y,
        particle.radius,
        particle.color1,
        particle.color2,
        ctx
      )
    }
  }
  
  function drawByTransformMatrix(particles, ctx) {

    const gradient = createGradient(
      0.0,
      0.0,
      1.0,
      `rgba(255, 255, 0, 1.0)`,
      `rgba(255, 255, 0, 0.0)`,
      ctx
    )

    ctx.fillStyle = gradient

    for (const particle of particles) {

      ctx.setTransform(
        particle.radius, 0.0,
        0.0, particle.radius,
        particle.x, particle.y
      )

      ctx.fillRect(-1.0, -1.0, 2.0, 2.0)
    }

    ctx.setTransform(
      1.0, 0.0,
      0.0, 1.0,
      0.0, 0.0
    )
  }

  function showLog(title, seconds) {

    const particleCount = getParticleCount()
    const articleSize = getParticleSize('particle-size')
    const text = `${title}: 個数 ${particleCount} サイズ ${articleSize.min}～${articleSize.min + articleSize.range} -> ${seconds.toFixed(0)} ms`

    _logs = [text, ..._logs]

    if (_logs.length > 20) {
      _logs.pop()
    }

    const log_div = document.getElementById('log')
    log_div.innerHTML = _logs.join('<br>')
  }

  function getParticleCount() {

    return getRadioButtonValue('particles')
  }

  function getParticleSize() {

    return particleSizes[getRadioButtonValue('particle-size')]
  }

  function getRadioButtonValue(name) {

    let checked_value
    document.getElementsByName(name).forEach(button => {
      if (button.checked) {
        checked_value = button.value
      }
    })

    return Number(checked_value)
  }

  document.getElementById('clear').onclick = () => {

    const start = performance.now()
    
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height)

    const end = performance.now()

    showLog('クリア', end - start)
  }

  document.getElementById('generate').onclick = () => {

    const start = performance.now()
    
    const particleCount = getParticleCount()
    const particleSize = getParticleSize()
    _particles = generateParticles(particleCount, particleSize)

    const end = performance.now()

    showLog('データ生成', end - start)
  }

  document.getElementById('draw').onclick = () => {

    const start = performance.now()

    draw(_particles, _ctx)

    const end = performance.now()

    showLog('描画', end - start)
  }

  document.getElementById('draw-transform').onclick = () => {

    const start = performance.now()

    drawByTransformMatrix(_particles, _ctx)

    const end = performance.now()

    showLog('行列で描画', end - start)
  }

  document.getElementById('gradients').onclick = () => {

    const start = performance.now()

    createGradientsOnly(_particles, _ctx)

    const end = performance.now()

    showLog('RadialGradientの生成のみ実行', end - start)
  }

  draw(_particles, _ctx)
}

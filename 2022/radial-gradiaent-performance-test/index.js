
window.onload = () => {

  const canvas = document.getElementById('canvas')
  canvas.width = 400
  canvas.height = 300
  const ctx = canvas.getContext('2d')

  let logs = []
  let particles = []
  const particleSizes = [
    { min: 2, range: 3 },
    { min: 5, range: 5 },
    { min: 10, range: 5 },
    { min: 15, range: 15 },
    { min: 30, range: 20 },
  ]

  function generateParticles() {

    const particleCount = getParticleCount()
    const articleSize = getParticleSize('particle-size')

    const result = []
    for (let i = 0; i < particleCount; i++) {
  
      const rgb = `0.0, ${randomNumberText(50, 230)}, ${randomNumberText(50, 230)}`
      const alpha = `${randomNumberText(0.1, 1.0)}`
      
      result.push({
        x: randomNumberText(30.0, 340.0),
        y: randomNumberText(30.0, 240.0),
        radius: randomNumberText(articleSize.min, articleSize.range),
        color1: `rgba(${rgb}, ${alpha})`,
        color2: `rgba(${rgb}, 0.0)`
      })
    }

    return result
  }

  function drawParticle(x, y, radius, color1, color2) {

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0.0, color1);
    gradient.addColorStop(1.0, color2);

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawParticles() {

    for (const particle of particles) {

      drawParticle(
        particle.x,
        particle.y,
        particle.radius,
        particle.color1, 
        particle.color2
      )
    }
  }

  function createGradientsOnly() {

    for (const particle of particles) {

      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius
      );
      gradient.addColorStop(0.0, particle.color1);
      gradient.addColorStop(1.0, particle.color2);
    }
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

  function randomNumberText(min, range) {
    return (min + Math.random() * range).toFixed(2)
  }

  function showLog(title, seconds) {

    const particleCount = getParticleCount()
    const articleSize = getParticleSize('particle-size')
    const text = `${title}: 個数 ${particleCount} サイズ ${articleSize.min}～${articleSize.min + articleSize.range} -> ${seconds.toFixed(0)} ms`

    logs = [text, ...logs]

    if (logs.length > 20) {
      logs.pop()
    }

    const log_div = document.getElementById('log')
    log_div.innerHTML = logs.join('<br>')
  }

  document.getElementById('clear').onclick = () => {

    const start = performance.now();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const end = performance.now();

    showLog('クリア', end - start)
  }

  document.getElementById('generate').onclick = () => {

    const start = performance.now();
    
    particles = generateParticles()

    const end = performance.now();

    showLog('データ生成', end - start)
  }

  document.getElementById('draw').onclick = () => {

    const start = performance.now();

    drawParticles()

    const end = performance.now();

    showLog('描画', end - start)
  }

  document.getElementById('gradients').onclick = () => {

    const start = performance.now();

    createGradientsOnly()

    const end = performance.now();

    showLog('RadialGradientの生成のみ実行', end - start)
  }

  particles = generateParticles()
  drawParticles()
}

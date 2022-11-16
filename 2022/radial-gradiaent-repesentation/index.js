
class RadialGradientCircle {
  x = 0.0
  y = 0.0
  radius = 0.0
  alpha = 1.0
  removed = false
}

window.onload = () => {

  const canvas = document.getElementById('canvas')
  canvas.width = 400
  canvas.height = 400
  const ctx = canvas.getContext('2d')

  function createSubdividedCircles(source_circle, circlerDivision, levelDivision, center_alpha, outer_alpha) {

    const partingRate = 0.5
    const partingOverlappingRate = 0.0
    const centerPaddingRate = 0.0
    const x = source_circle.x
    const y = source_circle.y
    const radius = source_circle.radius
    const alpha = source_circle.alpha

    const center_circle = new RadialGradientCircle()
    center_circle.x = x
    center_circle.y = y
    center_circle.radius = radius * (partingRate + partingOverlappingRate)
    center_circle.alpha = alpha / circlerDivision * center_alpha

    const outer_circles = []
    for (let index = 0; index < circlerDivision; index++) {

      const angle = Math.PI * 2 / circlerDivision * index

      const positionRate = partingRate + centerPaddingRate - partingOverlappingRate
      const outer_circle = new RadialGradientCircle()
      outer_circle.x = x + Math.cos(angle) * radius * positionRate
      outer_circle.y = y - Math.sin(angle) * radius * positionRate
      outer_circle.radius = radius * (1.0 - positionRate)
      outer_circle.alpha = alpha / circlerDivision * outer_alpha

      outer_circles.push(outer_circle)
    }

    return [center_circle, ...outer_circles]
  }

  function getLineLocalLocation(x, y, line) {
    
    const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1)

    const relative_x = x - line.x1
    const relative_y = y - line.y1

    const local_x = Math.cos(-angle) * relative_x - Math.sin(-angle) * relative_y
    const local_y = Math.sin(-angle) * relative_x + Math.cos(-angle) * relative_y

    return { x: local_x, y: -local_y }
  }

  function createCutoutedCircles(source_circle, cutout_line, circlerDivision, levelDivision, center_alpha, outer_alpha) {

    const subdivided_circles1 = createSubdividedCircles(source_circle, circlerDivision, levelDivision, center_alpha, outer_alpha)
    const result = []

    const padding_rate = 0.95

    for (const [index, circle] of subdivided_circles1.entries()) {

      const local_location = getLineLocalLocation(circle.x, circle.y, cutout_line)
      
      if (local_location.y - circle.radius > 0.0) {

        // console.log(`circle[${index}] (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}),${circle.radius.toFixed(2)} -> ${local_location.x.toFixed(2)}, ${local_location.y.toFixed(2)}`)
        circle.removed = true
        continue
      }
      
      if (circle.radius <= 5.0) {

        result.push(circle)
        continue
      }

      // 線の外側（線の進行方向に向かって左側）に位置する円を対象とする
      if (local_location.y + circle.radius * padding_rate > 0.0) {

        // console.log(`circle[${index}] (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}),${circle.radius.toFixed(2)} -> ${local_location.x.toFixed(2)}, ${local_location.y.toFixed(2)}`)

        const subdivided_circles2 = createCutoutedCircles(circle, cutout_line, circlerDivision, levelDivision, center_alpha, outer_alpha)
        Array.prototype.push.apply(result, subdivided_circles2)

        circle.removed = true
      }
      else {

        result.push(circle)
      }
    }

    return result
  }

  function drawGradientCircle(x, y, radius, color1, color2) {

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0.0, color1);
    gradient.addColorStop(1.0, color2);

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawGradientCircles(circles, rgb_color) {

    for (const circle of circles) {

      if (circle.removed) {
        continue
      }

      drawGradientCircle(circle.x, circle.y, circle.radius, `rgba(${rgb_color}, ${circle.alpha})`, `rgba(${rgb_color}, 0.0)`)
    }
  }

  function drawCircle(circle, rgb_color) {

    ctx.strokeStyle = `rgb(${rgb_color})`
    ctx.beginPath()
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawLine(line, rgb_color) {

    ctx.strokeStyle = `rgb(${rgb_color})`
    ctx.beginPath()
    ctx.moveTo(line.x1, line.y1)
    ctx.lineTo(line.x2, line.y2)
    ctx.stroke()
  }

  function getRangeValue(id, division) {

    return Number(document.getElementById(id).value) / division
  }

  function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const levelDivision = 2
    const circlerDivision = getRangeValue('circler-division', 1)
    const center_alpha = getRangeValue('center-alpha', 100)
    const outer_alpha = getRangeValue('outer-alpha', 100)

    const color = '255, 0, 0'

    const sample_circle = new RadialGradientCircle()
    sample_circle.x = 120
    sample_circle.y = 100
    sample_circle.radius = 80
    sample_circle.alpha = 1.0
  
    drawGradientCircles([sample_circle], color)
  
    const target_circle = new RadialGradientCircle()
    target_circle.x = 280
    target_circle.y = 100
    target_circle.radius = sample_circle.radius
    target_circle.alpha = sample_circle.alpha
  
    const subdivided_circles1 = createSubdividedCircles(target_circle, circlerDivision, levelDivision, center_alpha, outer_alpha)
  
    const target_circle2 = subdivided_circles1[6]
    target_circle2,removed = true
  
    const subdivided_circles2 = createSubdividedCircles(target_circle2, circlerDivision, levelDivision, center_alpha, outer_alpha)

    drawGradientCircles(subdivided_circles1, color)
    drawGradientCircles(subdivided_circles2, color)

    const cutout_circle = new RadialGradientCircle()
    cutout_circle.x = 200
    cutout_circle.y = 280
    cutout_circle.radius = 80
    cutout_circle.alpha = 0.8
    drawCircle(cutout_circle, '200, 200, 200')

    const cutout_line = {
      x1: 90,
      y1: 320,
      x2: 260,
      y2: 180,
    }

    drawLine(cutout_line, '255, 255, 255')

    const cutouted_circles = createCutoutedCircles(cutout_circle, cutout_line, circlerDivision, levelDivision, center_alpha, outer_alpha)
    drawGradientCircles(cutouted_circles, color)

    console.log(`result cirlces ${cutouted_circles.length}`)

    showPrameterText()
  }

  function setText(id, text) {

    document.getElementById(id).innerHTML = text
  }

  function showPrameterText() {

    setText('circler-division-text', getRangeValue('circler-division', 1))
    setText('center-alpha-text', getRangeValue('center-alpha', 100))
    setText('outer-alpha-text', getRangeValue('outer-alpha', 100))
  }

  document.getElementById('circler-division').onchange = () => {
    draw()
  }

  document.getElementById('center-alpha').onchange = () => {
    draw()
  }

  document.getElementById('outer-alpha').onchange = () => {
    draw()
  }

  draw()
}

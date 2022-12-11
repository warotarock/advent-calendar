
class RadialGradientCircle {
  x = 0.0
  y = 0.0
  radius = 0.0
  alpha = 1.0
  removed = false
}

window.onload = () => {

  function createSubdividedCircles(source_circle, circlerDivision, levelDivision, center_alpha, outer_alpha) {

    const partingRate = 1.0 / (levelDivision + 1)
    const partingOverlappingRate = 0.1
    const x = source_circle.x
    const y = source_circle.y
    const radius = source_circle.radius
    const alpha = source_circle.alpha

    const center_circle = new RadialGradientCircle()
    center_circle.x = x
    center_circle.y = y
    center_circle.radius = radius * (partingRate + partingOverlappingRate)
    center_circle.alpha = alpha * center_alpha

    let currentCirclerDivision = circlerDivision
    let angleOffset = 0

    const outer_circles = []

    for (let level = 0; level < levelDivision; level++) {

      for (let circlerIndex = 0; circlerIndex < currentCirclerDivision; circlerIndex++) {
  
        const angle = Math.PI * 2 / currentCirclerDivision * (circlerIndex + 0.5 * angleOffset)
        const positionRate = partingRate * (levelDivision - level) - partingOverlappingRate
        const alphaRate = (1.0 - positionRate / 2) / currentCirclerDivision

        const outer_circle = new RadialGradientCircle()
        outer_circle.x = x + Math.cos(angle) * radius * positionRate
        outer_circle.y = y - Math.sin(angle) * radius * positionRate
        outer_circle.radius = radius * (partingRate + partingOverlappingRate)
        outer_circle.alpha = alpha * alphaRate * outer_alpha
  
        outer_circles.push(outer_circle)
      }

      currentCirclerDivision = Math.floor(currentCirclerDivision / 2)
      angleOffset = (angleOffset == 0 ? 1 : 0)
    }

    return [center_circle, ...outer_circles]
  }

  function createCutoutedCircles(source_circle, cutout_line, minRadius, circlerDivision, levelDivision, center_alpha, outer_alpha) {

    const subdivided_circles1 = createSubdividedCircles(source_circle, circlerDivision, levelDivision, center_alpha, outer_alpha)
    const result = []

    const remove_padding_rate = 0.20
    const divide_padding_rate = 0.95

    for (const circle of subdivided_circles1) {

      const local_location = getLineLocalLocation(circle.x, circle.y, cutout_line)
      
      if (local_location.y - circle.radius * remove_padding_rate > 0.0) {

        // console.log(`circle[${index}] (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}),${circle.radius.toFixed(2)} -> ${local_location.x.toFixed(2)}, ${local_location.y.toFixed(2)}`)
        circle.removed = true
        continue
      }
      
      if (circle.radius <= minRadius) {

        result.push(circle)
        continue
      }

      // 線の外側（線の進行方向に向かって左側）に位置する円を再分割する
      if (local_location.y + circle.radius * divide_padding_rate > 0.0) {

        // console.log(`circle[${index}] (${circle.x.toFixed(2)}, ${circle.y.toFixed(2)}),${circle.radius.toFixed(2)} -> ${local_location.x.toFixed(2)}, ${local_location.y.toFixed(2)}`)

        const subdivided_circles2 = createCutoutedCircles(circle, cutout_line, minRadius, circlerDivision, levelDivision, center_alpha, outer_alpha)
        Array.prototype.push.apply(result, subdivided_circles2)

        circle.removed = true
      }
      else {

        result.push(circle)
      }
    }

    return result
  }

  function getLineLocalLocation(x, y, line) {
    
    const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1)

    const relative_x = x - line.x1
    const relative_y = y - line.y1

    const local_x = Math.cos(-angle) * relative_x - Math.sin(-angle) * relative_y
    const local_y = Math.sin(-angle) * relative_x + Math.cos(-angle) * relative_y

    return { x: local_x, y: -local_y }
  }

  function drawGradientCircles(circles, rgb_color, ctx) {

    const gradient = ctx.createRadialGradient(
      0.0, 
      0.0,
      0.0,
      0.0,
      0.0, 
      1.0,
    )
    gradient.addColorStop(0.4, `rgba(${rgb_color}, 1.0)`)
    gradient.addColorStop(1.0, `rgba(${rgb_color}, 0.0)`)

    ctx.fillStyle = gradient

    for (const circle of circles) {

      if (circle.removed) {
        continue
      }

      ctx.setTransform(
        circle.radius, 0.0,
        0.0, circle.radius,
        circle.x, circle.y
      )

      ctx.globalAlpha = circle.alpha

      ctx.fillRect(-1.0, -1.0, 2.0, 2.0)
    }

    ctx.globalAlpha = 1.0

    ctx.setTransform(
      1.0, 0.0,
      0.0, 1.0,
      0.0, 0.0
    )
  }

  function drawCircle(circle, rgb_color, ctx) {

    ctx.strokeStyle = `rgba(${rgb_color})`
    ctx.beginPath()
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawCircles(circles, rgb_color, ctx) {

    for (const circle of circles) {

      if (circle.removed) {
        continue
      }

      drawCircle(circle, rgb_color, ctx)
    }
  }

  function drawLine(line, rgb_color, ctx) {

    ctx.strokeStyle = `rgb(${rgb_color})`
    ctx.beginPath()
    ctx.moveTo(line.x1, line.y1)
    ctx.lineTo(line.x2, line.y2)
    ctx.stroke()
  }

  function getRangeValue(id, division) {

    return Number(document.getElementById(id).value) / division
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

  function setRadioButtonEvent(name, callback) {

    document.getElementsByName(name).forEach(button => {

      button.onclick = callback
    })
  }

  function setText(id, text) {

    document.getElementById(id).innerHTML = text
  }

  const _canvas = document.getElementById('canvas')
  _canvas.width = 400
  _canvas.height = 400
  const _ctx = _canvas.getContext('2d')

  const _cutout_line = {
    x1: 50,
    y1: 280,
    x2: 350,
    y2: 200
  }

  function draw(canvas, ctx) {

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const levelDivision = 2
    const circlerDivision = getRangeValue('circler-division', 1)
    const center_alpha = getRangeValue('center-alpha', 100)
    const outer_alpha = getRangeValue('outer-alpha', 100)
    const minRadius = getRangeValue('min-radius', 1)
    const circleLinesEnagled = (getRadioButtonValue('circle-lines') == 1)

    const color = '255, 0, 0'

    const sample_circle = new RadialGradientCircle()
    sample_circle.x = 115
    sample_circle.y = 100
    sample_circle.radius = 80
    sample_circle.alpha = 1.0
  
    drawCircle(sample_circle, '200, 200, 200, 0.5', ctx)
    drawGradientCircles([sample_circle], color, ctx)
  
    const target_circle = new RadialGradientCircle()
    target_circle.x = 285
    target_circle.y = 100
    target_circle.radius = sample_circle.radius
    target_circle.alpha = sample_circle.alpha
  
    const subdivided_circles = createSubdividedCircles(target_circle, circlerDivision, levelDivision, center_alpha, outer_alpha)

    drawCircle(target_circle, '200, 200, 200, 0.5', ctx)
    drawGradientCircles(subdivided_circles, color, ctx)

    if (circleLinesEnagled) {
      drawCircles(subdivided_circles, '200, 200, 200, 0.5', ctx)
    }

    const cutout_circle = new RadialGradientCircle()
    cutout_circle.x = 200
    cutout_circle.y = 280
    cutout_circle.radius = 80
    cutout_circle.alpha = 0.8

    const cutouted_circles = createCutoutedCircles(cutout_circle, _cutout_line, minRadius, circlerDivision, levelDivision, center_alpha, outer_alpha)

    drawLine(_cutout_line, '255, 255, 255', ctx)
    drawCircle(cutout_circle, '200, 200, 200, 0.5', ctx)
    drawGradientCircles(cutouted_circles, color, ctx)

    if (circleLinesEnagled) {
      drawCircles(cutouted_circles, '200, 200, 200, 0.2', ctx)
    }

    showPrameterText(cutouted_circles.length)
  }

  function showPrameterText(circle_count) {

    setText('circler-division-text', getRangeValue('circler-division', 1))
    setText('center-alpha-text', getRangeValue('center-alpha', 100))
    setText('outer-alpha-text', getRangeValue('outer-alpha', 100))
    setText('min-radius-text', getRangeValue('min-radius', 1))
    setText('log', `円の数: ${circle_count}`)
  }

  const drawOnChange = () => {
    draw(_canvas, _ctx)
  }

  document.getElementById('circler-division').onchange = drawOnChange
  document.getElementById('center-alpha').onchange = drawOnChange
  document.getElementById('outer-alpha').onchange = drawOnChange
  document.getElementById('min-radius').onchange = drawOnChange

  setRadioButtonEvent('circle-lines', drawOnChange)

  const pointer_event = (e) => {

    if (e.buttons != 0) {

      if (e.buttons == 1) {

        _cutout_line.x2 = e.offsetX / 2
        _cutout_line.y2 = e.offsetY / 2
      }

      draw(_canvas, _ctx)
    }

    e.preventDefault()
  }

  canvas.onpointerdown = pointer_event
  canvas.onpointermove = pointer_event
  canvas.oncontextmenu  = (e) => { e.preventDefault() }

  draw(_canvas, _ctx)
}

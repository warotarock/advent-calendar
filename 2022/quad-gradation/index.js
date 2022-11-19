
window.onload = () => {

  const canvas = document.getElementById('canvas')
  canvas.width = 400
  canvas.height = 400

  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const pixelBytes = 4
  const lineBytes = canvas.width * pixelBytes

  const input_circle = { x: 0, y: 0, radius: 5 }
  const input_line1 = { x1: 110, y1: 130, x2: 300, y2: 100 }
  const input_line2 = { x1: 80, y1: 200, x2: 240, y2: 300 }
  const input_line3 = { x1: input_line1.x1, y1: input_line1.y1, x2: input_line2.x1, y2: input_line2.y1 }
  const input_line4 = { x1: input_line1.x2, y1: input_line1.y2, x2: input_line2.x2, y2: input_line2.y2 }
  const square_colors = [
    [1.0, 0.0, 0.0],
    [1.0, 0.0, 1.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
  ]
  const draw_color1 = [0.0, 0.0, 0.0]
  const draw_color2 = [0.0, 0.0, 0.0]
  const draw_color3 = [0.0, 0.0, 0.0]

  let input_x = 200
  let input_y = 200

  function getLineParameter(line) {

    const xa = line.x2 - line.x1
    const ya = line.y2 - line.y1

    const xb = line.x1
    const yb = line.y1

    const minX = Math.min(line.x1, line.x2)
    const minY = Math.min(line.y1, line.y2)
    const maxX = Math.max(line.x1, line.x2)
    const maxY = Math.max(line.y1, line.y2)

    return {
      xa, xb, ya, yb,
      minX, minY, maxX, maxY
    }
  }

  function calclateQuadInterpolation(line1_param, line2_param, src_x, src_y, isHorizontal) {

    // t = 0.0～1.0 によって決まる線分上の点を、二つの線分それぞれで(x1, y1)と(x2, y2)とする。
    // その二つの点を結ぶ線が点(x, y)を通るとする。
    // すると、
    // x1 = xa1 * t + xb1
    // y1 = ya1 * t + yb1
    // x2 = xa2 * t + xb2
    // y2 = ya2 * t + yb2
    // y = (y2 - y1) / (x2 - x1) * (x - x1) + y1
    // であるから、x1、y1、x2、y2を式に代入すると次の式が得られる。
    // y = (ya2 * t + yb2 - (ya1 * t + yb1)) / (xa2 * t + xb2 - (xa1 * t + xb1)) * (x - (xa1 * t + xb1)) + ya1 * t + yb1
    // これを数式ツールに適当にかけて得られた二次方程式の解を計算。
    const x = isHorizontal ? src_x : src_y
    const y = isHorizontal ? src_y : src_x
    const a = isHorizontal ? line1_param.xa : line1_param.ya
    const b = isHorizontal ? line1_param.xb : line1_param.yb
    const c = isHorizontal ? line2_param.xa : line2_param.ya
    const d = isHorizontal ? line2_param.xb : line2_param.yb
    const e = isHorizontal ? line1_param.ya : line1_param.xa
    const f = isHorizontal ? line1_param.yb : line1_param.xb
    const g = isHorizontal ? line2_param.ya : line2_param.xa
    const h = isHorizontal ? line2_param.yb : line2_param.xb
    const pa = (e * (c - a) - a * (g - e))
    const pb = (-(-x + b) * (g - e) + (f - y) * (c - a) - a * (h - f) + e * (d - b))
    const pc = (f - y) * (d - b) - (-x + b) * (h - f)

    const discriminant = pb * pb - 4 * pa * pc

    if (discriminant >= 0.0 && pa != 0.0) {

      return (-pb - Math.sqrt(discriminant)) / (2 * pa)
    }
    else if (pa == 0.0 && pb != 0.0) {

      return -pc / pb
    }
    else {

      return -1
    }
  }

  function drawQuadGradation(line1_param, line2_param, line3_param, line4_param, color1, color2, color3, color4) {

    const minX = Math.min(line1_param.minX, line2_param.minX, line3_param.minX, line4_param.minX)
    const minY = Math.min(line1_param.minY, line2_param.minY, line3_param.minY, line4_param.minY)
    const maxX = Math.max(line1_param.maxX, line2_param.maxX, line3_param.maxX, line4_param.maxX)
    const maxY = Math.max(line1_param.maxY, line2_param.maxY, line3_param.maxY, line4_param.maxY)

    const pixData = imageData.data

    for (let y = minY; y <= maxY; y++) {

      const offsetY = y * lineBytes

      for (let x = minX; x <= maxX; x++) {

        const local_x = calclateQuadInterpolation(line1_param, line2_param, x, y, true)
        const local_y = calclateQuadInterpolation(line3_param, line4_param, x, y, false)

        if (local_x >= 0.0 && local_x <= 1.0 && local_y >= 0.0 && local_y <= 1.0) {

          interpolateRGB(draw_color1, color1, color2, local_x)
          interpolateRGB(draw_color2, color3, color4, local_x)
          interpolateRGB(draw_color3, draw_color1, draw_color2, local_y)

          const offset = offsetY + x * pixelBytes

          pixData[offset] = draw_color3[0] * 255
          pixData[offset + 1] = draw_color3[1] * 255
          pixData[offset + 2] = draw_color3[2] * 255
          pixData[offset + 3] = 255
        }
      }
    }
  }

  function interpolateRGB(result, color1, color2, rate) {

    for (let index = 0; index < 3; index++) {

      result[index] = color1[index] * (1.0 - rate) + color2[index] * rate
    }
  }

  function drawCircle(circle, rgb_color) {

    ctx.strokeStyle = `rgba(${rgb_color})`
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

  function clearImageData(data) {

    for (let index = 0; index < data.length; index++) {
      data[index] = 0
    }
  }

  function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    clearImageData(imageData.data)

    const line1_param = getLineParameter(input_line1)
    const line2_param = getLineParameter(input_line2)
    const line3_param = getLineParameter(input_line3)
    const line4_param = getLineParameter(input_line4)

    drawQuadGradation(
      line1_param,
      line2_param,
      line3_param,
      line4_param,
      square_colors[0],
      square_colors[1],
      square_colors[2],
      square_colors[3]
    )

    ctx.putImageData(imageData, 0, 0)

    const local_x = calclateQuadInterpolation(line1_param, line2_param, input_x, input_y, true)
    const local_y = calclateQuadInterpolation(line3_param, line4_param, input_x, input_y, false)

    drawLine(input_line1, '200, 100, 100, 1.0')
    drawLine(input_line2, '200, 100, 100, 1.0')
    drawLine(input_line3, '100, 100, 200, 1.0')
    drawLine(input_line4, '100, 100, 200, 1.0')

    input_circle.x = input_x
    input_circle.y = input_y
    drawCircle(input_circle, '100, 100, 255, 1.0')

    showPrameterText(input_x, input_y, local_x, local_y)
  }

  function setText(id, text) {

    document.getElementById(id).innerHTML = text
  }

  function showPrameterText(x, y, lx, ly) {

    setText('input-text', `(${x.toFixed(1)}, ${y.toFixed(1)})`)
    setText('result-text', `(${lx.toFixed(3)}, ${ly.toFixed(3)})`)
  }

  const pointer_event = (e) => {

    if (e.buttons != 0) {

      if (e.buttons == 1) {

        input_x = e.offsetX / 2
        input_y = e.offsetY / 2
      }

      if (e.buttons == 2) {

        input_line1.x1 = Math.floor(e.offsetX / 2)
        input_line1.y1 = Math.floor(e.offsetY / 2)
        input_line3.x1 = input_line1.x1
        input_line3.y1 = input_line1.y1
      }

      draw()
    }

    e.preventDefault()
  }

  canvas.onpointerdown = pointer_event
  canvas.onpointermove = pointer_event
  canvas.oncontextmenu  = (e) => { e.preventDefault() }

  draw()
}


window.onload = () => {

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

    // t = 0.0～1.0 によって決まる二つの線分上の点を、それぞれ(x1, y1)と(x2, y2)とする。
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

  function drawQuadGradient(imageData, line1_param, line2_param, line3_param, line4_param, color1, color2, color3, color4) {

    const minX = Math.floor(Math.min(line1_param.minX, line2_param.minX, line3_param.minX, line4_param.minX))
    const minY = Math.floor(Math.min(line1_param.minY, line2_param.minY, line3_param.minY, line4_param.minY))
    const maxX = Math.floor(Math.max(line1_param.maxX, line2_param.maxX, line3_param.maxX, line4_param.maxX))
    const maxY = Math.floor(Math.max(line1_param.maxY, line2_param.maxY, line3_param.maxY, line4_param.maxY))

    const pixData = imageData.data
    const pixelBytes = 4
    const lineBytes = _canvas.width * pixelBytes

    const draw_color1 = [0.0, 0.0, 0.0]
    const draw_color2 = [0.0, 0.0, 0.0]
    const draw_color3 = [0.0, 0.0, 0.0]

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

  function drawCircle(circle, rgb_color, ctx) {

    ctx.strokeStyle = `rgba(${rgb_color})`
    ctx.beginPath()
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawLine(line, rgb_color, ctx) {

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

  function setText(id, text) {

    document.getElementById(id).innerHTML = text
  }

  function showPrameterText(x, y, lx, ly) {

    setText('input-text', `(${x.toFixed(1)}, ${y.toFixed(1)})`)
    setText('result-text', `(${lx.toFixed(3)}, ${ly.toFixed(3)})`)
  }

  const _canvas = document.getElementById('canvas')
  _canvas.width = 400
  _canvas.height = 400

  const _ctx = _canvas.getContext('2d')
  const _imageData = _ctx.createImageData(_canvas.width, _canvas.height)

  const _input_circle = { x: 0, y: 0, radius: 5 }
  const _input_line1 = { x1: 110, y1: 130, x2: 300, y2: 100 }
  const _input_line2 = { x1: 80, y1: 200, x2: 240, y2: 300 }
  const _input_line3 = { x1: _input_line1.x1, y1: _input_line1.y1, x2: _input_line2.x1, y2: _input_line2.y1 }
  const _input_line4 = { x1: _input_line1.x2, y1: _input_line1.y2, x2: _input_line2.x2, y2: _input_line2.y2 }
  const _square_colors = [
    [1.0, 0.0, 0.0],
    [1.0, 0.0, 1.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
  ]

  let _input_x = 200
  let _input_y = 200

  function draw() {

    _ctx.clearRect(0, 0, _canvas.width, _canvas.height)

    clearImageData(_imageData.data)

    const line1_param = getLineParameter(_input_line1)
    const line2_param = getLineParameter(_input_line2)
    const line3_param = getLineParameter(_input_line3)
    const line4_param = getLineParameter(_input_line4)

    drawQuadGradient(
      _imageData,
      line1_param,
      line2_param,
      line3_param,
      line4_param,
      _square_colors[0],
      _square_colors[1],
      _square_colors[2],
      _square_colors[3]
    )

    _ctx.putImageData(_imageData, 0, 0)

    const local_x = calclateQuadInterpolation(line1_param, line2_param, _input_x, _input_y, true)
    const local_y = calclateQuadInterpolation(line3_param, line4_param, _input_x, _input_y, false)

    drawLine(_input_line1, '200, 100, 100, 1.0', _ctx)
    drawLine(_input_line2, '200, 100, 100, 1.0', _ctx)
    drawLine(_input_line3, '100, 100, 200, 1.0', _ctx)
    drawLine(_input_line4, '100, 100, 200, 1.0', _ctx)

    _input_circle.x = _input_x
    _input_circle.y = _input_y
    drawCircle(_input_circle, '100, 100, 255, 1.0', _ctx)

    showPrameterText(_input_x, _input_y, local_x, local_y)
  }

  const pointer_event = (e) => {

    if (e.buttons != 0) {

      if (e.buttons == 1) {

        _input_x = e.offsetX
        _input_y = e.offsetY
      }

      if (e.buttons == 2) {

        _input_line1.x1 = e.offsetX
        _input_line1.y1 = e.offsetY
        _input_line3.x1 = _input_line1.x1
        _input_line3.y1 = _input_line1.y1
      }

      draw()
    }

    e.preventDefault()
  }

  _canvas.onpointerdown = pointer_event
  _canvas.onpointermove = pointer_event
  _canvas.oncontextmenu  = (e) => { e.preventDefault() }

  draw(_imageData, _canvas, _ctx)
}


class LineParameter {
  
  xa = 0.0
  xb = 0.0
  ya = 0.0
  yb = 0.0
  minX = 0.0
  minY = 0.0
  maxX = 0.0
  maxY = 0.0
}

window.onload = () => {

  const canvas = document.getElementById('canvas')
  canvas.width = 400
  canvas.height = 400

  const ctx = canvas.getContext('2d', { antiAliasingEnabled: false })
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const pixelBytes = 4
  const lineBytes = canvas.width * pixelBytes

  const draw_color1 = [0.0, 0.0, 0.0]
  const draw_color2 = [0.0, 0.0, 0.0]
  const draw_color3 = [0.0, 0.0, 0.0]

  let input_x = 200
  let input_y = 200

  const gridLeft = 50
  const gridTop = 50
  const gridSizeH = 20
  const gridSizeV = 20
  const gridCellSize = 15
  const gridData = createGridData(gridLeft, gridTop, gridSizeH, gridSizeV, gridCellSize)

  function createGridData(left, top, gridWidth, girdHeight, cellSize) {

    const grid_rows = []

    for (let y = 0; y <= girdHeight; y++) {
      
      const row_points = []

      for (let x = 0; x <= gridWidth; x++) {

        row_points.push({
          x: left + x * cellSize,
          y: top + y * cellSize,
          color: [Math.random(), Math.random(), Math.random()],
          rightPoint: null,
          belowPoint: null,
          diagonalPoint: null,
          isDrawable: false,
          line1: new LineParameter(),
          line2: new LineParameter(),
          line3: new LineParameter(),
          line4: new LineParameter(),
        })
      }

      grid_rows.push(row_points)
    }

    for (let y = 0; y < girdHeight; y++) {
      
      for (let x = 0; x < gridWidth; x++) {

        const point = grid_rows[y][x]

        point.isDrawable = true
        point.rightPoint = grid_rows[y][x + 1]
        point.belowPoint = grid_rows[y + 1][x]
        point.diagonalPoint = grid_rows[y + 1][x + 1]
      }
    }

    return grid_rows
  }

  function calclateLineParameter(line_param, point1, point2) {

    line_param.xa = point2.x - point1.x
    line_param.ya = point2.y - point1.y

    line_param.xb = point1.x
    line_param.yb = point1.y

    line_param.minX = Math.min(point1.x, point2.x)
    line_param.minY = Math.min(point1.y, point2.y)
    line_param.maxX = Math.max(point1.x, point2.x)
    line_param.maxY = Math.max(point1.y, point2.y)
  }

  function calclatePointLineParameter(point) {

    calclateLineParameter(point.line1, point, point.rightPoint)
    calclateLineParameter(point.line2, point.belowPoint, point.diagonalPoint)
    calclateLineParameter(point.line3, point, point.belowPoint)
    calclateLineParameter(point.line4, point.rightPoint, point.diagonalPoint)
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

  function clearImageData(data) {

    for (let index = 0; index < data.length; index++) {
      data[index] = 0
    }
  }

  function setRadialGradation(gridRows, centerX, centerY, radius, waveEnabled) {

    for (const gridRow of gridRows) {

      for (const gridPoint of gridRow) {

        const dx = gridPoint.x - centerX
        const dy = gridPoint.y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        let value = Math.min(Math.max((radius - distance) / radius, 0.0), 1.0)

        if (waveEnabled) {

          value *= (Math.cos(distance / 8.0) + 1.0) * 0.5
        }
        
        gridPoint.color[0] = value
        gridPoint.color[1] = 0.0
        gridPoint.color[2] = 0.0
      }
    }
  }

  function drawGridGradation() {

    for (const gridRow of gridData) {

      for (const gridPoint of gridRow) {

        if (!gridPoint.isDrawable) {
          continue
        }

        calclatePointLineParameter(gridPoint)

        drawQuadGradation(
          gridPoint.line1,
          gridPoint.line2,
          gridPoint.line3,
          gridPoint.line4,
          gridPoint.color,
          gridPoint.rightPoint.color,
          gridPoint.belowPoint.color,
          gridPoint.diagonalPoint.color
        )
      }
    }
  }

  function drawLine(x1, y1, x2, y2, rgb_color) {

    ctx.strokeStyle = `rgb(${rgb_color})`
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  function drawGridLine() {

    const lineColor = '255, 255, 255, 0.3'
    for (const gridRow of gridData) {

      for (const gridPoint of gridRow) {

        if (!gridPoint.isDrawable) {
          continue
        }

        drawLine(gridPoint.x - 1, gridPoint.y, gridPoint.rightPoint.x - 1, gridPoint.rightPoint.y, lineColor)
        drawLine(gridPoint.x, gridPoint.y + 1, gridPoint.belowPoint.x, gridPoint.belowPoint.y - 1, lineColor)
      }
    }
  }

  function draw() {

    const input_radius = getRangeValue('circle-radius', 1)
    const showGrid = getRadioButtonValue('show-grid')
    const waveEnabled = getRadioButtonValue('wave')

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    clearImageData(imageData.data)

    setRadialGradation(gridData, input_x, input_y, input_radius, waveEnabled == 1)

    drawGridGradation()

    ctx.putImageData(imageData, 0, 0)

    if (showGrid == 1) {

      drawGridLine()
    }

    showPrameterText(input_x, input_y, input_radius)
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

  function showPrameterText(x, y, circleRadius) {

    setText('input-text', `(${x.toFixed(1)}, ${y.toFixed(1)})`)
    setText('circle-radius-text', `${circleRadius.toFixed(1)}`)
  }

  const pointer_event = (e) => {

    if (e.buttons != 0) {

      if (e.buttons == 1) {

        input_x = e.offsetX / 2
        input_y = e.offsetY / 2
      }

      draw()
    }

    e.preventDefault()
  }

  canvas.onpointerdown = pointer_event
  canvas.onpointermove = pointer_event
  canvas.oncontextmenu  = (e) => { e.preventDefault() }

  document.getElementById('circle-radius').onchange = () => {
    draw()
  }

  setRadioButtonEvent('show-grid', () => { draw() })
  setRadioButtonEvent('wave', () => { draw() })

  draw()
}

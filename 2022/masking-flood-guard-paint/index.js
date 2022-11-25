
window.onload = () => {

  function createSampleStroke(canvas_width, canvas_height, size, division) {

    const padding = 20.0
    const stroke_width = (canvas_width - padding * 2)
    const stroke_height = (canvas_height - padding * 2) * size
    const center_y = canvas_height / 2
    const unitWidth = stroke_width / division
    
    const points = []

    for (let x = 0.0; x < stroke_width; x += unitWidth) {

      const angle = (x - padding) / Math.PI / 10.0
      const y = center_y + Math.cos(angle) * stroke_height / 2

      const point = {
        location: [padding + x, y],
        length: 0.0,
        invMat3: [
          0.0, 0.0, 0.0,
          0.0, 0.0, 0.0,
          0.0, 0.0, 0.0
        ]
      }

      points.push(point)
    }

    return {
      points: points,
      minX: 0.0,
      minY: 0.0,
      maxX: 0.0,
      maxY: 0.0
    }
  }
  
  function calclateStrokeParameters(stroke, canvas_width, canvas_height) {

    for (let index = 0; index < stroke.points.length - 1; index++) {

      const from_point = stroke.points[index]
      const to_point = stroke.points[index + 1]

      const dx = to_point.location[0] - from_point.location[0]
      const dy = to_point.location[1] - from_point.location[1]
      
      from_point.length = Math.sqrt(dx * dx + dy * dy)

      if (from_point.length > 0) {

        const nx = dx / from_point.length
        const ny = dy / from_point.length

        const angle = Math.atan2(ny, nx)
  
        from_point.invMat3[0] = Math.cos(-angle)
        from_point.invMat3[1] = Math.sin(-angle)
        from_point.invMat3[3] = -Math.sin(-angle)
        from_point.invMat3[4] = Math.cos(-angle)
        from_point.invMat3[6] = -from_point.location[0]
        from_point.invMat3[7] = -from_point.location[1]
      }
    }

    let minX = canvas_width
    let minY = canvas_height
    let maxX = 0.0
    let maxY = 0.0

    for (const point of stroke.points) {

      minX = Math.min(point.location[0], minX)
      minY = Math.min(point.location[1], minY)
      maxX = Math.max(point.location[0], maxX)
      maxY = Math.max(point.location[1], maxY)
    }

    stroke.minX = minX
    stroke.minY = minY
    stroke.maxX = maxX
    stroke.maxY = maxY
  }

  function createMaskData(x, y, width, height) {

    const mask_array = new Uint8Array(width * height)

    return {
      width: width,
      height: height,
      pixelBytes: 1,
      lineBytes: width * 1,
      location: [x, y],
      data: mask_array
    }
  }

  function createImageData(ctx, width, height) {

    const imageData = ctx.createImageData(width, height)

    return {
      width: imageData.width,
      height: imageData.height,
      pixelBytes: 4,
      lineBytes: imageData.width * 4,
      imageData: imageData
    }
  }

  function createDrawingImage(width, height) {

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')

    return {
      canvas: canvas,
      ctx: ctx,
      width: width,
      height: height
    }
  }

  function clearMaskData(maskData) {

    const mask_data = maskData.data

    for (let y = 0; y < maskData.height; y++) {

      let mask_offset = y * maskData.lineBytes

      for (let x = 0; x < maskData.width; x++) {

        mask_data[mask_offset] = 0

        mask_offset += maskData.pixelBytes
      }
    }
  }

  function setMaskImageToImageData(maskImageData, maskData, color) {

    const image_data = maskImageData.imageData.data
    const mask_data = maskData.data

    for (let y = 0; y < maskData.height; y++) {

      let iamge_offset = y * maskImageData.lineBytes
      let mask_offset = y * maskData.lineBytes

      for (let x = 0; x < maskData.width; x++) {

        if (mask_data[mask_offset] != 0) {

          image_data[iamge_offset] = color[0]
          image_data[iamge_offset + 1] = color[1]
          image_data[iamge_offset + 2] = color[2]
          image_data[iamge_offset + 3] = color[3]
        }
        else {

          image_data[iamge_offset] = 0
          image_data[iamge_offset + 1] = 0
          image_data[iamge_offset + 2] = 0
          image_data[iamge_offset + 3] = 0
        }

        iamge_offset += maskImageData.pixelBytes
        mask_offset += maskData.pixelBytes
      }
    }
  }

  function createOcclusionMap() {

    return {
      length: 0,
      data: new Float32Array(2000)
    }
  }

  function collectOcclusionMap(occlusionMap, center_location, radius, border_segments) {

    const circlar_samplingLength = Math.floor(radius * 2 * Math.PI)

    if (occlusionMap.data.length < circlar_samplingLength) {

      occlusionMap.data = new Float32Array(circlar_samplingLength)
    }

    const local_location = [0.0, 0.0]
    const local_center = [0.0, 0.0]
    const unit_angle = Math.PI * 2 / circlar_samplingLength

    for (let angleIndex = 0; angleIndex < circlar_samplingLength; angleIndex++) {

      const angle = unit_angle * angleIndex
      const x = center_location[0] + Math.cos(angle) * radius
      const y = center_location[1] - Math.sin(angle) * radius

      occlusionMap.data[angleIndex] = 0.0

      let min_distance = radius
      for (const segement of border_segments) {

        traslateMat3(local_location, x, y, segement.from_point.invMat3)
        traslateMat3(local_center, center_location[0], center_location[1], segement.from_point.invMat3)

        const isUpSide = (local_location[1] > 0 && local_center[1] < 0)
        const isDownSide = (local_location[1] < 0 && local_center[1] > 0)

        if (isUpSide || isDownSide) {

          const dx = local_location[0] - local_center[0]
          const dy = local_location[1] - local_center[1]
          
          const offset_y = -local_center[1]
          const offset_x = dx / dy * offset_y
          const crossing_x = local_center[0] + offset_x

          if (crossing_x >= 0.0 && crossing_x <= segement.length) {

            const distance = Math.sqrt(offset_x * offset_x + offset_y * offset_y)

            if (distance < min_distance) {

              min_distance = distance
              occlusionMap.data[angleIndex] = distance
            }
          }
        }
      }
    }

    occlusionMap.length = circlar_samplingLength
  }
  
  function setOcclusionMapImageToImageData(occlusionMap_imageData, occlusionMap, radius, color) {

    const image_data = occlusionMap_imageData.imageData.data
    const map_data = occlusionMap.data

    let iamge_offset = 0
    for (let index = 0; index < occlusionMap.length; index++) {

      if (iamge_offset >= image_data.length) {
        break
      }

      const distance = map_data[index]

      if (distance > 0) {

        const rate = 1.0 - distance / radius

        image_data[iamge_offset] = color[0]
        image_data[iamge_offset + 1] = color[1]
        image_data[iamge_offset + 2] = color[2]
        image_data[iamge_offset + 3] = Math.floor(color[3] * rate)
      }
      else {

        image_data[iamge_offset] = 255
        image_data[iamge_offset + 1] = 255
        image_data[iamge_offset + 2] = 255
        image_data[iamge_offset + 3] = 50
      }

      iamge_offset += occlusionMap_imageData.pixelBytes
    }

    while (iamge_offset < image_data.length) {

      image_data[iamge_offset] = 0
      image_data[iamge_offset + 1] = 0
      image_data[iamge_offset + 2] = 0
      image_data[iamge_offset + 3] = 0

      iamge_offset += occlusionMap_imageData.pixelBytes
    }
  }

  function setMaskForBrushShape(maskData, center_location, radius, occlusionMap) {

    const mask_data = maskData.data

    const center_x = center_location[0] - maskData.location[0]
    const center_y = center_location[1] - maskData.location[1]

    const pixel_center_x = Math.floor(center_x)
    const pixel_center_y = Math.floor(center_y)
    const minX = Math.min(Math.max(pixel_center_x - radius, 0), maskData.width - 2)
    const minY = Math.min(Math.max(pixel_center_y - radius, 0), maskData.height - 2)
    const maxX = Math.min(Math.max(pixel_center_x + radius, 0), maskData.width - 2)
    const maxY = Math.min(Math.max(pixel_center_y + radius, 0), maskData.height - 2)

    const pixel_centering_offset = 0.5

    for (let y = minY; y <= maxY; y++) {

      let mask_offset = y * maskData.lineBytes + minX * maskData.pixelBytes

      for (let x = minX; x <= maxX; x++) {

        if (mask_data[mask_offset] != 0) {
          mask_offset += maskData.pixelBytes
          continue
        }

        const dx = x + pixel_centering_offset - center_x
        const dy = y + pixel_centering_offset - center_y
        const distance = Math.sqrt(dx * dx + dy * dy)

        let angle = Math.atan2(-dy, dx)
        if (angle < 0) {
          angle = Math.PI * 2 + angle
        }
        const angleIndex = Math.floor(angle / Math.PI / 2 * occlusionMap.length)

        const occlusion_distance = occlusionMap.data[angleIndex]

        if (distance <= radius && (occlusion_distance == 0 || distance <= occlusion_distance)) {
          mask_data[mask_offset] = 1
        }

        mask_offset += maskData.pixelBytes
      }
    }
  }

  function collectStrokeSegments(stroke, center_location, radius) {

    if (center_location[0] + radius < stroke.minX
      || center_location[1] + radius < stroke.minY
      || center_location[0] - radius > stroke.maxX
      || center_location[1] - radius > stroke.maxY
    ) {
      return []
    }

    const segments = []

    for (let index = 0; index < stroke.points.length - 1; index++) {

      const from_point = stroke.points[index]
      const to_point = stroke.points[index + 1]

      const distance = pointToSegment_SorroundingDistance(
        center_location,
        from_point.location,
        to_point.location
      )

      if (distance <= radius) {

        const segment = {
          from_point: from_point,
          to_point: to_point,
          length: from_point.length
        }
        
        segments.push(segment)
      }
    }

    return segments
  }

  function pointToSegment_SorroundingDistance(point_location, segment_from_location, segment_to_location) {

    const distanceSQ = pointToSegment_SorroundingDistanceSq(
      point_location[0],
      point_location[1],
      segment_from_location[0],
      segment_from_location[1],
      segment_to_location[0],
      segment_to_location[1]
    )

    return Math.sqrt(distanceSQ)
  }

  function pointToSegment_SorroundingDistanceSq(x0, y0, x1, y1, x2, y2) {

    // from: https://zenn.dev/boiledorange73/articles/0037-js-distance-pt-seg

    const a = x2 - x1
    const b = y2 - y1
    const a2 = a * a
    const b2 = b * b
    const r2 = a2 + b2

    if (r2 < 0.000001) {

      return (x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1)
    }

    const tt = -(a * (x1 - x0) + b * (y1 - y0))

    if (tt < 0) {

      return (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)
    }

    if (tt > r2) {

      return (x2 - x0) * (x2 - x0) + (y2 - y0) * (y2 - y0)
    }

    const f1 = a * (y1 - y0) - b * (x1 - x0)

    return (f1 * f1) / r2
  }

  function traslateMat3(result, x, y, mat) {

    const lx = x + mat[6]
    const ly = y + mat[7]

    result[0] = lx * mat[0] + ly * mat[3]
    result[1] = lx * mat[1] + ly * mat[4]
  }

  function drawStroke(ctx, points, rgb_color) {

    if (points.length < 2) {
      return
    }

    const first_point = points[0]

    ctx.strokeStyle = `rgb(${rgb_color})`
    ctx.beginPath()
    ctx.moveTo(first_point.location[0], first_point.location[1])

    for (let index = 1; index < points.length; index++) {

      const point = points[index]
      
      ctx.lineTo(point.location[0], point.location[1])
    }

    ctx.stroke()
  }

  function drawRadialGradient(ctx, x, y, radius, color1, color2) {

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0.0, `rgba(${color1}, 1.0)`);
    gradient.addColorStop(1.0, `rgba(${color2}, 0.0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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

  const canvas = document.getElementById('canvas')
  canvas.width = 400
  canvas.height = 300
  const ctx = canvas.getContext('2d')

  let input_location = [0.0, 0.0]

  const sample_stroke = createSampleStroke(canvas.width, canvas.height, 0.3, 13)
  calclateStrokeParameters(sample_stroke, canvas.width, canvas.height)

  const maskData = createMaskData(0.0, 10.0, canvas.width, canvas.height)
  const mask_imageData = createImageData(ctx, maskData.width, maskData.height)

  const occlusionMap = createOcclusionMap()
  const occlusionMap_imageData = createImageData(ctx, 500, 1)

  const mask_image = createDrawingImage(canvas.width, canvas.height)
  const drawer_image = createDrawingImage(canvas.width, canvas.height)

  function draw(drawBrush) {

    const displayMaskOnly = (getRadioButtonValue('display-type') == 1)
    const input_radius = getRangeValue('circle-radius', 1)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (displayMaskOnly) {
      drawer_image.ctx.clearRect(0, 0, drawer_image.width, drawer_image.height)
    }

    if (drawBrush) {

      const segments = collectStrokeSegments(sample_stroke, input_location, input_radius)

      collectOcclusionMap(occlusionMap, input_location, input_radius, segments)

      if (displayMaskOnly) {
      }

      setMaskForBrushShape(maskData, input_location, input_radius, occlusionMap)

      setMaskImageToImageData(mask_imageData, maskData, [255, 0, 0, 255])

      setOcclusionMapImageToImageData(occlusionMap_imageData, occlusionMap, input_radius, [255, 0, 0, 255])

      if (displayMaskOnly) {

        mask_image.ctx.clearRect(0, 0, mask_image.width, mask_image.height)
      }

      drawer_image.ctx.globalCompositeOperation = 'source-over'
      drawRadialGradient(drawer_image.ctx, input_location[0], input_location[1], input_radius, '0, 255, 0', '0, 255, 0')

      mask_image.ctx.putImageData(mask_imageData.imageData, maskData.location[0], maskData.location[1])
      drawer_image.ctx.globalCompositeOperation = 'destination-in'
      drawer_image.ctx.drawImage(mask_image.canvas, 0, 0, mask_image.width, mask_image.height)
    }

    if (displayMaskOnly) {
      ctx.putImageData(mask_imageData.imageData, maskData.location[0], maskData.location[1])
    }

    ctx.putImageData(occlusionMap_imageData.imageData, 0, 5)

    ctx.drawImage(drawer_image.canvas, 0, 0, drawer_image.width, drawer_image.height)

    drawStroke(ctx, sample_stroke.points, '255, 255, 255')

    showPrameterText(input_radius)
  }

  function showPrameterText(circleRadius) {

    setText('circle-radius-text', `${circleRadius.toFixed(1)}`)
  }

  const pointer_event = (e) => {

    if (e.buttons != 0) {

      input_location[0] = e.offsetX / 2
      input_location[1] = e.offsetY / 2

      draw(canvas, ctx, true, input_location, sample_stroke)
    }

    e.preventDefault()
  }

  canvas.onpointerdown = pointer_event
  canvas.onpointermove = pointer_event
  canvas.oncontextmenu  = (e) => { e.preventDefault() }

  setRadioButtonEvent('display-type', () => { draw(false) })

  document.getElementById('clear').onclick = () => {

    clearMaskData(maskData)
    setMaskImageToImageData(mask_imageData, maskData, [255, 0, 0, 255])

    drawer_image.ctx.clearRect(0, 0, drawer_image.width, drawer_image.height)

    draw(false)
  }

  document.getElementById('circle-radius').onchange = () => {
    draw(false)
  }

  draw(false)
}

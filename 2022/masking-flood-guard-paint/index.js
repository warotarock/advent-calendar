
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
        angle: 0.0,
        mat2d: [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0 ],
        invMat2d: [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0 ]
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

        const angle = atan2Rounded(ny, nx)
  
        from_point.angle = angle
        from_point.mat2d[0] = Math.cos(angle)
        from_point.mat2d[1] = -Math.sin(angle)
        from_point.mat2d[2] = Math.sin(angle)
        from_point.mat2d[3] = Math.cos(angle)
        from_point.mat2d[4] = from_point.location[0]
        from_point.mat2d[5] = from_point.location[1]
        from_point.invMat2d[0] = from_point.mat2d[0]
        from_point.invMat2d[1] = from_point.mat2d[2]
        from_point.invMat2d[2] = from_point.mat2d[1]
        from_point.invMat2d[3] = from_point.mat2d[3]
        from_point.invMat2d[4] = -(from_point.mat2d[4] * from_point.mat2d[0] + from_point.mat2d[5] * from_point.mat2d[1])
        from_point.invMat2d[5] = -(from_point.mat2d[4] * from_point.mat2d[2] + from_point.mat2d[5] * from_point.mat2d[3])
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

    maskData.data.fill(0)
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

    const occlusionMapLength = Math.floor(radius * 2 * Math.PI)
    const occlusionMap_unitAngle = Math.PI * 2 / occlusionMapLength

    if (occlusionMap.data.length < occlusionMapLength) {

      occlusionMap.data = new Float32Array(occlusionMapLength)
    }

    occlusionMap.data.fill(0.0)

    const intersected_segements = []
    const radiusSq = radius * radius
    for (const segment of border_segments) {

      const distanceSq = pointToSegmentSorroundingDistanceSq(
        center_location,
        segment.from_point.location,
        segment.to_point.location,
      )

      if (distanceSq <= radiusSq) {

        intersected_segements.push(segment)
      }
    }

    const local_center = [0.0, 0.0]
    for (const segement of intersected_segements) {

      traslateMat2d(local_center, center_location, segement.from_point.invMat2d)

      if (Math.abs(local_center[1]) >= radius) {
        continue
      }

      const dy = -local_center[1]
      const dx = Math.sqrt(radius * radius - dy * dy)

      let left_intersect_locationX = local_center[0] - dx
      if (left_intersect_locationX < 0.0) {
        left_intersect_locationX = 0.0
      }

      const local_leftSideAngle = atan2Rounded(dy, left_intersect_locationX - local_center[0])
      const world_leftSideAngle = roundAngle(segement.from_point.angle + local_leftSideAngle)

      let right_intersect_locationX = local_center[0] + dx
      if (right_intersect_locationX > segement.length) {
        right_intersect_locationX = segement.length
      }

      const local_rightSideAngle = atan2Rounded(dy, right_intersect_locationX - local_center[0])

      const angleDistance = local_rightSideAngle - local_leftSideAngle
      
      const scanDirection = Math.sign(angleDistance) 
      
      let angleDistanceRouded = Math.abs(angleDistance)
      if (angleDistanceRouded >= Math.PI) {
        angleDistanceRouded -= Math.PI
      }
      
      const max_angleIndexCount = Math.abs(Math.floor(angleDistanceRouded / occlusionMap_unitAngle)) + 1

      const offset_y = -local_center[1]
      const scan_unitAngle = occlusionMap_unitAngle * scanDirection
      let angleIndex = Math.floor(world_leftSideAngle / occlusionMap_unitAngle)
      for (let angleIndexCount = 0; angleIndexCount < max_angleIndexCount; angleIndexCount++) {

        const angle = local_leftSideAngle + angleIndexCount * scan_unitAngle

        // angleで傾きが決まる直線とy=0との交点を計算します。式を整理するとtanを使った式で計算できます。
        // const angle_dx = Math.cos(angle) * radius
        // const angle_dy = -Math.sin(angle) * radius
        // const offset_x = angle_dx / angle_dy * offset_y
        const offset_x = offset_y / Math.tan(angle)

        const distance = Math.sqrt(offset_x * offset_x + offset_y * offset_y)

        const dest_distance = occlusionMap.data[angleIndex]
        if (dest_distance == 0.0 || dest_distance > distance) {

          occlusionMap.data[angleIndex] = distance
        }

        angleIndex += scanDirection
        if (angleIndex >= occlusionMapLength) {
          angleIndex = 0
        }
        else if (angleIndex < 0) {
          angleIndex += occlusionMapLength
        }
      }
    }

    occlusionMap.length = occlusionMapLength
  }

  function pointToSegmentSorroundingDistanceSq(point, segment_point1, segment_point2) {

    // 参考: https://zenn.dev/boiledorange73/articles/0037-js-distance-pt-seg

    const x0 = point[0]
    const y0 = point[1]
    const x1 = segment_point1[0]
    const y1 = segment_point1[1]
    const x2 = segment_point2[0]
    const y2 = segment_point2[1]
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

  function atan2Rounded(y, x) {

    let angle = Math.atan2(-y, x)

    if (angle < 0.0) {
      angle += Math.PI * 2
    }

    return roundAngle(angle)
  }

  function roundAngle(angle) {

    if (angle < 0.0) {
      angle += Math.PI * 2
    }

    if (angle >= Math.PI * 2) {
      angle -= Math.PI * 2
    }

    return angle
  }

  function traslateMat2d(result, target, mat2d) {

    const x = target[0]
    const y = target[1]

    result[0] = x * mat2d[0] + y * mat2d[2] + mat2d[4]
    result[1] = x * mat2d[1] + y * mat2d[3] + mat2d[5]
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

  const _canvas = document.getElementById('canvas')
  _canvas.width = 400
  _canvas.height = 300
  const _ctx = _canvas.getContext('2d')

  let _input_location = [0.0, 0.0]

  const _sample_stroke = createSampleStroke(_canvas.width, _canvas.height, 0.3, 13)
  calclateStrokeParameters(_sample_stroke, _canvas.width, _canvas.height)

  const _maskData = createMaskData(0.0, 10.0, _canvas.width, _canvas.height)
  const _mask_imageData = createImageData(_ctx, _maskData.width, _maskData.height)

  const _occlusionMap = createOcclusionMap()
  const _occlusionMap_imageData = createImageData(_ctx, 500, 1)

  const _mask_image = createDrawingImage(_canvas.width, _canvas.height)
  const _drawer_image = createDrawingImage(_canvas.width, _canvas.height)

  function draw(drawBrush) {

    const displayMaskOnly = (getRadioButtonValue('display-type') == 1)
    const input_radius = getRangeValue('circle-radius', 1)

    _ctx.clearRect(0, 0, _canvas.width, _canvas.height)

    if (displayMaskOnly) {
      _drawer_image.ctx.clearRect(0, 0, _drawer_image.width, _drawer_image.height)
    }

    if (drawBrush) {

      const segments = collectStrokeSegments(_sample_stroke, _input_location, input_radius)

      collectOcclusionMap(_occlusionMap, _input_location, input_radius, segments)

      if (displayMaskOnly) {
      }

      setMaskForBrushShape(_maskData, _input_location, input_radius, _occlusionMap)

      setMaskImageToImageData(_mask_imageData, _maskData, [255, 0, 0, 255])

      setOcclusionMapImageToImageData(_occlusionMap_imageData, _occlusionMap, input_radius, [255, 0, 0, 255])

      if (displayMaskOnly) {

        _mask_image.ctx.clearRect(0, 0, _mask_image.width, _mask_image.height)
      }

      _drawer_image.ctx.globalCompositeOperation = 'source-over'
      drawRadialGradient(_drawer_image.ctx, _input_location[0], _input_location[1], input_radius, '0, 255, 0', '0, 255, 0')

      _mask_image.ctx.putImageData(_mask_imageData.imageData, _maskData.location[0], _maskData.location[1])
      _drawer_image.ctx.globalCompositeOperation = 'destination-in'
      _drawer_image.ctx.drawImage(_mask_image.canvas, 0, 0, _mask_image.width, _mask_image.height)
    }

    if (displayMaskOnly) {
      _ctx.putImageData(_mask_imageData.imageData, _maskData.location[0], _maskData.location[1])
    }

    _ctx.putImageData(_occlusionMap_imageData.imageData, 0, 5)

    _ctx.drawImage(_drawer_image.canvas, 0, 0, _drawer_image.width, _drawer_image.height)

    drawStroke(_ctx, _sample_stroke.points, '255, 255, 255')

    showPrameterText(input_radius)
  }

  function showPrameterText(circleRadius) {

    setText('circle-radius-text', `${circleRadius.toFixed(1)}`)
  }

  const pointer_event = (e) => {

    if (e.buttons != 0) {

      _input_location[0] = e.offsetX / 2
      _input_location[1] = e.offsetY / 2

      draw(_canvas, _ctx, true, _input_location, _sample_stroke)
    }

    e.preventDefault()
  }

  _canvas.onpointerdown = pointer_event
  _canvas.onpointermove = pointer_event
  _canvas.oncontextmenu  = (e) => { e.preventDefault() }

  setRadioButtonEvent('display-type', () => { draw(false) })

  document.getElementById('clear').onclick = () => {

    clearMaskData(_maskData)
    setMaskImageToImageData(_mask_imageData, _maskData, [255, 0, 0, 255])

    _drawer_image.ctx.clearRect(0, 0, _drawer_image.width, _drawer_image.height)

    draw(false)
  }

  document.getElementById('circle-radius').onchange = () => {
    draw(false)
  }

  draw(false)
}


window.onload = () => {

  const canvas = document.getElementById('canvas')
  canvas.width = 400
  canvas.height = 300
  const ctx = canvas.getContext('2d')

  let input_location = [0.0, 0.0]

  const sample_stroke = createSampleStroke(canvas.width, canvas.height, 0.3, 13)
  calclateStrokeParameters(sample_stroke, canvas.width, canvas.height)

  const sample_maskData = createMaskData(0.0, 0.0, canvas.width, canvas.height)
  const sample_mask_imageData = createImageData(sample_maskData.width, sample_maskData.height)

  const sample_occlusionMap = createOcclusionMap()
  const sample_occlusionMap_imageData = createImageData(500, 1)

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

  function createImageData(width, height) {

    const imageData = ctx.createImageData(width, height)

    return {
      width: imageData.width,
      height: imageData.height,
      pixelBytes: 4,
      lineBytes: imageData.width * 4,
      imageData: imageData
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

    const outside_samplingLength = Math.floor(radius * 2 * Math.PI)

    if (occlusionMap.data.length < outside_samplingLength) {

      occlusionMap.data = new Float32Array(outside_samplingLength)
    }

    const local_location = [0.0, 0.0]
    const local_center = [0.0, 0.0]
    const unit_angle = Math.PI * 2 / outside_samplingLength

    for (let angleIndex = 0; angleIndex < outside_samplingLength; angleIndex++) {

      const angle = unit_angle * angleIndex
      const x = center_location[0] + Math.cos(angle) * radius
      const y = center_location[1] - Math.sin(angle) * radius

      occlusionMap.data[angleIndex] = 0.0

      for (const segement of border_segments) {

        traslateMat3(local_location, x, y, segement.from_point.invMat3)
        traslateMat3(local_center, center_location[0], center_location[1], segement.from_point.invMat3)

        if (local_location[1] < 0 && local_center[1] > 0) {

          const dx = local_location[0] - local_center[0]
          const dy = local_location[1] - local_center[1]
          
          const offset_y = -local_center[1]
          const offset_x = dx / dy * offset_y
          const crossed_x = local_center[0] + offset_x

          if (crossed_x >= 0.0 && crossed_x <= segement.length) {

            const distance = Math.sqrt(offset_x * offset_x + offset_y * offset_y)

            occlusionMap.data[angleIndex] = distance
            break
          }
        }
      }
    }

    occlusionMap.length = outside_samplingLength
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

        image_data[iamge_offset] = color[0]
        image_data[iamge_offset + 1] = color[1]
        image_data[iamge_offset + 2] = color[2]
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

  function setMaskForBrushShape(maskData, center_location, radius, occlusionMap, border_segments) {

    const mask_data = maskData.data

    const pixel_center_x = Math.floor(center_location[0])
    const pixel_center_y = Math.floor(center_location[1])

    const minX = Math.min(Math.max(pixel_center_x - radius, 0), maskData.width - 2)
    const minY = Math.min(Math.max(pixel_center_y - radius, 0), maskData.height - 2)
    const maxX = Math.min(Math.max(pixel_center_x + radius, 0), maskData.width - 2)
    const maxY = Math.min(Math.max(pixel_center_y + radius, 0), maskData.height - 2)

    for (let y = minY; y <= maxY; y++) {

      let mask_offset = y * maskData.lineBytes + minX + maskData.pixelBytes

      for (let x = minX; x <= maxX; x++) {

        const dx = x - pixel_center_x
        const dy = y - pixel_center_y
        const distance = Math.sqrt(dx * dx + dy * dy)

        let angle = Math.atan2(-dy, dx)
        if (angle < 0) {
          angle = Math.PI * 2 + angle
        }
        const occlusionIndex = Math.floor(angle / Math.PI / 2 * occlusionMap.length)

        if (occlusionIndex >= occlusionMap.data.length) {
          console.log(1)
        }

        const occlusion_distance = occlusionMap.data[occlusionIndex]

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

  function drawStroke(points, rgb_color) {

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

  function draw(drawBrush) {

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (drawBrush) {

      // sample_maskData.data[Math.floor(input_y) * sample_maskData.lineBytes + Math.floor(input_x) * sample_maskData.pixelBytes] = 1

      const radius = 22.0

      const segments = collectStrokeSegments(sample_stroke, input_location, radius)
      // console.log(segments)

      collectOcclusionMap(sample_occlusionMap, input_location, radius, segments)

      clearMaskData(sample_maskData)

      setMaskForBrushShape(sample_maskData, input_location, radius, sample_occlusionMap, segments)

      setMaskImageToImageData(sample_mask_imageData, sample_maskData, [255, 0, 0, 255])

      setOcclusionMapImageToImageData(sample_occlusionMap_imageData, sample_occlusionMap, radius, [255, 0, 0, 255])
    }

    ctx.putImageData(sample_mask_imageData.imageData, sample_maskData.location[0], sample_maskData.location[1])
    ctx.putImageData(sample_occlusionMap_imageData.imageData, 0, 5)

    drawStroke(sample_stroke.points, '255, 255, 255')
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

  const pointer_event = (e) => {

    if (e.buttons != 0) {

      input_location[0] = e.offsetX / 2
      input_location[1] = e.offsetY / 2

      draw(true)
    }

    e.preventDefault()
  }

  canvas.onpointerdown = pointer_event
  canvas.onpointermove = pointer_event
  canvas.oncontextmenu  = (e) => { e.preventDefault() }

  draw(false)
}

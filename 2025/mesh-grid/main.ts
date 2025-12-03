import { vec2, vec4, Vec2, Vec4 } from '../common/glmatrix';
import { Maths } from '../common/maths';

// グリッドの線パラメータ
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

// グリッドの点データ
class GridPoint {
  baseLocation: Vec2 = [0.0, 0.0] // 元の位置[x, y]
  location: Vec2 = [0.0, 0.0] // 変更後の位置[x, y]
  dispLocation: Vec2 = [0.0, 0.0] // 表示位置[x, y]
  color: Vec4 = [0.0, 0.0, 0.0, 0.0]
}

class GridFace {
  point1: GridPoint | null = null
  point2: GridPoint | null = null
  point3: GridPoint | null = null
  point4: GridPoint | null = null
  line1 = new LineParameter()
  line2 = new LineParameter()
  line3 = new LineParameter()
  line4 = new LineParameter()
}

class MeshFileData {
  name: string = ''
  vertex_count: number = 0
  polygon_count: number = 0
  vertices: number[][] = []
  faces: number[][] = []
}

// グリッドデータ作成・初期化関数

function createGridDataFromMesh(meshFileData: MeshFileData, displayDimension: number[]): {gridPoints: GridPoint[], gridFaces: GridFace[]} {

  const gridPoints: GridPoint[] = []
  const padding = 20
  for (const vertex of meshFileData.vertices) {
    const gridPoint = new GridPoint()
    const vertexX = displayDimension[0] / 2 + vertex[0] * (displayDimension[0] - padding * 2) / 2
    const vertexY = displayDimension[1] / 2 - vertex[1] * (displayDimension[1] - padding * 2) / 2
    gridPoint.baseLocation[0] = vertexX
    gridPoint.baseLocation[1] = vertexY
    gridPoint.location[0] = vertexX
    gridPoint.location[1] = vertexY
    gridPoint.dispLocation[0] = Math.floor(vertexX)
    gridPoint.dispLocation[1] = Math.floor(vertexY)
    gridPoints.push(gridPoint)
  }

  const gridFaces: GridFace[] = []

  for (const indexSet of meshFileData.faces) {
    const gridFace = new GridFace()
    if (indexSet.length == 4) {
      gridFace.point1 = gridPoints[indexSet[0]]
      gridFace.point2 = gridPoints[indexSet[1]]
      gridFace.point3 = gridPoints[indexSet[2]]
      gridFace.point4 = gridPoints[indexSet[3]]
    }
    else if (indexSet.length == 3) {
      gridFace.point1 = gridPoints[indexSet[0]]
      gridFace.point2 = gridPoints[indexSet[1]]
      gridFace.point3 = gridPoints[indexSet[2]]
    }
    gridFaces.push(gridFace)
  }

  return {gridPoints, gridFaces}
}


///////////////////////////////////////////////////////////////////////////////////////
// AIが生成したCatmull-Clark細分割コードをさらにAIが改造し、色も補間できるようにしたもの！たぶん動く！
/**
 * Performs one iteration of Catmull-Clark Subdivision on the mesh, interpolating colors as well.
 */
type Face = number[]
function subdivideCatmullClarkWithColor(
  gridPoints: GridPoint[],
  faces: Face[],
): { gridPoints: GridPoint[]; faces: Face[] } {
  // 1. Calculate Face Points
  // Average of all vertices of the face for both location and color
  const facePoints: GridPoint[] = faces.map((face) => {
    const facePoint = new GridPoint()
    facePoint.baseLocation = [0, 0]
    facePoint.location = [0, 0]
    facePoint.color = [0, 0, 0, 0]

    face.forEach((idx) => {
      vec2.add(facePoint.location, facePoint.location, gridPoints[idx].location)
      vec4.add(facePoint.color, facePoint.color, gridPoints[idx].color)
    })

    vec2.scale(facePoint.location, facePoint.location, 1 / face.length)
    vec4.scale(facePoint.color, facePoint.color, 1 / face.length)
    vec2.copy(facePoint.baseLocation, facePoint.location)
    return facePoint
  })

  // 2. Calculate Edge Points
  const edgeMap = new Map<string, { v1: number; v2: number; faceIndices: number[] }>()
  const getEdgeKey = (v1: number, v2: number) => (v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`)

  faces.forEach((face, faceIdx) => {
    const len = face.length
    for (let i = 0; i < len; i++) {
      const v1 = face[i]
      const v2 = face[(i + 1) % len]
      const key = getEdgeKey(v1, v2)
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { v1, v2, faceIndices: [] })
      }
      edgeMap.get(key)!.faceIndices.push(faceIdx)
    }
  })

  const edgePoints = new Map<string, GridPoint>()
  const vertexFaces = new Array(gridPoints.length).fill(0).map(() => [] as number[])
  const vertexEdges = new Array(gridPoints.length).fill(0).map(() => [] as string[])

  edgeMap.forEach((data, key) => {
    vertexEdges[data.v1].push(key)
    vertexEdges[data.v2].push(key)

    const v1Pt = gridPoints[data.v1]
    const v2Pt = gridPoints[data.v2]
    const edgePoint = new GridPoint()

    if (data.faceIndices.length === 2) {
      // Internal edge: E = (v1 + v2 + f1 + f2) / 4
      const f1Pt = facePoints[data.faceIndices[0]]
      const f2Pt = facePoints[data.faceIndices[1]]

      vec2.add(edgePoint.location, v1Pt.location, v2Pt.location)
      vec2.add(edgePoint.location, edgePoint.location, f1Pt.location)
      vec2.add(edgePoint.location, edgePoint.location, f2Pt.location)
      vec2.scale(edgePoint.location, edgePoint.location, 0.25)

      vec4.add(edgePoint.color, v1Pt.color, v2Pt.color)
      vec4.add(edgePoint.color, edgePoint.color, f1Pt.color)
      vec4.add(edgePoint.color, edgePoint.color, f2Pt.color)
      vec4.scale(edgePoint.color, edgePoint.color, 0.25)
    } else {
      // Boundary edge: E = (v1 + v2) / 2
      vec2.add(edgePoint.location, v1Pt.location, v2Pt.location)
      vec2.scale(edgePoint.location, edgePoint.location, 0.5)

      vec4.add(edgePoint.color, v1Pt.color, v2Pt.color)
      vec4.scale(edgePoint.color, edgePoint.color, 0.5)
    }
    vec2.copy(edgePoint.baseLocation, edgePoint.location)
    edgePoints.set(key, edgePoint)
  })

  faces.forEach((face, fIdx) => {
    face.forEach((vIdx) => {
      vertexFaces[vIdx].push(fIdx)
    })
  })

  // 3. Calculate New Vertex Points
  const newVertexPoints: GridPoint[] = gridPoints.map((v, i) => {
    const valence = vertexEdges[i].length
    const boundaryEdges = vertexEdges[i].filter((key) => edgeMap.get(key)!.faceIndices.length < 2)
    const isBoundary = boundaryEdges.length > 0

    const newV = new GridPoint()
    vec2.copy(newV.baseLocation, v.baseLocation) // Keep original base location

    if (isBoundary) {
      if (boundaryEdges.length === 2) {
        const n1Data = edgeMap.get(boundaryEdges[0])!
        const n2Data = edgeMap.get(boundaryEdges[1])!
        const n1Idx = n1Data.v1 === i ? n1Data.v2 : n1Data.v1
        const n2Idx = n2Data.v1 === i ? n2Data.v2 : n2Data.v1
        const n1 = gridPoints[n1Idx]
        const n2 = gridPoints[n2Idx]

        // V_new = 3/4 * V_old + 1/8 * (Neighbor1 + Neighbor2)
        const weightedVLoc = vec2.create()
        const weightedVCol = vec4.create()
        vec2.scale(weightedVLoc, v.location, 6)
        vec4.scale(weightedVCol, v.color, 6)

        const neighborSumLoc = vec2.create()
        const neighborSumCol = vec4.create()
        vec2.add(neighborSumLoc, n1.location, n2.location)
        vec4.add(neighborSumCol, n1.color, n2.color)

        vec2.add(newV.location, neighborSumLoc, weightedVLoc)
        vec2.scale(newV.location, newV.location, 1 / 8)
        vec4.add(newV.color, neighborSumCol, weightedVCol)
        vec4.scale(newV.color, newV.color, 1 / 8)
      } else {
        vec2.copy(newV.location, v.location)
        vec4.copy(newV.color, v.color)
      }
    } else {
      // Internal Vertex Rule: V_new = (Q + 2R + (n-3)V) / n
      const Q_loc = vec2.create(); const Q_col = vec4.create()
      vertexFaces[i].forEach((fIdx) => {
        vec2.add(Q_loc, Q_loc, facePoints[fIdx].location)
        vec4.add(Q_col, Q_col, facePoints[fIdx].color)
      })
      vec2.scale(Q_loc, Q_loc, 1 / vertexFaces[i].length)
      vec4.scale(Q_col, Q_col, 1 / vertexFaces[i].length)

      const R_loc = vec2.create(); const R_col = vec4.create()
      vertexEdges[i].forEach((key) => {
        const e = edgeMap.get(key)!
        const midLoc = vec2.create(); const midCol = vec4.create()
        vec2.add(midLoc, gridPoints[e.v1].location, gridPoints[e.v2].location)
        vec2.scale(midLoc, midLoc, 0.5)
        vec4.add(midCol, gridPoints[e.v1].color, gridPoints[e.v2].color)
        vec4.scale(midCol, midCol, 0.5)
        vec2.add(R_loc, R_loc, midLoc)
        vec4.add(R_col, R_col, midCol)
      })
      vec2.scale(R_loc, R_loc, 1 / valence)
      vec4.scale(R_col, R_col, 1 / valence)

      const part1_loc = Q_loc
      const part1_col = Q_col
      const part2_loc = vec2.create(); const part2_col = vec4.create()
      vec2.scale(part2_loc, R_loc, 2)
      vec4.scale(part2_col, R_col, 2)
      const part3_loc = vec2.create(); const part3_col = vec4.create()
      vec2.scale(part3_loc, v.location, valence - 3)
      vec4.scale(part3_col, v.color, valence - 3)

      vec2.add(newV.location, part1_loc, part2_loc)
      vec2.add(newV.location, newV.location, part3_loc)
      vec2.scale(newV.location, newV.location, 1 / valence)

      vec4.add(newV.color, part1_col, part2_col)
      vec4.add(newV.color, newV.color, part3_col)
      vec4.scale(newV.color, newV.color, 1 / valence)
    }
    return newV
  })

  // 4. Reconstruct Faces
  const newFaces: Face[] = []
  const edgeKeys = Array.from(edgePoints.keys())
  const edgePointStartIndex = newVertexPoints.length
  const edgeKeyToIndex = new Map<string, number>()
  edgeKeys.forEach((key, idx) => {
    edgeKeyToIndex.set(key, edgePointStartIndex + idx)
  })
  const facePointStartIndex = edgePointStartIndex + edgeKeys.length

  faces.forEach((face, fIdx) => {
    const centerIdx = facePointStartIndex + fIdx
    const len = face.length
    for (let i = 0; i < len; i++) {
      const vIdx = face[i]
      const prevVIdx = face[(i - 1 + len) % len]
      const nextVIdx = face[(i + 1) % len]

      const edgeToNextKey = getEdgeKey(vIdx, nextVIdx)
      const edgeToNextIdx = edgeKeyToIndex.get(edgeToNextKey)!

      const edgeToPrevKey = getEdgeKey(vIdx, prevVIdx)
      const edgeToPrevIdx = edgeKeyToIndex.get(edgeToPrevKey)!

      newFaces.push([vIdx, edgeToNextIdx, centerIdx, edgeToPrevIdx])
    }
  })

  const finalGridPoints = [...newVertexPoints, ...Array.from(edgePoints.values()), ...facePoints]
  finalGridPoints.forEach(p => {
    p.dispLocation[0] = Math.floor(p.location[0])
    p.dispLocation[1] = Math.floor(p.location[1])
  })

  return {
    gridPoints: finalGridPoints,
    faces: newFaces,
  }
}
///////////////////////////////////////////////////////////////////////////////////////

// グリッド変形・色設定関数

function modifyGridDataByFishEye(gridPoints: GridPoint[], centerLocation: number[], radius: number, eraser: boolean) {
  for (const gridPoint of gridPoints) {
    const dx = gridPoint.baseLocation[0] - centerLocation[0]
    const dy = gridPoint.baseLocation[1] - centerLocation[1]
    const nx = dx / radius
    const ny = dy / radius
    const distance = Math.sqrt(nx * nx + ny * ny)
    if (distance > 0 && distance < 1.0) {
      if (!eraser) {
        const theta = Math.asin(distance)
        const projection_depth = 0.3
        const lens_depth = projection_depth + Math.sin(theta)
        const move_x = nx / lens_depth * (1.0 + projection_depth)
        const move_y = ny / lens_depth * (1.0 + projection_depth)
        const new_x = centerLocation[0] + move_x * radius
        const new_y = centerLocation[1] + move_y * radius
        gridPoint.location[0] = Maths.lerp(gridPoint.location[0], new_x, 0.02)
        gridPoint.location[1] = Maths.lerp(gridPoint.location[1], new_y, 0.02)
      }
      else {
        gridPoint.location[0] = Maths.lerp(gridPoint.location[0], gridPoint.baseLocation[0], 1.0 - distance)
        gridPoint.location[1] = Maths.lerp(gridPoint.location[1], gridPoint.baseLocation[1], 1.0 - distance)
      }
    }
  }

  for (const gridPoint of gridPoints) {
    gridPoint.dispLocation[0] = Math.floor(gridPoint.location[0])
    gridPoint.dispLocation[1] = Math.floor(gridPoint.location[1])
  }
}

function setRadialGradation(gridPoints: GridPoint[], centerLocation: number[], radius: number, color: number[], brush_alpha: number) {
  for (const gridPoint of gridPoints) {
    const dx = gridPoint.location[0] - centerLocation[0]
    const dy = gridPoint.location[1] - centerLocation[1]
    const distance = Math.sqrt(dx * dx + dy * dy)

    // radial-only brush: value decreases linearly with distance (0..1)
    const value = Maths.clamp((radius - distance) / radius, 0.0, 1.0)

    gridPoint.color[0] = Maths.lerp(gridPoint.color[0], color[0], value * brush_alpha)
    gridPoint.color[1] = Maths.lerp(gridPoint.color[1], color[1], value * brush_alpha)
    gridPoint.color[2] = Maths.lerp(gridPoint.color[2], color[2], value * brush_alpha)
    gridPoint.color[3] = Maths.lerp(gridPoint.color[3], color[3], value * brush_alpha)
  }
}

// 描画関数

function calclateLineParameter(line_param: LineParameter, point1: GridPoint, point2: GridPoint) {
  const p1X = point1.dispLocation[0]
  const p1Y = point1.dispLocation[1]
  const p2X = point2.dispLocation[0]
  const p2Y = point2.dispLocation[1]

  line_param.xa = p2X - p1X
  line_param.ya = p2Y - p1Y

  line_param.xb = p1X
  line_param.yb = p1Y

  line_param.minX = Math.min(p1X, p2X)
  line_param.minY = Math.min(p1Y, p2Y)
  line_param.maxX = Math.max(p1X, p2X)
  line_param.maxY = Math.max(p1Y, p2Y)
}

function calclateFaceLineParameter(gridFace: GridFace) {
  if (gridFace.point4 != null) {
    calclateLineParameter(gridFace.line1, gridFace.point1, gridFace.point2)
    calclateLineParameter(gridFace.line2, gridFace.point4, gridFace.point3)
    calclateLineParameter(gridFace.line3, gridFace.point1, gridFace.point4)
    calclateLineParameter(gridFace.line4, gridFace.point2, gridFace.point3)
  }
  else {
    calclateLineParameter(gridFace.line1, gridFace.point1, gridFace.point2)
    calclateLineParameter(gridFace.line2, gridFace.point1, gridFace.point3)
    calclateLineParameter(gridFace.line3, gridFace.point1, gridFace.point1)
    calclateLineParameter(gridFace.line4, gridFace.point2, gridFace.point3)
  }
}

function calclateQuadInterpolation(line1_param: LineParameter, line2_param: LineParameter, src_x: number, src_y: number, isHorizontal: boolean) {
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

function drawQuadGradation(
  imageData: ImageData,
  line1_param: LineParameter, line2_param: LineParameter, line3_param: LineParameter, line4_param: LineParameter,
  color1: Vec4, color2: Vec4, color3: Vec4, color4: Vec4
) {
  const minX = Math.floor(Math.max(Math.min(line1_param.minX, line2_param.minX, line3_param.minX, line4_param.minX), 0))
  const minY = Math.floor(Math.max(Math.min(line1_param.minY, line2_param.minY, line3_param.minY, line4_param.minY), 0))
  const maxX = Math.floor(Math.min(Math.max(line1_param.maxX, line2_param.maxX, line3_param.maxX, line4_param.maxX), imageData.width - 1))
  const maxY = Math.floor(Math.min(Math.max(line1_param.maxY, line2_param.maxY, line3_param.maxY, line4_param.maxY), imageData.height - 1))

  const pixData = imageData.data
  const pixelBytes = 4
  const lineBytes = imageData.width * pixelBytes

  const draw_color1: Vec4 = [0.0, 0.0, 0.0, 0.0]
  const draw_color2: Vec4 = [0.0, 0.0, 0.0, 0.0]
  const draw_color3: Vec4 = [0.0, 0.0, 0.0, 0.0]

  for (let y = minY; y <= maxY; y++) {

    const offsetY = y * lineBytes

    for (let x = minX; x <= maxX; x++) {

      const local_x = calclateQuadInterpolation(line1_param, line2_param, x, y, true)
      const local_y = calclateQuadInterpolation(line3_param, line4_param, x, y, false)

      if (local_x >= 0.0 && local_x <= 1.0 && local_y >= 0.0 && local_y <= 1.0) {

        vec4.lerp(draw_color1, color1, color2, local_x)
        vec4.lerp(draw_color2, color3, color4, local_x)
        vec4.lerp(draw_color3, draw_color1, draw_color2, local_y)

        const offset = offsetY + x * pixelBytes

        pixData[offset] = draw_color3[0] * 255
        pixData[offset + 1] = draw_color3[1] * 255
        pixData[offset + 2] = draw_color3[2] * 255
        pixData[offset + 3] = draw_color3[3] * 255
      }
    }
  }

  // デバッグ用：四隅の点を表示
  // let offset = minY * lineBytes + minX * pixelBytes
  // pixData[offset + 1] = 255
  // pixData[offset + 3] = 255
  // offset = maxY * lineBytes + maxX * pixelBytes
  // pixData[offset + 1] = 255
  // pixData[offset + 3] = 255
  // offset = minY * lineBytes + maxX * pixelBytes
  // pixData[offset + 1] = 255
  // pixData[offset + 3] = 255
  // offset = maxY * lineBytes + minX * pixelBytes
  // pixData[offset + 1] = 255
  // pixData[offset + 3] = 255
}

function drawGridGradation(imageData: ImageData, gridFaces: GridFace[]) {

  for (const gridFace of gridFaces) {

    calclateFaceLineParameter(gridFace)

    if (gridFace.point4 != null) {
      drawQuadGradation(
        imageData,
        gridFace.line1,
        gridFace.line2,
        gridFace.line3,
        gridFace.line4,
        gridFace.point1.color,
        gridFace.point2.color,
        gridFace.point4.color,
        gridFace.point3.color
      )
    }
    else {
      drawQuadGradation(
        imageData,
        gridFace.line1,
        gridFace.line2,
        gridFace.line3,
        gridFace.line4,
        gridFace.point1.color,
        gridFace.point2.color,
        gridFace.point1.color,
        gridFace.point3.color
      )
    }
  }
}

function clearImageData(data: Uint8ClampedArray) {
  data.fill(0)
}

function drawLine(x1: number, y1: number, x2: number, y2: number, rgb_color: string, ctx: CanvasRenderingContext2D) {

  ctx.strokeStyle = `rgb(${rgb_color})`
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function drawGridLines(gridFaces: GridFace[], lineColor: string, ctx: CanvasRenderingContext2D) {

  for (const gridFace of gridFaces) {
      if (gridFace.point4) {
        drawLine(gridFace.point1.dispLocation[0], gridFace.point1.dispLocation[1], gridFace.point2.dispLocation[0], gridFace.point2.dispLocation[1], lineColor, ctx)
        drawLine(gridFace.point2.dispLocation[0], gridFace.point2.dispLocation[1], gridFace.point3.dispLocation[0], gridFace.point3.dispLocation[1], lineColor, ctx)
        drawLine(gridFace.point3.dispLocation[0], gridFace.point3.dispLocation[1], gridFace.point4.dispLocation[0], gridFace.point4.dispLocation[1], lineColor, ctx)
        drawLine(gridFace.point4.dispLocation[0], gridFace.point4.dispLocation[1], gridFace.point1.dispLocation[0], gridFace.point1.dispLocation[1], lineColor, ctx)
      }
      else {
        drawLine(gridFace.point1.dispLocation[0], gridFace.point1.dispLocation[1], gridFace.point2.dispLocation[0], gridFace.point2.dispLocation[1], lineColor, ctx)
        drawLine(gridFace.point2.dispLocation[0], gridFace.point2.dispLocation[1], gridFace.point3.dispLocation[0], gridFace.point3.dispLocation[1], lineColor, ctx)
        drawLine(gridFace.point3.dispLocation[0], gridFace.point3.dispLocation[1], gridFace.point1.dispLocation[0], gridFace.point1.dispLocation[1], lineColor, ctx)
      }
  }
}

// DOMユーティリティ関数

function elementOf<T>(id: string) {
  return document.getElementById(id) as T
}

function elementsByName<T extends Node>(name: string) {
  return document.getElementsByName(name) as unknown as NodeListOf<T>
}

function setText(id: string, text: string) {
  elementOf<HTMLDivElement>(id).innerHTML = text
}

function getRangeValue(id: string, division: number) {
  return Number(elementOf<HTMLInputElement>(id).value) / division
}

function getRadioButtonValue(name: string) {
  let checked_value
  elementsByName<HTMLInputElement>(name).forEach(button => {
    if (button.checked) {
      checked_value = button.value
    }
  })
  return Number(checked_value)
}

function getSelectValue(id: string) {
  return Number(elementOf<HTMLSelectElement>(id).value)
}

function setRadioButtonEvent(name: string, callback: () => void) {
  elementsByName<HTMLInputElement>(name).forEach(button => {
    button.onclick = callback
  })
}

// メイン処理

async function main() {

  const _displayDimension = [400, 400]

  const _canvas = document.getElementById('canvas') as HTMLCanvasElement
  _canvas.width = _displayDimension[0]
  _canvas.height = _displayDimension[1]

  const _ctx = _canvas.getContext('2d', { antiAliasingEnabled: false }) as CanvasRenderingContext2D
  const _imageData = _ctx.createImageData(_canvas.width, _canvas.height)

  const _modelFiles = [
    'grid-mesh-model-star.json',
    'grid-mesh-model-torus.json',
    'grid-mesh-model-heart.json',
    'grid-mesh-model-rect.json',
    'grid-mesh-model-min-triangle.json'
  ]
  let _meshFileData: MeshFileData = new MeshFileData()
  let _gridData: {gridPoints: GridPoint[], gridFaces: GridFace[]}
  let _subdivData: {gridPoints: GridPoint[], gridFaces: GridFace[]}

  const _pointerLocation = [0, 0]

  function subdivide() {
    // AIがちゃっちゃと書いたもの！たぶん動く！////////////////////////////////
    // 現在のグリッドデータをインデックスベースのデータに変換
    const subdivisionLevel = Math.floor(getRangeValue('subdivision-level', 1))
    let currentData = { gridPoints: _gridData.gridPoints, faces: _gridData.gridFaces.map(f => {
      const indices: number[] = []
      if (f.point1) indices.push(_gridData.gridPoints.indexOf(f.point1))
      if (f.point2) indices.push(_gridData.gridPoints.indexOf(f.point2))
      if (f.point3) indices.push(_gridData.gridPoints.indexOf(f.point3))
      if (f.point4) indices.push(_gridData.gridPoints.indexOf(f.point4))
      return indices.filter(i => i !== -1) // 存在しないpointをフィルタリング
    }) };

    // 指定回数分Catmull-Clark細分割を実行
    for (let i = 0; i < subdivisionLevel; i++) {
      const result = subdivideCatmullClarkWithColor(currentData.gridPoints, currentData.faces);
      currentData = { gridPoints: result.gridPoints, faces: result.faces };
    }

    // GridFaceを再構築
    const newGridFaces: GridFace[] = currentData.faces.map(indexSet => {
      const gridFace = new GridFace();
      if (indexSet.length >= 3) {
        gridFace.point1 = currentData.gridPoints[indexSet[0]];
        gridFace.point2 = currentData.gridPoints[indexSet[1]];
        gridFace.point3 = currentData.gridPoints[indexSet[2]];
      }
      if (indexSet.length === 4) {
        gridFace.point4 = currentData.gridPoints[indexSet[3]];
      }
      return gridFace;
    });

    _subdivData = { gridPoints: currentData.gridPoints, gridFaces: newGridFaces };
    ////////////////////////////////////////////////////////////////////////
  }

  function initializeGridData() {
    _gridData = createGridDataFromMesh(_meshFileData, _displayDimension)
    _gridData.gridPoints.forEach(p => vec4.set(p.color, 0,0,0,0));
    subdivide()
  }

  async function loadModel(modelIndex: number) {
    // モデルデータ読み込み
    const response = await fetch(_modelFiles[modelIndex])
    _meshFileData = await response.json() as MeshFileData
    // グリッドデータ初期化
    initializeGridData()
    // 表示
    draw(false, false, _ctx)
  }

  const _brushColors = [
    [0.0, 0.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 1.0],
    [1.0, 0.0, 0.0, 1.0],
    [1.0, 0.0, 1.0, 1.0],
    [0.0, 1.0, 0.0, 1.0],
    [0.0, 1.0, 1.0, 1.0],
    [1.0, 1.0, 0.0, 1.0],
    [1.0, 1.0, 1.0, 1.0],
  ]

  function draw(drawBrush: boolean, eraser: boolean, ctx: CanvasRenderingContext2D) {

    const input_radius = getRangeValue('circle-radius', 1)
    const showGrid = getRadioButtonValue('show-grid')
    const modifyGridEnabled = getRadioButtonValue('modify-grid')
    const colorIndex = getRadioButtonValue('color')

    if (drawBrush) {
      if (modifyGridEnabled == 1) {
        modifyGridDataByFishEye(_gridData.gridPoints, _pointerLocation, input_radius, eraser)
      }
      const color = (eraser ? [0.0, 0.0, 0.0, 0.0] : _brushColors[colorIndex])
      const brush_alpha = (eraser ? 0.07 : 0.1) // 消しゴムのαを低めに設定
      setRadialGradation(_gridData.gridPoints, _pointerLocation, input_radius, color, brush_alpha)

      // 操作後に再分割
      subdivide()
    }

    ctx.clearRect(0, 0, _canvas.width, _canvas.height)
    clearImageData(_imageData.data)

    drawGridGradation(_imageData, _subdivData.gridFaces)

    ctx.putImageData(_imageData, 0, 0)

    if (showGrid == 1) {
      const showSubdividedGrid = getRadioButtonValue('show-subdivided-grid')
      const gridToDraw = showSubdividedGrid == 1 ? _subdivData.gridFaces : _gridData.gridFaces
      drawGridLines(gridToDraw, '255, 255, 255, 0.1', ctx)
    }

    showPrameterText()
  }

  function showPrameterText() {
    setText('input-text', `(${_pointerLocation[0].toFixed(1)}, ${_pointerLocation[1].toFixed(1)})`)
    setText('circle-radius-text', `${getRangeValue('circle-radius', 1).toFixed(1)}`)
    setText('subdivision-level-text', `${getRangeValue('subdivision-level', 1)}`)
  }

  // ポインタイベント登録

  const pointer_event = (e: PointerEvent) => {
    if (e.buttons != 0) {

      _pointerLocation[0] = e.offsetX / 2
      _pointerLocation[1] = e.offsetY / 2

      const eraser = (e.buttons == 2)

      draw(true, eraser, _ctx)
    }

    e.preventDefault()
  }

  _canvas.onpointerdown = pointer_event
  _canvas.onpointermove = pointer_event
  _canvas.oncontextmenu = (e) => { e.preventDefault() }

  // UIイベント登録

  document.getElementById('model-select').onchange = () => {
    loadModel(getSelectValue('model-select'))
  }

  document.getElementById('circle-radius').onchange = () => {
    showPrameterText()
  }

  document.getElementById('subdivision-level').onchange = () => {
    // 再分割して表示
    subdivide()
    draw(false, false, _ctx)
    showPrameterText()
  }

  setRadioButtonEvent('show-grid', () => { draw(false, false, _ctx) })
  setRadioButtonEvent('vertex-ipo', () => { draw(false, false, _ctx) })
  setRadioButtonEvent('show-subdivided-grid', () => { draw(false, false, _ctx) })

  loadModel(getSelectValue('model-select'))
}

document.addEventListener('DOMContentLoaded', main);

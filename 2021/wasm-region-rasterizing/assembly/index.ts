
// 領域全体の情報
class RegionInfo {

  // キャンバスのサイズ
  canvasWidth: i32 = 0
  canvasHeight: i32 = 0

  // 領域を構成するパス
  pathSegments: PathSegment[] = []

  // 塗りつぶしの基準となるエッジ情報（一次元目の要素数はcanvasHeightと一致、二次元目は可変）
  edgeInfos: EdgeInfo[][] = []

  // 領域の矩形範囲
  minX: i32 = 0
  minY: i32 = 0
  maxX: i32 = 0
  maxY: i32 = 0

  constructor(canvasWidth: i32, canvasHeight: i32) {

    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.minX = canvasWidth
    this.minY = canvasHeight
  }
}

// 領域こ構成する線分
class PathSegment {

  constructor(public x1: number, public y1: number, public x2: number, public y2: number) {
  }
}

// 領域のエッジ情報
class EdgeInfo {

  constructor(public x: number, public pixelLength: i32, public passingLineCount: i32) {
  }
}

// エッジ情報構築処理の状態
class EdgeProcessState {

  x: i32 = 0
  y: i32 = 0
  beginXIndex: i32 = 0
  lastXIndex: i32 = 0
  lastYIndex: i32 = 0
  passingLineCount: i32 = 0
}
  
// 領域情報の作成

function createRegionInfo(width: i32, height: i32): RegionInfo {

  const regionInfo = new RegionInfo(width, height)

  resetRegionInfo(regionInfo)

  return regionInfo
}
  
function resetRegionInfo(regionInfo: RegionInfo): void {

  regionInfo.minX = regionInfo.canvasWidth - 1
  regionInfo.minY = regionInfo.canvasHeight -1
  regionInfo.maxX = 0
  regionInfo.maxY = 0
  regionInfo.pathSegments = []
  regionInfo.edgeInfos = new Array(regionInfo.canvasHeight)

  for (let index = 0; index < regionInfo.edgeInfos.length; index++) {

    regionInfo.edgeInfos[index] = []
  }
}

// エッジ情報の構築

function constructEdgeInfo(regionInfo: RegionInfo): void {

  const pathSegments = regionInfo.pathSegments

  if (pathSegments.length < 3) {
    return
  }

  const state = new EdgeProcessState()

  const first_PathSegment = pathSegments[0]
  state.x = i32Math.floor(first_PathSegment.x1)
  state.y = i32Math.floor(first_PathSegment.y1)
  state.beginXIndex = state.x
  state.lastXIndex = state.x
  state.lastYIndex = state.y
  state.passingLineCount = 0

  const last_PathSegment = pathSegments[pathSegments.length - 1]

  // 最後の線分から最初の線分に戻る部分の状態をさかのぼって計算
  backProcessEdgeInfoConstructionForLast(state, last_PathSegment)

  // 各線分のエッジ情報を構築
  for (let index = 0; index < pathSegments.length; index++) {

    const current_PathSegment = pathSegments[index]
    const previous_PathSegment = (
      index > 0
      ? pathSegments[index - 1]
      : pathSegments[pathSegments.length - 1]
    )
    
    processEdgeInfoConstruction(regionInfo, state, current_PathSegment, previous_PathSegment)
  }
}

function processEdgeInfoConstruction(regionInfo: RegionInfo, state: EdgeProcessState, current_PathSegment: PathSegment, previous_PathSegment: PathSegment): void {

  let x = state.x
  let y = state.y
  let beginXIndex = state.beginXIndex
  let lastXIndex = state.lastXIndex
  let lastYIndex = state.lastYIndex
  let passingLineCount = state.passingLineCount

  const current_yDifference = current_PathSegment.y2 - current_PathSegment.y1
  const previous_yDifference = previous_PathSegment.y2 - previous_PathSegment.y1

  const x1 = current_PathSegment.x1
  const y1 = current_PathSegment.y1
  const x2 = current_PathSegment.x2
  const y2 = current_PathSegment.y2

  // エッジ情報の積み上げ
  const startX = Math.floor(x1)
  const startY = Math.floor(y1)
  const endX = Math.floor(x2)
  const endY = Math.floor(y2)
  const xDifference = endX - startX
  const yDifference = endY - startY

  // currentとpreviousに挟まれた頂点が、線が一方向に通過する角（＝横向きの角）であることの判定
  const isPassingCorner = (  (current_yDifference < 0 && previous_yDifference < 0)
                          || (current_yDifference > 0 && previous_yDifference > 0)
                          || (current_yDifference == 0 && previous_yDifference != 0)
                          || (current_yDifference != 0 && previous_yDifference == 0))

  // 一方向に通過する角でない（＝上下向きの角）場合は、ピクセルに入って同じ方向に出ていく二本の線分が存在することとして扱います
  if (!isPassingCorner) {

    passingLineCount = 2
  }

  // エッジ情報の積み上げ: 縦方向の線分の場合
  if (Math.abs(xDifference) <= Math.abs(yDifference)) {

    const scanDirection = i32Math.sign(yDifference)

    while (y != endY) {

      // 縦方向に移動
      y += scanDirection

      // 横方向の位置を計算
      const currentX = startX + xDifference / yDifference * (y - startY)
      const xIndex = i32Math.floor(currentX)

      // 縦方向に移動したため、確定済みピクセルに登録
      {
        const startXIndex = i32Math.min(lastXIndex, beginXIndex)
        const endXIndex = i32Math.max(lastXIndex, beginXIndex)
        registerEdgeInfo(regionInfo, startXIndex, lastYIndex, i32Math.abs(endXIndex - startXIndex) + 1, passingLineCount)
      }

      // 横方向に移動
      x = xIndex

      // 確定済みピクセルの範囲を次のピクセルに移動
      beginXIndex = i32Math.floor(currentX)
      lastXIndex = beginXIndex
      lastYIndex = y

      // 頂点以外のエッジは常に交差する線1本として扱う
      passingLineCount = 1
    }
  }
  // エッジ情報の積み上げ: 横方向の線分の場合
  else {

    const scanDirection = i32Math.sign(xDifference)

    while (x != endX) {

      // 横方向に移動
      x += scanDirection

      // 縦方向の位置を計算
      const currentY = startY + yDifference / xDifference * (x - startX)
      const yIndex = i32Math.floor(currentY)

      // 縦方向の移動が発生する場合
      if (yIndex != lastYIndex) {

        // 縦方向に移動
        y = yIndex

        // 縦方向に移動したため、確定済みピクセルに登録
        {
          const startXIndex = i32Math.min(lastXIndex, beginXIndex)
          const endXIndex = i32Math.max(lastXIndex, beginXIndex)
          registerEdgeInfo(regionInfo, startXIndex, lastYIndex, i32Math.abs(endXIndex - startXIndex) + 1, passingLineCount)
        }

        // 確定済みピクセルの範囲を次のピクセルに移動
        beginXIndex = x
        lastXIndex = beginXIndex
        lastYIndex = y

        // 頂点以外のエッジは常に交差する線1本として扱う
        passingLineCount = 1
      }

      // 確定済みピクセルの範囲を更新
      lastXIndex = x
    }
  }

  // 描画範囲の更新
  regionInfo.minX = i32Math.min3(regionInfo.minX, x1, x2)
  regionInfo.minY = i32Math.min3(regionInfo.minY, y1, y2)
  regionInfo.maxX = i32Math.max3(regionInfo.maxX, x1, x2)
  regionInfo.maxY = i32Math.max3(regionInfo.maxY, y1, y2)

  regionInfo.minX = i32Math.max(regionInfo.minX, 0)
  regionInfo.minY = i32Math.max(regionInfo.minY, 0)
  regionInfo.maxX = i32Math.min(regionInfo.maxX, regionInfo.canvasWidth - 1)
  regionInfo.maxY = i32Math.min(regionInfo.maxY, regionInfo.canvasHeight -1)

  // 状態の更新
  state.x = x
  state.y = y
  state.beginXIndex = beginXIndex
  state.lastXIndex = lastXIndex
  state.lastYIndex = lastYIndex
  state.passingLineCount = passingLineCount
}

function backProcessEdgeInfoConstructionForLast(state: EdgeProcessState, current_PathSegment: PathSegment): void {

  let x = state.x
  let beginXIndex = state.beginXIndex
  let lastXIndex = state.lastXIndex
  let lastYIndex = state.lastYIndex

  const x1 = current_PathSegment.x1
  const y1 = current_PathSegment.y1
  const x2 = current_PathSegment.x2
  const y2 = current_PathSegment.y2

  // エッジ情報の積み上げ
  const startX = Math.floor(x1)
  const startY = Math.floor(y1)
  const endX = Math.floor(x2)
  const endY = Math.floor(y2)
  const xDifference = endX - startX
  const yDifference = endY - startY

  // エッジ情報の積み上げ: 縦方向の線分の場合
  if (Math.abs(xDifference) <= Math.abs(yDifference)) {

    // 縦方向の場合、必ず縦の移動があるため特に処理は必要ありません
  }
  // エッジ情報の積み上げ: 横方向の線分の場合
  else {

    const scanDirection = -i32Math.sign(xDifference)

    while (x != startX) {

      // 横方向に移動
      x += scanDirection

      // 縦方向の位置を計算
      const currentY = startY + yDifference / xDifference * (x - startX)
      const yIndex = i32Math.floor(currentY)

      // 縦方向の移動が発生する場合
      if (yIndex != lastYIndex) {

        // 確定済みピクセルの範囲を設定
        beginXIndex = lastXIndex
        break
      }

      // 確定済みピクセルの範囲を更新
      lastXIndex = x
    }
  }

  // 状態の更新
  state.beginXIndex = beginXIndex
}

function registerEdgeInfo(regionInfo: RegionInfo, x: number, y: number, pixelLength: i32, passingLineCount: i32): void {

  const xIndex = i32Math.floor(x)
  const yIndex = i32Math.floor(y)

  const edgeInfos = regionInfo.edgeInfos[yIndex]

  // 登録済みのエッジ情報を検索し、挿入/追加/結合いずれかを決定します
  let insertIndex = -1
  let combineIndex = -1
  for (let index = 0; index < edgeInfos.length; index++) {

    const edgeInfo = edgeInfos[index]

    if (xIndex + pixelLength - 1 < edgeInfo.x) {

      insertIndex = index
      break
    }
    else if (xIndex <= edgeInfo.x + edgeInfo.pixelLength - 1) {

      combineIndex = index
      break
    }
  }

  if (insertIndex != -1) {

    // 挿入
    // ※AssemblyScriptではspliceの仕様が異なり、挿入に使用できないため以下相当の処理をしています
    // edgeInfos.splice(insertIndex, 0, new EdgeInfo(xIndex, pixelLength, passingLineCount))
    edgeInfos.push(edgeInfos[0])
    for (let shiftIndex = edgeInfos.length - 1; shiftIndex > insertIndex; shiftIndex--) {
      edgeInfos[shiftIndex] = edgeInfos[shiftIndex - 1]
    }
    edgeInfos[insertIndex] = new EdgeInfo(xIndex, pixelLength, passingLineCount)
  }
  else if (combineIndex != -1) {

    // 結合
    const edgeInfo = edgeInfos[combineIndex]
    const minX = i32Math.min(xIndex, edgeInfo.x)
    const maxX = i32Math.max(xIndex + pixelLength - 1, edgeInfo.x + edgeInfo.pixelLength - 1)

    edgeInfo.x = minX
    edgeInfo.pixelLength = maxX - minX + 1
    edgeInfo.passingLineCount += passingLineCount
  }
  else {

    // 追加
    edgeInfos.push(new EdgeInfo(xIndex, pixelLength, passingLineCount))
  }
}

// 塗りつぶし処理

function rasterizeRegionFill(data: Uint8Array, regionInfo: RegionInfo): void {

  const pixelBytes: i32 = 4
  const lineBytes = regionInfo.canvasWidth * pixelBytes

  for (let y = regionInfo.minY; y <= regionInfo.maxY; y++) {

    const edgeInfos = regionInfo.edgeInfos[y]

    if (edgeInfos.length == 0) {
      continue
    }

    let passingLineCount = 0
    for (let index = 0; index < edgeInfos.length; index++) {

      const edgeInfo = edgeInfos[index]
      
      let startX = edgeInfo.x
      let endX = startX + edgeInfo.pixelLength - 1

      // 通過する線分の数が奇数である間のピクセルを塗りつぶします
      passingLineCount += edgeInfo.passingLineCount
      if ((passingLineCount % 2) == 1) {

        for (let indexTo = index + 1; indexTo < edgeInfos.length; indexTo++) {

          const edgeInfoTo = edgeInfos[indexTo]
          
          passingLineCount += edgeInfoTo.passingLineCount

          // 偶数のところまで継続
          if (passingLineCount % 2 == 0) {

            endX = edgeInfoTo.x + edgeInfoTo.pixelLength - 1
            index = indexTo
            break
          }
        }
      }

      // 連続する部分の塗りつぶし
      let x = startX as u32
      let offset = y * lineBytes + x * pixelBytes
      for (; x <= endX; x++) {

        data[offset + 0] = 0
        data[offset + 1] = 0
        data[offset + 2] = 0
        data[offset + 3] = 255

        offset += pixelBytes
      }
    }      
  }
}

// パスの作成

let pathCurrentX: number = 0.0
let pathCurrentY: number = 0.0
let pathBeginX: number = 0.0
let pathBeginY: number = 0.0

function beginPath(regionInfo: RegionInfo, x: number, y: number): void {

  regionInfo.pathSegments = []

  pathCurrentX = x
  pathCurrentY = y
  pathBeginX = x
  pathBeginY = y
}

function lineTo(regionInfo: RegionInfo, x: number, y: number): void {

  regionInfo.pathSegments.push(new PathSegment(pathCurrentX, pathCurrentY, x, y))

  pathCurrentX = x
  pathCurrentY = y
}

function closePath(regionInfo: RegionInfo): void {

  regionInfo.pathSegments.push(new PathSegment(pathCurrentX, pathCurrentY, pathBeginX, pathBeginY))

  constructEdgeInfo(regionInfo)
}

// メイン処理

export function draw(data: Uint8Array, width: u32, height: u32): void {

  const regionInfo = createRegionInfo(width, height)

  resetRegionInfo(regionInfo)
  beginPath(regionInfo, 5, 1)
  lineTo(regionInfo, 8, 2)
  lineTo(regionInfo, 5, 5)
  lineTo(regionInfo, 2, 2)
  closePath(regionInfo)
  rasterizeRegionFill(data, regionInfo)

  resetRegionInfo(regionInfo)
  beginPath(regionInfo, 100, 100)
  lineTo(regionInfo, 132, 200)
  lineTo(regionInfo, 50, 140)
  lineTo(regionInfo, 150, 140)
  lineTo(regionInfo, 68, 200)
  closePath(regionInfo)
  rasterizeRegionFill(data, regionInfo)

  resetRegionInfo(regionInfo)
  beginPath(regionInfo, 200, 100)
  lineTo(regionInfo, 240, 200)
  lineTo(regionInfo, 200, 190)
  lineTo(regionInfo, 160, 200)
  closePath(regionInfo)
  rasterizeRegionFill(data, regionInfo)

  resetRegionInfo(regionInfo)
  beginPath(regionInfo, 300, 100)
  lineTo(regionInfo, 340, 113)
  lineTo(regionInfo, 300, 200)
  lineTo(regionInfo, 260, 113)
  closePath(regionInfo)
  beginPath(regionInfo, 300, 105)
  lineTo(regionInfo, 270, 115)
  lineTo(regionInfo, 300, 180)
  lineTo(regionInfo, 320, 125)
  closePath(regionInfo)
  beginPath(regionInfo, 298, 111)
  lineTo(regionInfo, 298, 122)
  lineTo(regionInfo, 280, 117)
  closePath(regionInfo)
  rasterizeRegionFill(data, regionInfo)
}

class i32Math {

  static max(a: f64, b: f64): i32 {
    return Math.max(a, b) as i32
  }

  static max3(a: f64, b: f64, c: f64): i32 {
    const d = Math.max(a, b)
    return Math.max(d, c) as i32
  }

  static min(a: f64, b: f64): i32 {
    return Math.min(a, b) as i32
  }

  static min3(a: f64, b: f64, c: f64): i32 {
    const d = Math.min(a, b)
    return Math.min(d, c) as i32
  }

  static floor(a: f64): i32 {
    return Math.floor(a) as i32
  }

  static sign(a: f64): i32 {
    return Math.sign(a) as i32
  }

  static abs(a: f64): i32 {
    return Math.abs(a) as i32
  }
}

export const Uint8ArrayID = idof<Uint8Array>()

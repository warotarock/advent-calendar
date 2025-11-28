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
  nLocation: Vec2 = [0.0, 0.0] // 画面解像度で正規化された位置[x, y]
  dispLocation: Vec2 = [0.0, 0.0] // 表示位置[x, y]
  color: Vec4 = [0.0, 0.0, 0.0, 0.0]
  verticalNormal: Vec2 = [0.0, 0.0] // 垂直方向の法線ベクトル（上から下へ）
  horizontalNormal: Vec2 = [0.0, 0.0] // 水平方向の法線ベクトル（左から右へ）
  colorLocation: Vec2 = [0.0, 0.0] // 色の曲線上の位置[x, y]
  colorNormal: Vec2 = [0.0, 0.0] // 色の法線ベクトル
  curvePosition: number[] = [0.0, 0.0] // 色の補間用の曲線上の正規化位置[0.0～1.0]
  rightPoint: GridPoint | null = null
  belowPoint: GridPoint | null = null
  diagonalPoint: GridPoint | null = null
  leftPoint: GridPoint | null = null
  abovePoint: GridPoint | null = null
  isDrawable: boolean = false
  line1 = new LineParameter()
  line2 = new LineParameter()
  line3 = new LineParameter()
  line4 = new LineParameter()
  subGridRows: GridPoint[][] = [] // サブグリッドの行データ
}

// ベジェ曲線の補間処理クラス
class Bezier2DCurveInterPolationSolver {
  vec1: Vec2 | null = null // [x, y]
  vec2: Vec2 = [0.0, 0.0] // [x, y]
  vec3: Vec2 = [0.0, 0.0] // [x, y]
  vec4: Vec2 | null = null // [x, y]
  normalScale: number = 0.333
  normal1: Vec2 = [0.0, 0.0] // [x, y]
  normal2: Vec2 = [0.0, 0.0] // [x, y]

  initialize(fromPoint: Vec2, fromPointNormal: Vec2, toPoint: Vec2, toPointNormal: Vec2) {
    this.vec1 = fromPoint
    this.vec4 = toPoint
    const segmentDistance = vec2.distance(this.vec1, this.vec4)
    vec2.scale(this.normal1, fromPointNormal, segmentDistance * this.normalScale)
    vec2.add(this.vec2, this.vec1, this.normal1)
    vec2.scale(this.normal2, toPointNormal, -segmentDistance * this.normalScale)
    vec2.add(this.vec3, this.vec4, this.normal2)
  }

  bezier2DInterpolation(result: Vec2, t: number) {
    vec2BezierInterpolation(
      result,
      this.vec1,
      this.vec2,
      this.vec3,
      this.vec4,
      t
    )
  }
}

function vec2BezierInterpolation(result: Vec2, p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number) {
  result[0] = Maths.bezierInterpolation(p0[0], p1[0], p2[0], p3[0], t)
  result[1] = Maths.bezierInterpolation(p0[1], p1[1], p2[1], p3[1], t)
}

// グリッドデータ作成・初期化関数

function createGridData({ left, top, gridSizeH, gridSizeV, cellSize }: { left: number, top: number, gridSizeH: number, gridSizeV: number, cellSize: number }) {
  const gridRows: GridPoint[][] = []

  // グリッドの行データを作成
  for (let y = 0; y <= gridSizeV; y++) {
    const rowPoints: GridPoint[] = []
    for (let x = 0; x <= gridSizeH; x++) {
      const point_x = left + x * cellSize + 0.5 // ピクセル中央への補正として +0.5
      const point_y = top + y * cellSize + 0.5
      const gridPoint = new GridPoint()
      gridPoint.baseLocation[0] = point_x
      gridPoint.baseLocation[1] = point_y
      gridPoint.location[0] = point_x
      gridPoint.location[1] = point_y
      gridPoint.dispLocation[0] = Math.floor(point_x)
      gridPoint.dispLocation[1] = Math.floor(point_y)
      rowPoints.push(gridPoint)
    }
    gridRows.push(rowPoints)
  }

  // グリッドの描画設定、各点間の参照を設定
  initializeGridPointParams(gridRows)

  return gridRows
}

function initializeGridPointParams(gridRows: GridPoint[][]) {
  // グリッドの描画設定、各点間の参照を設定
  const maxIndexV = gridRows.length - 1
  const maxIndexH = gridRows[0].length - 1
  for (let y = 0; y <= maxIndexV; y++) {
    for (let x = 0; x <= maxIndexH; x++) {
      const gridPoint = gridRows[y][x]
      // 描画対象にするかどうか
      if (x < maxIndexV && y < maxIndexH) {
        gridPoint.isDrawable = true
      }
      // 右、下、斜めの点を設定
      if (x < maxIndexH) {
        gridPoint.rightPoint = gridRows[y][x + 1]
      }
      if (y < maxIndexV) {
        gridPoint.belowPoint = gridRows[y + 1][x]
      }
      if (x < maxIndexH && y < maxIndexV) {
        gridPoint.diagonalPoint = gridRows[y + 1][x + 1]
      }
      // 左、上の点を設定
      if (x > 0) {
        gridPoint.leftPoint = gridRows[y][x - 1]
      }
      if (y > 0) {
        gridPoint.abovePoint = gridRows[y - 1][x]
      }
    }
  }
}

function initializeSubGridData(gridRows: GridPoint[][], subGridDivision: number) {
  const maxIndexV = gridRows.length - 1
  const maxIndexH = gridRows[0].length - 1
  const subGridSizeV = maxIndexV * subGridDivision
  const subGridSizeH = maxIndexH * subGridDivision

  // サブグリッドの行データの配列を作成
  const subGridRows = []
  for (let y = 0; y <= subGridSizeV; y++) {
    const rowPoints = []
    for (let x = 0; x <= subGridSizeH; x++) {
      rowPoints.push(null)
    }
    subGridRows.push(rowPoints)
  }

  // 元グリッドの各点に対してサブグリッドを作成し、サブグリッドの点を全て集めた全体行データも作成する
  const lastRow = gridRows[gridRows.length - 1]
  for (let y = 0; y <= maxIndexV; y++) {
    const gridRow = gridRows[y]
    const isLastRow = (gridRow === lastRow)
    const lastColumnPoint = gridRow[gridRow.length - 1]
    for (let x = 0; x <= maxIndexH; x++) {
      const gridPoint = gridRow[x]
      const isLastColumn = (gridPoint === lastColumnPoint)
      const xDivision = isLastColumn ? 1 : subGridDivision
      const yDivision = isLastRow ? 1 : subGridDivision
      // サブグリッドを縦横に分割して点を作成
      for (let subY = 0; subY < yDivision; subY++) {
        const rowPoints = []
        for (let subX = 0; subX < xDivision; subX++) {
          // サブグリッドの点を作成
          const global_x = x * subGridDivision + subX
          const global_y = y * subGridDivision + subY
          let subGridPoint: GridPoint
          if (subGridRows[global_y][global_x]) {
            // 共有する位置の点は既存の点を使う
            subGridPoint = subGridRows[global_y][global_x]
          }
          else {
            // 新規に点を作成する
            subGridPoint = new GridPoint()
            subGridPoint.baseLocation[0] = gridPoint.baseLocation[0]
            subGridPoint.baseLocation[1] = gridPoint.baseLocation[1]
            subGridPoint.location[0] = subGridPoint.baseLocation[0]
            subGridPoint.location[1] = subGridPoint.baseLocation[1]
            // サブグリッドの点を全体行データに設定
            subGridRows[global_y][global_x] = subGridPoint
          }
          rowPoints.push(subGridPoint)
        }

        // サブグリッドの行データを設定
        gridPoint.subGridRows.push(rowPoints)
      }
    }
  }

  // グリッドの描画設定、各点間の参照を設定
  initializeGridPointParams(subGridRows)

  return subGridRows
}

function updateSubGridPoints(gridRows: GridPoint[][], subGridRows: GridPoint[][], subGridDivision: number, displayDimension: number[], isLinearMode = false) {
  const differenceVec: Vec2 = [0.0, 0.0]
  const subGridMaxIndexV = subGridRows.length - 1
  const subGridMaxIndexH = subGridRows[0].length - 1

  // 浮動小数点数の計算精度を高めるため画面解像度で正規化された位置を計算
  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
      gridPoint.nLocation[0] = gridPoint.location[0] / displayDimension[0]
      gridPoint.nLocation[1] = gridPoint.location[1] / displayDimension[1]
    }
  }

  // 点の垂直方向と水平方向の法線ベクトルを計算
  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
      // 垂直方向のベクトル（上の点から下の点への差分）
      let hasVerticalDiff = false
      if (gridPoint.abovePoint && gridPoint.belowPoint) {
        vec2.subtract(differenceVec, gridPoint.belowPoint.nLocation, gridPoint.abovePoint.nLocation)
        hasVerticalDiff = true
      } else if (gridPoint.belowPoint) {
        // 上の点がない場合（最上段）：現在の点から下の点へ
        vec2.subtract(differenceVec, gridPoint.belowPoint.nLocation, gridPoint.nLocation)
        hasVerticalDiff = true
      } else if (gridPoint.abovePoint) {
        // 下の点がない場合（最下段）：上の点から現在の点へ
        vec2.subtract(differenceVec, gridPoint.nLocation, gridPoint.abovePoint.nLocation)
        hasVerticalDiff = true
      }
      if (hasVerticalDiff) {
        vec2.normalize(gridPoint.verticalNormal, differenceVec)
      }

      // 水平方向のベクトル（左の点から右の点への差分）
      let hasHorizontalDiff = false
      if (gridPoint.leftPoint && gridPoint.rightPoint) {
        vec2.subtract(differenceVec, gridPoint.rightPoint.nLocation, gridPoint.leftPoint.nLocation)
        hasHorizontalDiff = true
      } else if (gridPoint.rightPoint) {
        // 左の点がない場合（最左列）：現在の点から右の点へ
        vec2.subtract(differenceVec, gridPoint.rightPoint.nLocation, gridPoint.nLocation)
        hasHorizontalDiff = true
      } else if (gridPoint.leftPoint) {
        // 右の点がない場合（最右列）：左の点から現在の点へ
        vec2.subtract(differenceVec, gridPoint.nLocation, gridPoint.leftPoint.nLocation)
        hasHorizontalDiff = true
      }
      if (hasHorizontalDiff) {
        vec2.normalize(gridPoint.horizontalNormal, differenceVec)
      }
    }
  }

  // サブグリッドの点の位置を補間して設定
  const xDivision = subGridDivision
  const yDivision = subGridDivision
  const leftPos: Vec2 = [0, 0]
  const leftNormal: Vec2 = [0, 0]
  const leftControlPoint: Vec2 = [0, 0]
  const rightPos: Vec2 = [0, 0]
  const rightNormal: Vec2 = [0, 0]
  const rightControlPoint: Vec2 = [0, 0]
  const normalScale = 0.333 // 制御点の距離を調整する係数
  const leftLocationIPS = new Bezier2DCurveInterPolationSolver()
  const rightLocationIPS = new Bezier2DCurveInterPolationSolver()
  const xLocationIPS = new Bezier2DCurveInterPolationSolver()
  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
      if (gridPoint.belowPoint && gridPoint.rightPoint && gridPoint.diagonalPoint) {
        const belowPoint = gridPoint.belowPoint
        const rightPoint = gridPoint.rightPoint
        const diagonalPoint = gridPoint.diagonalPoint

        leftLocationIPS.initialize(
          gridPoint.nLocation,
          gridPoint.verticalNormal,
          belowPoint.nLocation,
          belowPoint.verticalNormal
        )

        rightLocationIPS.initialize(
          rightPoint.nLocation,
          rightPoint.verticalNormal,
          diagonalPoint.nLocation,
          diagonalPoint.verticalNormal
        )

        for (let subY = 0; subY < yDivision; subY++) {
          const verticalRate = subY / yDivision
          if (isLinearMode) {
            vec2.lerp(leftPos, gridPoint.nLocation, belowPoint.nLocation, verticalRate)
            vec2.lerp(rightPos, rightPoint.nLocation, diagonalPoint.nLocation, verticalRate)
          }
          else {
            leftLocationIPS.bezier2DInterpolation(leftPos, verticalRate)
            rightLocationIPS.bezier2DInterpolation(rightPos, verticalRate)

            vec2.lerp(leftNormal, gridPoint.horizontalNormal, belowPoint.horizontalNormal, verticalRate)
            vec2.lerp(rightNormal, rightPoint.horizontalNormal, diagonalPoint.horizontalNormal, verticalRate)

            xLocationIPS.initialize(
              leftPos,
              leftNormal,
              rightPos,
              rightNormal
            )
          }

          for (let subX = 0; subX < xDivision; subX++) {
            const subGridPoint = gridPoint.subGridRows[subY][subX]
            if (subGridPoint) {
              const horizontalRate = subX / xDivision
              if (isLinearMode) {
                vec2.lerp(subGridPoint.nLocation, leftPos, rightPos, horizontalRate)
              }
              else {
                xLocationIPS.bezier2DInterpolation(subGridPoint.nLocation, horizontalRate)
              }
            }
          }
        }
      }
      // 最下行
      else if (gridPoint.rightPoint) {
        const rightPoint = gridPoint.rightPoint

        if (!isLinearMode) {
          const leftToRight = vec2.distance(gridPoint.nLocation, rightPoint.nLocation)
          vec2.scale(leftNormal, gridPoint.horizontalNormal, leftToRight * normalScale)
          vec2.add(leftControlPoint, gridPoint.nLocation, leftNormal)
          vec2.scale(rightNormal, rightPoint.horizontalNormal, -leftToRight * normalScale)
          vec2.add(rightControlPoint, rightPoint.nLocation, rightNormal)
        }
        for (let subX = 0; subX < xDivision; subX++) {
          const subGridPoint = gridPoint.subGridRows[0][subX]
          if (subGridPoint) {
            const horizontalRate = subX / xDivision
            if (isLinearMode) {
              vec2.lerp(subGridPoint.nLocation, gridPoint.nLocation, rightPoint.nLocation, horizontalRate)
            }
            else {
              vec2BezierInterpolation(
                subGridPoint.nLocation,
                gridPoint.nLocation,
                leftControlPoint,
                rightControlPoint,
                rightPoint.nLocation,
                horizontalRate
              )
            }
          }
        }
      }
      // 最右列
      else if (gridPoint.belowPoint) {
        const belowPoint = gridPoint.belowPoint

        if (!isLinearMode) {
          const topToBottom = vec2.distance(gridPoint.nLocation, belowPoint.nLocation)
          vec2.scale(leftNormal, gridPoint.verticalNormal, topToBottom * normalScale)
          vec2.add(leftControlPoint, gridPoint.nLocation, leftNormal)
          vec2.scale(rightNormal, belowPoint.verticalNormal, -topToBottom * normalScale)
          vec2.add(rightControlPoint, belowPoint.nLocation, rightNormal)
        }
        for (let subY = 0; subY < yDivision; subY++) {
          const subGridPoint = gridPoint.subGridRows[subY][0]
          if (subGridPoint) {
            const verticalRate = subY / yDivision
            if (isLinearMode) {
              vec2.lerp(subGridPoint.nLocation, gridPoint.nLocation, belowPoint.nLocation, verticalRate)
            }
            else {
              vec2BezierInterpolation(
                subGridPoint.nLocation,
                gridPoint.nLocation,
                leftControlPoint,
                rightControlPoint,
                belowPoint.nLocation,
                verticalRate
              )
            }
          }
        }
      }
      // 右下端
      else {
        const subGridPoint = gridPoint.subGridRows[0][0]
        if (subGridPoint) {
          subGridPoint.nLocation[0] = gridPoint.nLocation[0]
          subGridPoint.nLocation[1] = gridPoint.nLocation[1]
        }
      }
    }
  }

  // 各サブグリッドの点に対して、水平・垂直方向の曲線上の位置を計算
  {
    for (let subX = 0; subX <= subGridMaxIndexH; subX++) {
      let totalVerticalLength = 0.0
      for (let subY = 0; subY <= subGridMaxIndexV; subY++) {
        const subPoint = subGridRows[subY][subX]
        if (subY === subGridMaxIndexV) {
          subPoint.curvePosition[1] = totalVerticalLength
        }
        else {
          const subPointNext = subGridRows[subY + 1][subX]
          subPoint.curvePosition[1] = totalVerticalLength
          totalVerticalLength += vec2.distance(subPoint.nLocation, subPointNext.nLocation)
        }
      }
    }
    for (let subY = 0; subY <= subGridMaxIndexV; subY++) {
      const subGridRow = subGridRows[subY]
      let totalHorizontalLength = 0.0
      for (let subX = 0; subX <= subGridMaxIndexH; subX++) {
        const subPoint = subGridRow[subX]
        if (subX === subGridMaxIndexH) {
          subPoint.curvePosition[0] = totalHorizontalLength
        }
        else {
          const subPointNext = subGridRow[subX + 1]
          subPoint.curvePosition[0] = totalHorizontalLength
          totalHorizontalLength += vec2.distance(subPoint.nLocation, subPointNext.nLocation)
        }
      }
    }
  }

  // 元グリッドの各点に対して、サブグリッドの一番左上の点の曲線上の位置を設定
  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
      const originSubGridPoint = gridPoint.subGridRows[0][0]
      gridPoint.curvePosition[0] = originSubGridPoint.curvePosition[0]
      gridPoint.curvePosition[1] = originSubGridPoint.curvePosition[1]
    }
  }

  const colorIPS = new Bezier2DCurveInterPolationSolver()
  // isLinearMode = true
  // 縦方向の色の補間
  // 0: R, 1: G, 2: B, 3: A
  for (let colorIndex = 0; colorIndex < 4; colorIndex++) {
    // 0: 水平方向, 1: 垂直方向
    const curvePositionIndex = 1
    // 色の位置を設定
    for (const gridRow of gridRows) {
      for (const gridPoint of gridRow) {
        gridPoint.colorLocation[0] = gridPoint.curvePosition[curvePositionIndex]
        gridPoint.colorLocation[1] = gridPoint.color[colorIndex]
        if (colorIndex != 3) {
          // gridPoint.colorLocation[1] *= gridPoint.color[3] // 乗算済みアルファに変換
        }
      }
    }
    // 色の法線を計算
    for (const gridRow of gridRows) {
      for (const gridPoint of gridRow) {
        // 垂直方向のベクトル（上の点から下の点への差分）
        if (gridPoint.abovePoint && gridPoint.belowPoint) {
          calculateColorNormalBetween(gridPoint, gridPoint.abovePoint, gridPoint.belowPoint)
        } else if (gridPoint.belowPoint) {
          // 上の点がない場合（最上段）：現在の点から下の点へ
          calculateColorNormalBetween(gridPoint, gridPoint, gridPoint.belowPoint)
        } else if (gridPoint.abovePoint) {
          // 下の点がない場合（最下段）：上の点から現在の点へ
          calculateColorNormalBetween(gridPoint, gridPoint.abovePoint, gridPoint)
        }
      }
    }
    // 色の補間
    for (const gridRow of gridRows) {
      for (const gridPoint of gridRow) {
        const toGridPoint = gridPoint.belowPoint
        if (toGridPoint) {
          if (!isLinearMode) {
            colorIPS.initialize(
              gridPoint.colorLocation,
              gridPoint.colorNormal,
              toGridPoint.colorLocation,
              toGridPoint.colorNormal
            )
          }
          for (let subIndex = 0; subIndex < yDivision; subIndex++) {
            const subGridPoint = gridPoint.subGridRows[subIndex][0]
            if (subGridPoint) {
              if (isLinearMode) {
                subGridPoint.color[colorIndex] = Maths.lerp(
                  gridPoint.color[colorIndex],
                  toGridPoint.color[colorIndex],
                  subIndex / yDivision
                )
                continue
              }
              const t = Maths.reverseBezierInterpolation(
                colorIPS.vec1[0],
                colorIPS.vec2[0],
                colorIPS.vec3[0],
                colorIPS.vec4[0],
                subGridPoint.curvePosition[curvePositionIndex]
              )
              if  (t >= 0.0 && t <= 1.0) {
                const colorValue = Maths.bezierInterpolation(
                  colorIPS.vec1[1],
                  colorIPS.vec2[1],
                  colorIPS.vec3[1],
                  colorIPS.vec4[1],
                  t
                )
                subGridPoint.color[colorIndex] = Maths.clamp(colorValue, 0.0, 1.0)
              }
              else {
                subGridPoint.color[colorIndex] = gridPoint.color[colorIndex] * 0
              }
              // DEBUG
              // subGridPoint.color[colorIndex] = 1.0
              // subGridPoint.color[colorIndex] = gridPoint.curvePosition[curvePositionIndex]
              // subGridPoint.color[colorIndex] = toGridPoint.curvePosition[curvePositionIndex]
              // subGridPoint.color[colorIndex] = (subGridPoint.curvePosition[curvePositionIndex] - gridPoint.curvePosition[curvePositionIndex])
              //   / (toGridPoint.curvePosition[curvePositionIndex] - gridPoint.curvePosition[curvePositionIndex])
              // subGridPoint.color[colorIndex] = gridPoint.colorLocation[0]
              // subGridPoint.color[colorIndex] = gridPoint.colorLocation[1]
              // subGridPoint.color[colorIndex] = toGridPoint.colorLocation[0]
              // subGridPoint.color[colorIndex] = toGridPoint.colorLocation[1]
              // subGridPoint.color[colorIndex] = colorIPOSet.vec1[1]
              // subGridPoint.color[colorIndex] = colorIPOSet.vec2[1]
              // subGridPoint.color[colorIndex] = colorIPOSet.vec3[1]
              // subGridPoint.color[colorIndex] = colorIPOSet.vec4[1]
              // DEBUG
            }
          }
        }
        else {
          const subGridPoint = gridPoint.subGridRows[0][0]
          if (subGridPoint) {
            subGridPoint.color[colorIndex] = gridPoint.color[colorIndex]
          }
        }
      }
    }
  }

  isLinearMode = false
  // 横方向の色の補間
  // 0: R, 1: G, 2: B, 3: A
  for (let colorIndex = 0; colorIndex < 4; colorIndex++) {
    // 0: 水平方向, 1: 垂直方向
    const curvePositionIndex = 0;
    // 色の位置を設定
    for (const gridRow of gridRows) {
      for (const gridPoint of gridRow) {
        for (let subY = 0; subY < gridPoint.subGridRows.length; subY++) {
          const subGridPoint = gridPoint.subGridRows[subY][0]
          subGridPoint.colorLocation[0] = subGridPoint.curvePosition[curvePositionIndex]
          subGridPoint.colorLocation[1] = subGridPoint.color[colorIndex]
        }
      }
    }
    // 色の法線を計算
    for (const gridRow of gridRows) {
      for (const gridPoint of gridRow) {
        for (let subY = 0; subY < gridPoint.subGridRows.length; subY++) {
          const subGridPoint = gridPoint.subGridRows[subY][0]
          // 水平方向のベクトル（左の点から右の点への差分）
          if (gridPoint.leftPoint && gridPoint.rightPoint) {
            const leftSubGridPoint = gridPoint.leftPoint.subGridRows[subY][0]
            const rightSubGridPoint = gridPoint.rightPoint.subGridRows[subY][0]
            calculateColorNormalBetween(subGridPoint, leftSubGridPoint, rightSubGridPoint)
          } else if (gridPoint.rightPoint) {
            // 左の点がない場合（最左列）：現在の点から右の点へ
            const leftSubGridPoint = gridPoint.subGridRows[subY][0]
            const rightSubGridPoint = gridPoint.rightPoint.subGridRows[subY][0]
            calculateColorNormalBetween(subGridPoint, leftSubGridPoint, rightSubGridPoint)
          } else if (gridPoint.leftPoint) {
            // 右の点がない場合（最右列）：左の点から現在の点へ
            const leftSubGridPoint = gridPoint.leftPoint.subGridRows[subY][0]
            const rightSubGridPoint = gridPoint.subGridRows[subY][0]
            calculateColorNormalBetween(subGridPoint, leftSubGridPoint, rightSubGridPoint)
          }
        }
      }
    }
    // 色の補間
    for (const gridRow of gridRows) {
      for (const gridPoint of gridRow) {
        const toGridPoint = gridPoint.rightPoint
        if (toGridPoint) {
          for (let subY = 0; subY < gridPoint.subGridRows.length; subY++) {
            const leftSubGridPoint = gridPoint.subGridRows[subY][0]
            const rightSubGridPoint = toGridPoint.subGridRows[subY][0]
            if (!isLinearMode) {
              colorIPS.initialize(
                leftSubGridPoint.colorLocation,
                leftSubGridPoint.colorNormal,
                rightSubGridPoint.colorLocation,
                rightSubGridPoint.colorNormal
              )
            }
            for (let subX = 1; subX < xDivision; subX++) {
              const subGridPoint = gridPoint.subGridRows[subY][subX]
              if (subGridPoint) {
                if (isLinearMode) {
                  subGridPoint.color[colorIndex] = Maths.lerp(
                    leftSubGridPoint.color[colorIndex],
                    rightSubGridPoint.color[colorIndex],
                    subX / xDivision
                  )
                  continue
                }
                const t = Maths.reverseBezierInterpolation(
                  colorIPS.vec1[0],
                  colorIPS.vec2[0],
                  colorIPS.vec3[0],
                  colorIPS.vec4[0],
                  subGridPoint.curvePosition[curvePositionIndex]
                )
                if  (t >= 0.0 && t <= 1.0) {
                  const colorValue = Maths.bezierInterpolation(
                    colorIPS.vec1[1],
                    colorIPS.vec2[1],
                    colorIPS.vec3[1],
                    colorIPS.vec4[1],
                    t
                  )
                  subGridPoint.color[colorIndex] = Maths.clamp(colorValue, 0.0, 1.0)
                }
                else {
                  subGridPoint.color[colorIndex] = gridPoint.color[colorIndex]
                }
                // DEBUG
                // subGridPoint.color[colorIndex] = 1.0
                // subGridPoint.color[colorIndex] = leftSubGridPoint.curvePosition[curvePositionIndex]
                // subGridPoint.color[colorIndex] = rightSubGridPoint.curvePosition[curvePositionIndex]
                // subGridPoint.color[colorIndex] = (subGridPoint.curvePosition[curvePositionIndex] - leftSubGridPoint.curvePosition[curvePositionIndex])
                //   / (rightSubGridPoint.curvePosition[curvePositionIndex] - leftSubGridPoint.curvePosition[curvePositionIndex])
                // subGridPoint.color[colorIndex] = leftSubGridPoint.colorLocation[0]
                // subGridPoint.color[colorIndex] = leftSubGridPoint.colorLocation[1]
                // subGridPoint.color[colorIndex] = rightSubGridPoint.colorLocation[0]
                // subGridPoint.color[colorIndex] = rightSubGridPoint.colorLocation[1]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec1[0]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec1[1]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec2[0]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec2[1]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec3[0]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec3[1]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec4[0]
                // subGridPoint.color[colorIndex] = colorIPOSet.vec4[1]
                // DEBUG
              }
            }
          }
        }
      }
    }
  }

  // サブグリッドの点のビットマップ上の位置を計算
  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
      for (const subGridRow of gridPoint.subGridRows) {
        for (const subGridPoint of subGridRow) {
          if (subGridPoint) {
            subGridPoint.dispLocation[0] = Math.floor(subGridPoint.nLocation[0] * displayDimension[0])
            subGridPoint.dispLocation[1] = Math.floor(subGridPoint.nLocation[1] * displayDimension[1])
          }
        }
      }
    }
  }
}

function calculateColorNormalBetween(resultGridPoint: GridPoint, fromGridPoint: GridPoint, toGridPoint: GridPoint) {
  vec2.subtract(resultGridPoint.colorNormal, toGridPoint.colorLocation, fromGridPoint.colorLocation)
  vec2.normalize(resultGridPoint.colorNormal, resultGridPoint.colorNormal)
}

// グリッド変形・色設定関数

function modifyGridDataByFishEye(gridRows: GridPoint[][], centerLocation: number[], radius: number, eraser: boolean) {
  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
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
  }

  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
      gridPoint.dispLocation[0] = Math.floor(gridPoint.location[0])
      gridPoint.dispLocation[1] = Math.floor(gridPoint.location[1])
    }
  }
}

function setRadialGradation(gridRows: GridPoint[][], centerLocation: number[], radius: number, color: number[], brush_alpha: number) {

  for (const gridRow of gridRows) {
    for (const gridPoint of gridRow) {
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

function calclatePointLineParameter(point: GridPoint) {
  calclateLineParameter(point.line1, point, point.rightPoint)
  calclateLineParameter(point.line2, point.belowPoint, point.diagonalPoint)
  calclateLineParameter(point.line3, point, point.belowPoint)
  calclateLineParameter(point.line4, point.rightPoint, point.diagonalPoint)
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

  // const offset = line1_param.minY * lineBytes + line1_param.minX * pixelBytes
  // pixData[offset + 1] = 255
  // pixData[offset + 3] = 255
}

function drawGridGradation(imageData: ImageData, gridRows: GridPoint[][]) {

  for (const gridRow of gridRows) {

    for (const gridPoint of gridRow) {

      if (!gridPoint.isDrawable) {
        continue
      }

      calclatePointLineParameter(gridPoint)

      drawQuadGradation(
        imageData,
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

function drawGridLines(gridData: GridPoint[][], lineColor: string, ctx: CanvasRenderingContext2D) {

  for (const gridRow of gridData) {
    for (const gridPoint of gridRow) {
      if (gridPoint.rightPoint) {
        drawLine(gridPoint.dispLocation[0] - 1, gridPoint.dispLocation[1], gridPoint.rightPoint.dispLocation[0] - 1, gridPoint.rightPoint.dispLocation[1], lineColor, ctx)
      }
      if (gridPoint.belowPoint) {
        drawLine(gridPoint.dispLocation[0], gridPoint.dispLocation[1] + 1, gridPoint.belowPoint.dispLocation[0], gridPoint.belowPoint.dispLocation[1] - 1, lineColor, ctx)
      }
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

function setRadioButtonEvent(name: string, callback: () => void) {
  elementsByName<HTMLInputElement>(name).forEach(button => {
    button.onclick = callback
  })
}

// メイン処理

function main() {

  const _displayDimension = [400, 400]

  const _gridData = createGridData({ left: 40, top: 40, gridSizeH: 3, gridSizeV: 3, cellSize: 100 })
  const subGridDivision = 6
  const _subGridData = initializeSubGridData(_gridData, subGridDivision)

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

  const _canvas = document.getElementById('canvas') as HTMLCanvasElement
  _canvas.width = _displayDimension[0]
  _canvas.height = _displayDimension[1]

  const _ctx = _canvas.getContext('2d', { antiAliasingEnabled: false }) as CanvasRenderingContext2D

  const _imageData = _ctx.createImageData(_canvas.width, _canvas.height)

  const _pointerLocation = [0, 0]

  function draw(drawBrush: boolean, eraser: boolean, ctx: CanvasRenderingContext2D) {

    const input_radius = getRangeValue('circle-radius', 1)
    const showGrid = getRadioButtonValue('show-grid')
    const modifyGridEnabled = getRadioButtonValue('modify-grid')
    const colorIndex = getRadioButtonValue('color')
    const vertexIpo = getRadioButtonValue('vertex-ipo')
    const isLinearVertexIpo = (vertexIpo === 1)

    ctx.clearRect(0, 0, _canvas.width, _canvas.height)

    clearImageData(_imageData.data)

    if (drawBrush) {
      if (modifyGridEnabled == 1) {
        modifyGridDataByFishEye(_gridData, _pointerLocation, input_radius, eraser)
      }
      const color = (eraser ? [0.0, 0.0, 0.0, 0.0] : _brushColors[colorIndex])
      const brush_alpha = (eraser ? 0.2 : 0.1)
      setRadialGradation(_gridData, _pointerLocation, input_radius, color, brush_alpha)
    }

    updateSubGridPoints(_gridData, _subGridData, subGridDivision, _displayDimension, isLinearVertexIpo)

    // drawGridGradation(_imageData, _gridData)
    drawGridGradation(_imageData, _subGridData)

    ctx.putImageData(_imageData, 0, 0)

    if (showGrid == 1) {
      drawGridLines(_subGridData, '255, 255, 255, 0.5', ctx)
      drawGridLines(_gridData, '255, 255, 0, 0.3', ctx)
    }

    showPrameterText()
  }

  function showPrameterText() {
    const input_radius = getRangeValue('circle-radius', 1)
    setText('input-text', `(${_pointerLocation[0].toFixed(1)}, ${_pointerLocation[1].toFixed(1)})`)
    setText('circle-radius-text', `${input_radius.toFixed(1)}`)
  }

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

  document.getElementById('circle-radius').onchange = () => {
    showPrameterText()
  }

  setRadioButtonEvent('show-grid', () => { draw(false, false, _ctx) })
  setRadioButtonEvent('vertex-ipo', () => { draw(false, false, _ctx) })

  draw(false, false, _ctx)
}

document.addEventListener('DOMContentLoaded', main);

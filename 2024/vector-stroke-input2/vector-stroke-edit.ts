import { VectorMath } from "./vector-math.js";
import { StrokePoint, VectorStroke } from "./vector-stroke.js";

/** 直角の個所でストロークを分割する処理のパラメータ */
interface SplitStrokeByRightAngleCornerParams {
  /** 入力した直後の点を処理の対象から除外する範囲 */
  nearInputIndexRange: number
  /** 直角として判定する最小角度[ラジアン]  
   * 90度に近いほど誤差を許容せず直角を判定する。感覚的に85度以上が妥当と思われる。 */
  cornerMininmuCurvingAngle: number
  /** 二つの点を一つの角として判定する曲がり角度の比  
   * 感覚的に2.0～3.0が妥当と思われる。 */
  combinationCornerDiferrenceRatio: number
  /** 二つの点の交点を求めるときの交点が離れた位置にできてしまうことを防ぐための最大距離  
   * レアケースでもあり値の決定が難しいが、あまり大きいと不自然になるためステップ距離と同程度にする。 */
  maxCornerCrossPointDistance: number
}

/** ベクトルストロークの編集処理ロジック */
export class VectorStrokeEditLogic {

  /** To位置(計算用) */
  private static toLocation: number[] = [0.0, 0.0];

  /** 交点位置(計算用) */
  private static crossingPoint: number[] = [0.0, 0.0];

  /** 指定した位置について、ストロークの末端の点との距離が短い場合は上書き、そうでない場合は点を追加する */
  static addOrReplacePointForMinDistance(stroke: VectorStroke, location: number[], stepDistance: number) {

    VectorMath.copy(this.toLocation, location);

    let lastPoint = stroke.getPointAtLastIndexOf(0);
    if (!lastPoint) {
      stroke.addPoint(location);
    }
    else if (lastPoint.isFixed) {
      stroke.addTempPoint(location);
    }
    else {
      let secondLastPoint = stroke.getPointAtLastIndexOf(1);
      if (secondLastPoint) {
        const distance = VectorMath.distance(secondLastPoint.location, this.toLocation);
        if (distance < stepDistance) {
          VectorMath.copy(lastPoint.location, this.toLocation);
        }
        else if (VectorMath.distance(lastPoint.location, this.toLocation) > 0.0) {
          lastPoint.isFixed = true;
          stroke.addTempPoint(location);
        }
      }
    }
  }

  /** ストロークの末尾の点のパラメータを更新 */
  static updateLastPointParameters(stroke: VectorStroke) {

    const points = stroke.points;
    const lastIndex = points.length - 1;

    if (lastIndex - 1 >= 0) {
      const p1 = points[lastIndex - 1];
      const p2 = points[lastIndex];
      p1.length = VectorMath.distance(p1.location, p2.location);
    }

    if (lastIndex - 2 >= 0) {
      const p1 = points[lastIndex - 2];
      const p2 = points[lastIndex - 1];
      const p3 = points[lastIndex];
      p2.totalLength = p1.totalLength + p2.length;
      p2.angle = VectorMath.angleOfCurving(p1.location, p2.location, p3.location);
    }
  }

  /** 指定したストロークの指定したインデクス以降の部分について、ステップ距離と角による最適化を適用したストロークを返す  
   * 
   */
  static getStepDistanceAndCornerOptimizedStroke(source_stroke: VectorStroke, baseStepDistance: number, fineStepDistance: number): VectorStroke {

    const startPointIndex = Math.max(source_stroke.points.length - 10, 0);
    const endPointIndx = source_stroke.points.length - 1;
    const maxLinearCurvingAngle = 30.0 / 180.0 * Math.PI;
    const minCornerCurvingAngle = (90.0 - 15.0) / 180.0 * Math.PI;

    // 開始位置から終了位置までの部分の最適化
    for (let index = startPointIndex; index <= endPointIndx; index++) {

      const point = source_stroke.points[index];

      // 現在の点の曲がり角度が一定以上で、かつ前後の一定範囲のセグメントが直線的である場合は角であると判定する
      point.isFixedCorner = false;
      const forward_pointIndex = VectorStrokeEditLogic.searchLinearSegment(source_stroke.points, index, true, fineStepDistance, maxLinearCurvingAngle);
      const backward_pointIndex = VectorStrokeEditLogic.searchLinearSegment(source_stroke.points, index, false, fineStepDistance, maxLinearCurvingAngle);
      // 前後両方とも直線的である場合、現在の点と前後の点から曲がり角が一定以上であるかで角であるか判定する
      if (forward_pointIndex != -1 && backward_pointIndex != -1) {
        const p1 = source_stroke.points[forward_pointIndex];
        const p2 = point;
        const p3 = source_stroke.points[backward_pointIndex];
        const angle = VectorMath.angleOfCurving(p1.location, p2.location, p3.location);
        if (Math.abs(angle) >= minCornerCurvingAngle) {
          point.isFixedCorner = true;
        }
      }
    }

    // 連続する角を一つにまとめる
    for (let index = 0; index <= endPointIndx; index++) {
      const point = source_stroke.points[index];
      if (point.isFixedCorner) {
        // 角として判定済みの点が連続している範囲を検索する
        let lastCornerPointIndex = -1;
        for (let searchIndex = index + 1; searchIndex <= endPointIndx; searchIndex++) {
          const searchPoint = source_stroke.points[searchIndex];
          if (searchPoint.isFixedCorner) {
            lastCornerPointIndex = searchIndex;
          }
          else {
            break;
          }
        }
        if (lastCornerPointIndex != -1) {
          const lastCornerPoint = source_stroke.points[lastCornerPointIndex];
          // 二点間の直線から最も距離が遠い点を検索する
          let farthestPointIndex = -1;
          let farthestDistance = 0.0;
          for (let searchIndex = index; searchIndex <= lastCornerPointIndex; searchIndex++) {
            const searchPoint = source_stroke.points[searchIndex];
            const distance = VectorMath.distanceOfLineAndPoint(point.location, lastCornerPoint.location, searchPoint.location);
            if (distance >= farthestDistance) {
              farthestDistance = distance;
              farthestPointIndex = searchIndex;
            }
          }
          // 無ければ中心の点を選択する
          if (farthestPointIndex != -1) {
            farthestPointIndex = Math.floor((lastCornerPointIndex - index) / 2) + index;
          }
          // 最も遠い点以外の点を角として判定しないように上書き
          if (farthestPointIndex != -1) {
            for (let searchIndex = index; searchIndex <= lastCornerPointIndex; searchIndex++) {
              if (searchIndex != farthestPointIndex) {
                source_stroke.points[searchIndex].isFixedCorner = false;
              }
            }
          }
          index = lastCornerPointIndex;
        }
      }
    }

    // 開始位置から終了位置までの部分の最適化
    const optimized_strokes = new VectorStroke();
    let lastUsedPoint: StrokePoint | null = null;
    for (let index = 0; index <= endPointIndx; index++) {

      const point = source_stroke.points[index];
      const isFirst = (index == 0);
      const isLast = (index == endPointIndx);

      // 最初と最後の点は常に使用する
      let useCurrentPoint = (isFirst || isLast);

      // 角として判定済みの点は使用する
      if (point.isFixedCorner) {
        useCurrentPoint = true;
      }

      // ステップ距離による判定を行い、一定以上距離があれば現在の点を使用する
      if (!useCurrentPoint && lastUsedPoint) {
        const distance = VectorMath.distance(lastUsedPoint.location, point.location);
        if (distance >= baseStepDistance) {
          useCurrentPoint = true;
        }
      }

      if (useCurrentPoint) {
          optimized_strokes.points.push(point.clone());
          VectorStrokeEditLogic.updateLastPointParameters(optimized_strokes);
          lastUsedPoint = point;
      }
    }

    return optimized_strokes
  }

  /** 指定した点群の指定した範囲の部分が直線的である部分を検索し、最後の点のインデックスを返す */
  private static searchLinearSegment(points: StrokePoint[], startIndex: number, isForwardSearch: boolean, stepDistance: number, maxCurvingAngle: number): number {

    let resultIndex = -1;

    let lastPoint: StrokePoint | null = null;
    let firstPoint: StrokePoint | null = null;
    let secondPoint: StrokePoint | null = null;
    const endIndex = points.length - 1;
    for (let index = startIndex; index >= 0 && index <= endIndex;) {

      const currentPoint = points[index];

      if (lastPoint) {
        // ステップ距離以内の点はスキップする
        const distance = VectorMath.distance(lastPoint.location, currentPoint.location);
        if (distance >= stepDistance) {
          // 2ステップ進んだところで二つ目の点の曲がり角度が一定以下である場合は直線であると判定する
          if (firstPoint && secondPoint) {
            const p1 = firstPoint;
            const p2 = secondPoint;
            const p3 = currentPoint;
            const angle = VectorMath.angleOfCurving(p1.location, p2.location, p3.location);
            if (Math.abs(angle) <= maxCurvingAngle) {
              resultIndex = index;
            }
            break;
          }
          else {
            secondPoint = currentPoint;
            lastPoint = currentPoint;
          }
        }
      }
      else {
        firstPoint = currentPoint;
        lastPoint = currentPoint;
      }

      index += (isForwardSearch ? 1 : -1);
    }

    return resultIndex;
  }

  /** ストロークを直角の個所で分割したリストを返す */
  static splitStrokeByRightAngleCorner(source_stroke: VectorStroke,
    {
      nearInputIndexRange, cornerMininmuCurvingAngle,
      combinationCornerDiferrenceRatio, maxCornerCrossPointDistance,
    }: SplitStrokeByRightAngleCornerParams
  ): VectorStroke[] {

    const result: VectorStroke[] = []

    /** 角の判定を行う頂点のインデクスのオフセット */
    const cornerReferenceIndexOffset = 2

    let currentPart_startIndex = 0
    let last_curvingAngle = 0.0
    let lastUsed_crossingPoint: StrokePoint | null = null

    const maxIndex = source_stroke.points.length - 1
    let pointIndex = 1
    while (pointIndex <= maxIndex) {

      const currentPoint = source_stroke.points[pointIndex]

      const current_curvingAngle = Math.abs(currentPoint.angle)
      const total_curvingAngle = Math.abs(current_curvingAngle + last_curvingAngle)

      // 前段の処理で角として判定されているか、最後の点は必ず使用する
      const isFixedCorner = currentPoint.isFixedCorner;
      const isLastPoint = (pointIndex == maxIndex)
      const isFiexdPoint = (isLastPoint || isFixedCorner)

      // 角の判定
      let isCorner = false
      if (!isFiexdPoint) {
        // 角の判定を行うことができる範囲にあるかどうか
        const isInCornerCheckRange = (pointIndex - cornerReferenceIndexOffset >= 0 && pointIndex + cornerReferenceIndexOffset - 1 <= maxIndex)
        // 入力したばかりの部分は角の処理は行わずそのまま表示したほうが入力操作がしやすいため角としない
        const isInNearInputRange = (pointIndex >= maxIndex - nearInputIndexRange)
        if (!isInNearInputRange && isInCornerCheckRange) {
          // 直近２点の曲がり角度の合計が一定以上である場合、角と判定する
          if (total_curvingAngle >= cornerMininmuCurvingAngle) {
            isCorner = true
          }
        }
      }

      // 分割したストロークを生成する
      if (isFiexdPoint || isCorner) {

        // 二つの点で構成された角でより正確な角の位置をとるため、角の近傍の線分の延長線上の交点を計算する
        let crossingPoint: StrokePoint | null = null
        if (!isFiexdPoint) {

           // 二つの点における曲がり角度にn倍以上の違いが無い場合、二つの点で構成された角であると判定する
          const nearby_max_curvingAngle = Math.max(current_curvingAngle, last_curvingAngle)
          const nearby_min_curvingAngle = Math.min(current_curvingAngle, last_curvingAngle)
          const isTwoPointCorner = (nearby_max_curvingAngle < nearby_min_curvingAngle * combinationCornerDiferrenceRatio)

          if (isTwoPointCorner
            && pointIndex - 2 >= 0 && pointIndex + 1 <= maxIndex
          ) {

            // 角を構成する二つの線分の交点を計算
            const backward_point1 = source_stroke.points[pointIndex - cornerReferenceIndexOffset]
            const backward_point2 = source_stroke.points[pointIndex - cornerReferenceIndexOffset + 1]
            const forward_point1 = source_stroke.points[pointIndex]
            const forward_point2 = source_stroke.points[pointIndex + cornerReferenceIndexOffset - 1]

            let isAvailable = VectorMath.crossPoint(this.crossingPoint,
              backward_point1.location, backward_point2.location,
              forward_point1.location, forward_point2.location
            )

            if (VectorMath.distance(this.crossingPoint, backward_point2.location) > maxCornerCrossPointDistance) {
              // 角を構成する線が並行に近く、交点が非常に遠くになってしまう場合への対応
              isAvailable = false
            }

            if (isAvailable) {
              crossingPoint = currentPoint.clone()
              VectorMath.copy(crossingPoint.location, this.crossingPoint)
            }
          }
        }

        // 今回のパートの最後の点のインデクスを決定する
        let currentPart_endIndex = pointIndex
        if (isLastPoint) {
          currentPart_endIndex = maxIndex
        }
        else if (isFixedCorner) {
          currentPart_endIndex = pointIndex
        }
        else if (crossingPoint != null) {
          currentPart_endIndex = pointIndex - 1 // 交点が追加されて分割する場合、現在の一つ前のインデクスが現在のパートの最後の点となる
        }
        else if (Math.abs(last_curvingAngle) > Math.abs(current_curvingAngle)) {
          currentPart_endIndex = pointIndex - 1 // 二つの点で構成される角で、前の点の角度が大きい場合は前の点が現在のパートの最後の点となる
        }

        // 新しいストローク
        const newStroke = new VectorStroke()

        // 前のストロークの際に端点が交点から作成されていた場合、その交点が新しいパートの
        // 開始位置であるため、それを新しいストロークの最初に追加する
        if (lastUsed_crossingPoint != null) {
          newStroke.points.push(lastUsed_crossingPoint.clone())
          lastUsed_crossingPoint = null
        }

        // 今回の角までのストロークの点を新しいストロークにコピー
        for (let index = currentPart_startIndex; index <= currentPart_endIndex; index++) {
          const point = source_stroke.points[index]
          newStroke.points.push(point.clone())
        }

        // 作成した交点をストロークの末尾に追加。また、次のストロークの開始点として記憶する
        if (crossingPoint != null) {
          newStroke.points.push(crossingPoint)
          lastUsed_crossingPoint = crossingPoint
        }

        // 最後の点のインデクスを記憶する。これが次のストロークの開始位置となる
        if (crossingPoint != null) {
          currentPart_startIndex = currentPart_endIndex + 1
        }
        else {
          currentPart_startIndex = currentPart_endIndex
        }

        // 新しいストロークを結果リストに追加
        result.push(newStroke)

        if (pointIndex < maxIndex - 1) {
          pointIndex++ // 次の頂点で連続して分割されないようスキップ
          last_curvingAngle = 0.0 // 次の頂点で連続して分割されないよう曲がり角度をリセット
        }
      }
      else {
        last_curvingAngle = current_curvingAngle
      }

      pointIndex++
    }

    return result
  }
}

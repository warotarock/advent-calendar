import { VectorMath } from "./vector-math.js";
import { VectorStroke } from "./vector-stroke.js";
/** ベクトルストロークの編集処理ロジック */
export class VectorStrokeEditLogic {
    /** 与えられたストロークの頂点の長さなどのパラメータを計算する */
    static calculatePointParameters(points) {
        if (points.length < 2) {
            for (const p of points) {
                p.length = 0.0;
                p.totalLength = 0.0;
            }
            return;
        }
        let totalLength = 0.0;
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            p2.length = VectorMath.distance(p1.location, p2.location);
            p2.totalLength = totalLength += p2.length;
        }
    }
    /** 指定した位置について、ストロークの末端の点との距離が短い場合は上書き、そうでない場合は点を追加する */
    static addOrReplacePointForMinDistance(stroke, location, stepDistance) {
        const lastPoint = stroke.getSecondLastPoint();
        if (lastPoint) {
            VectorMath.set(this.toLocation, location[0], location[1]);
            const distance = VectorMath.distance(lastPoint.location, this.toLocation);
            const overWriteLastPointLocation = (distance < stepDistance);
            if (overWriteLastPointLocation) {
                stroke.points.pop();
            }
        }
        stroke.addPoint(location);
    }
    /** ストロークの最後から２番目の点の曲がり角度を計算して上書きする */
    static updateLastPointParameters(stroke) {
        const points = stroke.points;
        if (points.length > 2) {
            const p1 = points[points.length - 2];
            const p2 = points[points.length - 1];
            p1.length = VectorMath.distance(p1.location, p2.location);
        }
        if (points.length >= 3) {
            const p1 = points[points.length - 3];
            const p2 = points[points.length - 2];
            const p3 = points[points.length - 1];
            p2.totalLength = p1.totalLength + p2.length;
            p2.angle = VectorMath.angleOfCurving(p1.location, p2.location, p3.location);
        }
    }
    /** ストロークを直角の個所で分割したリストを返す */
    static splitStrokeByRightAngleCorner(source_stroke, { nearInputIndexRange, cornerMininmuCurvingAngle, combinationCornerDiferrenceRatio, maxCornerCrossPointDistance, }) {
        const result = [];
        /** 角の判定を行う頂点のインデクスのオフセット */
        const cornerReferenceIndexOffset = 2;
        let currentPart_startIndex = 0;
        let last_curvingAngle = 0.0;
        let lastUsed_crossingPoint = null;
        const maxIndex = source_stroke.points.length - 1;
        let pointIndex = 1;
        while (pointIndex <= maxIndex) {
            const currentPoint = source_stroke.points[pointIndex];
            const current_curvingAngle = Math.abs(currentPoint.angle);
            const total_curvingAngle = Math.abs(current_curvingAngle + last_curvingAngle);
            // 角の判定を行うことができる範囲にあるかどうか
            const isInCornerCheckRange = (pointIndex - cornerReferenceIndexOffset >= 0 && pointIndex + cornerReferenceIndexOffset - 1 <= maxIndex);
            // 入力したばかりの部分は角の処理は行わずそのまま表示したほうが入力操作がしやすいため角としない
            const isInNearInputRange = (pointIndex >= maxIndex - nearInputIndexRange);
            // 条件に合う場合、角の判定を行う
            let isCorner = false;
            if (!isInNearInputRange && isInCornerCheckRange) {
                // 直近２点の曲がり角度の合計が一定以上である場合、角と判定する
                if (total_curvingAngle >= cornerMininmuCurvingAngle) {
                    isCorner = true;
                }
            }
            // 角であればストロークを分割して生成する。もしくはストロークの最後であればそのままストロークを生成する
            const isLastPoint = (pointIndex == maxIndex);
            if (isCorner || isLastPoint) {
                // 二つの点で構成された角でより正確な角の位置をとるため、角の近傍の線分の延長線上の交点を計算する
                let crossingPoint = null;
                if (!isLastPoint) {
                    // 二つの点における曲がり角度にn倍以上の違いが無い場合、二つの点で構成された角であると判定する
                    const nearby_max_curvingAngle = Math.max(current_curvingAngle, last_curvingAngle);
                    const nearby_min_curvingAngle = Math.min(current_curvingAngle, last_curvingAngle);
                    const isTwoPointCorner = (nearby_max_curvingAngle < nearby_min_curvingAngle * combinationCornerDiferrenceRatio);
                    if (isTwoPointCorner
                        && pointIndex - 2 >= 0 && pointIndex + 1 <= maxIndex) {
                        // 角を構成する二つの線分の交点を計算
                        const backward_point1 = source_stroke.points[pointIndex - cornerReferenceIndexOffset];
                        const backward_point2 = source_stroke.points[pointIndex - cornerReferenceIndexOffset + 1];
                        const forward_point1 = source_stroke.points[pointIndex];
                        const forward_point2 = source_stroke.points[pointIndex + cornerReferenceIndexOffset - 1];
                        let isAvailable = VectorMath.crossPoint(this.crossingPoint, backward_point1.location[0], backward_point1.location[1], backward_point2.location[0], backward_point2.location[1], forward_point1.location[0], forward_point1.location[1], forward_point2.location[0], forward_point2.location[1]);
                        if (VectorMath.distance(this.crossingPoint, backward_point2.location) > maxCornerCrossPointDistance) {
                            // 角を構成する線が並行に近く、交点が非常に遠くになってしまう場合への対応
                            isAvailable = false;
                        }
                        if (isAvailable) {
                            crossingPoint = currentPoint.clone();
                            VectorMath.copy(crossingPoint.location, this.crossingPoint);
                        }
                    }
                }
                // 今回のパートの最後の点のインデクスを決定する
                let currentPart_endIndex = pointIndex;
                if (isLastPoint) {
                    currentPart_endIndex = maxIndex;
                }
                else if (crossingPoint != null) {
                    currentPart_endIndex = pointIndex - 1; // 交点が追加されて分割する場合、現在の一つ前のインデクスが現在のパートの最後の点となる
                }
                else if (Math.abs(last_curvingAngle) > Math.abs(current_curvingAngle)) {
                    currentPart_endIndex = pointIndex - 1; // 二つの点で構成される角で、前の点の角度が大きい場合は前の点が現在のパートの最後の点となる
                }
                // 新しいストローク
                const newStroke = new VectorStroke();
                // 前のストロークの際に端点が交点から作成されていた場合、その交点が新しいパートの
                // 開始位置であるため、それを新しいストロークの最初に追加する
                if (lastUsed_crossingPoint != null) {
                    newStroke.points.push(lastUsed_crossingPoint.clone());
                    lastUsed_crossingPoint = null;
                }
                // 今回の角までのストロークの点を新しいストロークにコピー
                for (let index = currentPart_startIndex; index <= currentPart_endIndex; index++) {
                    const point = source_stroke.points[index];
                    newStroke.points.push(point.clone());
                }
                // 作成した交点をストロークの末尾に追加。また、次のストロークの開始点として記憶する
                if (crossingPoint != null) {
                    newStroke.points.push(crossingPoint);
                    lastUsed_crossingPoint = crossingPoint;
                }
                // 最後の点のインデクスを記憶する。これが次のストロークの開始位置となる
                if (crossingPoint != null) {
                    currentPart_startIndex = currentPart_endIndex + 1;
                }
                else {
                    currentPart_startIndex = currentPart_endIndex;
                }
                // 新しいストロークを結果リストに追加
                result.push(newStroke);
                pointIndex++; // 次の頂点で連続して分割されないようスキップ
                last_curvingAngle = 0.0; // 次の頂点で連続して分割されないよう曲率をリセッ
            }
            else {
                last_curvingAngle = current_curvingAngle;
            }
            pointIndex++;
        }
        return result;
    }
}
/** To位置(計算用) */
VectorStrokeEditLogic.toLocation = [0.0, 0.0];
/** To位置(計算用) */
VectorStrokeEditLogic.crossingPoint = [0.0, 0.0];
//# sourceMappingURL=vector-stroke-edit.js.map
import { VectorMath } from "./vector-math.js";
/** ストローク頂点 */
export class StrokePoint {
    constructor(x, y) {
        /** 頂点の位置 */
        this.location = [0.0, 0.0];
        /** スムージング処理中の位置 */
        this.adjustingLocation = [0.0, 0.0];
        /** この頂点から次の頂点までの辺の長さ */
        this.length = 0.0;
        /** ストロークの開始からこの頂点までの辺の長さの合計（この頂点から伸びる辺の長さは含まない） */
        this.totalLength = 0.0;
        /** この頂点の位置でストロークが曲がっている角度（ラジアン） */
        this.angle = 0.0;
        this.location[0] = x;
        this.location[1] = y;
    }
    applyAdjustingLocation() {
        VectorMath.copy(this.location, this.adjustingLocation);
    }
    clone() {
        const p = new StrokePoint(this.location[0], this.location[1]);
        p.angle = this.angle;
        p.length = this.length;
        p.totalLength = this.totalLength;
        return p;
    }
}
/** ストローク */
export class VectorStroke {
    constructor() {
        /** ストロークの頂点 */
        this.points = [];
    }
    /** 頂点を追加する */
    addPoint(location) {
        this.points.push(new StrokePoint(location[0], location[1]));
    }
    /** 最後から２番目の頂点を取得
     * 頂点が二つ以上ない場合はnullを返す。 */
    getSecondLastPoint() {
        return this.points.length >= 2 ? this.points[this.points.length - 2] : null;
    }
}
//# sourceMappingURL=vector-stroke.js.map
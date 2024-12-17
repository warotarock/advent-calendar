/** ストローク頂点 */
export class StrokePoint {
    constructor(x, y) {
        /** 点の位置 */
        this.location = [0.0, 0.0];
        /** この点から次の点までの辺の長さ */
        this.length = 0.0;
        /** ストロークの開始からこの点までの辺の長さの合計（この点から伸びる辺の長さは含まない） */
        this.totalLength = 0.0;
        /** この点の位置でストロークが曲がっている角度（ラジアン） */
        this.angle = 0.0;
        /** 点をストロークに追加している処理でこの点が確定された場合true */
        this.isFixed = true;
        /** この頂点が角として判定された場合true */
        this.isFixedCorner = false;
        this.location[0] = x;
        this.location[1] = y;
    }
    clone() {
        const p = new StrokePoint(this.location[0], this.location[1]);
        p.angle = this.angle;
        p.length = this.length;
        p.totalLength = this.totalLength;
        p.isFixed = this.isFixed;
        p.isFixedCorner = this.isFixedCorner;
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
    /** 頂点を追加する */
    addTempPoint(location) {
        const newPoint = new StrokePoint(location[0], location[1]);
        newPoint.isFixed = false;
        this.points.push(newPoint);
    }
    /** 最後からn番目の頂点を取得
     * 頂点がn個以上ない場合はnullを返す。 */
    getPointAtLastIndexOf(n = 1) {
        return this.points.length - 1 - n >= 0 ? this.points[this.points.length - 1 - n] : null;
    }
}
//# sourceMappingURL=vector-stroke.js.map
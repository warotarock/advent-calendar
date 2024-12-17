
/** ストローク頂点 */
export class StrokePoint {

  /** 点の位置 */
  location: number[] = [0.0, 0.0];

  /** この点から次の点までの辺の長さ */
  length: number = 0.0;

  /** ストロークの開始からこの点までの辺の長さの合計（この点から伸びる辺の長さは含まない） */
  totalLength: number = 0.0;

  /** この点の位置でストロークが曲がっている角度（ラジアン） */
  angle: number = 0.0;

  /** 点をストロークに追加している処理でこの点が確定された場合true */
  isFixed = true

  /** この頂点が角として判定された場合true */
  isFixedCorner = false;

  constructor(x: number, y: number) {
    this.location[0] = x;
    this.location[1] = y;
  }

  clone(): StrokePoint {
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

  /** ストロークの頂点 */
  points: StrokePoint[] = [];

  /** 頂点を追加する */
  addPoint(location: number[]) {
    this.points.push(new StrokePoint(location[0], location[1]));
  }

  /** 頂点を追加する */
  addTempPoint(location: number[]) {
    const newPoint = new StrokePoint(location[0], location[1]);
    newPoint.isFixed = false;
    this.points.push(newPoint);
  }

  /** 最後からn番目の頂点を取得  
   * 頂点がn個以上ない場合はnullを返す。 */
  getPointAtLastIndexOf(n = 1): StrokePoint | null {
    return this.points.length - 1 - n >= 0 ? this.points[this.points.length - 1 - n] : null;
  }
}

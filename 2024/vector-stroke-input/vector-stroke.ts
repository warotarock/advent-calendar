import { VectorMath } from "./vector-math.js";

/** ストローク頂点 */
export class StrokePoint {

  /** 頂点の位置 */
  location: number[] = [0.0, 0.0];

  /** スムージング処理中の位置 */
  adjustingLocation: number[] = [0.0, 0.0];

  /** この頂点から次の頂点までの辺の長さ */
  length: number = 0.0;

  /** ストロークの開始からこの頂点までの辺の長さの合計（この頂点から伸びる辺の長さは含まない） */
  totalLength: number = 0.0;

  /** この頂点の位置でストロークが曲がっている角度（ラジアン） */
  angle: number = 0.0;

  constructor(x: number, y: number) {
    this.location[0] = x;
    this.location[1] = y;
  }

  applyAdjustingLocation() {
    VectorMath.copy(this.location, this.adjustingLocation);
  }

  clone(): StrokePoint {
    const p = new StrokePoint(this.location[0], this.location[1]);
    p.angle = this.angle;
    p.length = this.length;
    p.totalLength = this.totalLength;
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

  /** 最後から２番目の頂点を取得  
   * 頂点が二つ以上ない場合はnullを返す。 */
  getSecondLastPoint(): StrokePoint | null {
    return this.points.length >= 2 ? this.points[this.points.length - 2] : null;
  }
}

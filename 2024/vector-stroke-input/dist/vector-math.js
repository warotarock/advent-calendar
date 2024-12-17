/** ベクトル計算ロジッククラス */
export class VectorMath {
    /** 成分の値のセット */
    static set(v, x, y) {
        v[0] = x;
        v[1] = y;
    }
    /** 成分の値のコピー */
    static copy(dest, src) {
        dest[0] = src[0];
        dest[1] = src[1];
    }
    /** 二点間の距離を返す */
    static distance(p1, p2) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
    /** 角のなす角度を計算して返す
     * 三つの点が直線に並んだときの角度をPIとしたとき、二つ目の点を中心として反時計回りを正とした角度を計算する。 */
    static angleOfCorner(p1, p2, p3) {
        const v1x = p1[0] - p2[0];
        const v1y = p1[1] - p2[1];
        const v2x = p3[0] - p2[0];
        const v2y = p3[1] - p2[1];
        const dot = v1x * v2x + v1y * v2y;
        const det = v1x * v2y - v1y * v2x;
        return Math.atan2(det, dot);
    }
    /** 角の曲がり角度を計算して返す
     * 三つの点が直線に並んだときの角度を0としたとき、二つ目の点を中心として反時計回りを正とした角度を計算する。 */
    static angleOfCurving(p1, p2, p3) {
        const angle = VectorMath.angleOfCorner(p1, p2, p3);
        return angle >= 0 ? angle - Math.PI : angle + Math.PI;
    }
    /** 直線と直線の交点を計算返する
     * 点0-点1からなる直線と点2-点3からなる直線の交点をresultに設定する。
     */
    static crossPoint(result, x0, y0, x1, y1, x2, y2, x3, y3) {
        const a0 = (y1 - y0) / (x1 - x0);
        const a1 = (y3 - y2) / (x3 - x2);
        if (Math.abs(a0) === Math.abs(a1)) {
            return false;
        }
        const x = (a0 * x0 - y0 - a1 * x2 + y2) / (a0 - a1);
        const y = (y1 - y0) / (x1 - x0) * (x - x0) + y0;
        if (Number.isNaN(x) || Number.isNaN(y)) {
            return false;
        }
        VectorMath.set(result, x, y);
        return true;
    }
    ;
}
//# sourceMappingURL=vector-math.js.map
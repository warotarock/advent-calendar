class MathUtil {
  clamp(value: number, min: number, max: number): number {
    if (value < min) {
      return min;
    } else if (value > max) {
      return max;
    } else {
      return value;
    }
  }

  lerp(value1: number, value2: number, rate: number): number {
    return value1 * (1.0 - rate) + value2 * rate;
  }

  cubeRoot(x: number): number {
    const res = Math.pow(Math.abs(x), 1.0 / 3.0);
    return x >= 0.0 ? res : -res;
  }

  solveQuadraticEquation(
    solution: [number, number, number],
    a: number,
    b: number,
    c: number
  ) {
    const EPSLN = 1e-12;

    // 対数的に退化する場合を安全に扱う
    if (Math.abs(a) < EPSLN) {
      if (Math.abs(b) < EPSLN) {
        // a == 0 && b == 0 : 定数項のみ -> 解無し（または無限解）。ここでは無効を返す
        solution[0] = -1.0;
        solution[1] = -1.0;
        return;
      }
      // 線形方程式 b*x + c = 0
      solution[0] = -c / b;
      solution[1] = -1.0;
      return;
    }

    let d = b * b - 4.0 * a * c;

    if (d > EPSLN) {
      let x1: number;
      let x2: number;
      if (b < 0.0) {
        x1 = (-b - Math.sqrt(d)) / (2.0 * a);
        x2 = -b / a - x1;
      } else {
        x1 = (-b + Math.sqrt(d)) / (2.0 * a);
        x2 = -b / a - x1;
      }

      solution[0] = x1;
      solution[1] = x2;
    } else if (Math.abs(d) <= EPSLN) {
      solution[0] = -b / (2.0 * a);
      solution[1] = -1.0;
    } else {
      // 虚数根のみ -> 無効マーカー
      solution[0] = -1.0;
      solution[1] = -1.0;
    }
  }

  solveCubicEquation(
    solution: [number, number, number],
    a: number,
    b: number,
    c: number,
    d: number
  ) {
    const PI = 3.14159265358979323846264;
    const EPSLN = 1e-12;
    let p: number;
    let q: number;
    let t: number;
    let a3: number;
    let b3: number;

    // 退化して二次方程式になる場合は二次解法に渡す（内部でさらに退化チェックあり）
    if (Math.abs(a) < EPSLN) {
      this.solveQuadraticEquation(solution, b, c, d);
      return;
    }

    b /= 3.0 * a;
    c /= a;
    d /= a;
    p = b * b - c / 3.0;
    q = (b * (c - 2.0 * b * b) - d) / 2.0;

    let disc = q * q - p * p * p;

    if (Math.abs(disc) <= EPSLN) {
      // ディスクリミナントほぼゼロ
      q = this.cubeRoot(q);
      solution[0] = 2.0 * q - b;
      solution[1] = -q - b;
      solution[2] = -1.0;
    } else if (disc > 0.0) {
      // 一実根
      let sign = 1.0;
      if (q <= 0.0) {
        sign = -1.0;
      }
      a3 = this.cubeRoot(q + sign * Math.sqrt(disc));
      b3 = p / a3;
      solution[0] = a3 + b3 - b;
      solution[1] = -1.0;
      solution[2] = -1.0;
    } else {
      // 三つの実根
      const a2 = 2.0 * Math.sqrt(p);
      t = Math.acos(this.clamp(q / ((p * a2) / 2.0), -1.0, 1.0));
      solution[0] = a2 * Math.cos(t / 3.0) - b;
      solution[1] = a2 * Math.cos((t + 2.0 * PI) / 3.0) - b;
      solution[2] = a2 * Math.cos((t + 4.0 * PI) / 3.0) - b;
    }
  }

  /** ベジエ曲線の補間 */
  bezierInterpolation(
    p0: number,
    p1: number,
    p2: number,
    p3: number,
    t: number
  ) {
    const it = 1.0 - t;
    return (
      it * it * it * p0 +
      3.0 * it * it * t * p1 +
      3.0 * it * t * t * p2 +
      t * t * t * p3
    );
  }

  reverseInterpolationBezierSolutions: [number, number, number] = [
    0.0, 0.0, 0.0,
  ];

  /** ベジエ曲線の補間のパラメータとx座標からy座標を求める */
  reverseBezierInterpolation(
    x0: number,
    x1: number,
    x2: number,
    x3: number,
    x: number
  ): number {
    const solution = this.reverseInterpolationBezierSolutions;
    solution[0] = 0.0;
    solution[1] = 0.0;
    solution[2] = 0.0;

    const a = x3 - 3.0 * (x2 - x1) - x0;
    const b = 3.0 * (x2 - 2.0 * x1 + x0);
    const c = 3.0 * (x1 - x0);
    const d = x0 - x;

    this.solveCubicEquation(solution, a, b, c, d);

    const EPSLN = 1e-8;
    const lowerLimit = -EPSLN;
    const upperLimit = 1.0 + EPSLN;
    for (let i = 0; i < 3; i++) {
      let value = solution[i];
      if (value >= lowerLimit && value < 0.0) {
        value = 0.0;
      } else if (value <= upperLimit && value > 1.0) {
        value = 1.0;
      }
      if (value >= 0.0 && value <= 1.0) {
        return value;
      }
    }

    return -1.0;
  }
}

export const Maths = new MathUtil();

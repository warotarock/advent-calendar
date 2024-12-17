import { StrokeInputOptimizer } from "./interfaces";
import { VectorStrokeEditLogic } from "./vector-stroke-edit.js";
import { VectorStroke } from "./vector-stroke.js";

/** 短い距離の移動を破棄するストローク入力最適化ロジック */
export class SmallStepReductionSIO implements StrokeInputOptimizer {

  /** ストロークの入力ステップ距離[px] */
  private inputStepDistance = 15.0;

  /** 入力されたままのストローク */
  originalStroke: VectorStroke | null = null;

  /** 入力中のストローク */
  private currentStroke: VectorStroke | null = null;

  /** 最適化結果のストローク */
  get resultStrokes(): VectorStroke[] | null {
    return this.currentStroke ? [this.currentStroke] : null;
  }

  /** パラメータの設定 */
  setInputStepDistance(stepDistance: number): void {
    this.inputStepDistance = stepDistance;
  }

  /** 入力処理: ポインタダウン */
  onPointerDown(location: number[]) {
    this.originalStroke = new VectorStroke();
    this.originalStroke.addPoint(location);
    this.currentStroke = new VectorStroke();
    this.currentStroke.addPoint(location);
  }

  /** 入力処理: ポインタ移動 */
  onPointerMove(location: number[]) {
    this.processPointerInput(location);
  }

  /** 入力処理: ポインタアップ */
  onPointerUp(location: number[]) {
    this.processPointerInput(location);
    this.cancelInput();
  }

  /** 入力をキャンセルする */
  cancelInput() {
    this.currentStroke = null;
  }

  /** 共通の入力処理 */
  private processPointerInput(location: number[]) {

    if (!this.currentStroke) {
      return;
    }

    if (this.originalStroke) {
      this.originalStroke.addPoint(location);
    }

    // 直前の点との距離から点を追加するか置き換えるか判断して処理
    VectorStrokeEditLogic.addOrReplacePointForMinDistance(this.currentStroke, location, this.inputStepDistance);
  }
}

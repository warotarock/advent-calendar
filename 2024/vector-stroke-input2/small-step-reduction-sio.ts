import { StrokeInputOptimizer } from "./interfaces";
import { VectorStrokeEditLogic } from "./vector-stroke-edit.js";
import { VectorStroke } from "./vector-stroke.js";

/** 短い距離の移動を破棄するストローク入力最適化ロジック */
export class SmallStepReductionSIO implements StrokeInputOptimizer {

  /** 入力されたままのストローク */
  get originalStroke(): VectorStroke | null {
    return this.inputStroke;
  }

  /** 最終結果のストローク */
  get resultStrokes(): VectorStroke[] | null {
    return this.optimizedStroke ? [this.optimizedStroke] : null;
  }

  /** デバッグ用などのサンプルのトローク */
  get sampleStroke(): VectorStroke | null {
    return null;
  }

  /** 入力中であるかどうか */
  private isInputting = false;

  /** ストロークの入力ステップ距離[px] */
  private inputStepDistance = 15.0;

  /** 入力されたままのストローク */
  private inputStroke: VectorStroke | null = null;

  /** 最適化後のストローク */
  private optimizedStroke: VectorStroke | null = null;

  /** パラメータの設定 */
  setInputStepDistance(stepDistance: number): void {
    this.inputStepDistance = stepDistance;
  }

  /** 入力処理: ポインタダウン */
  onPointerDown(location: number[]) {
    this.inputStroke = new VectorStroke();
    this.inputStroke.addPoint(location);
    this.optimizedStroke = new VectorStroke();
    this.optimizedStroke.addPoint(location);
    this.isInputting = true;
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
    this.isInputting = false;
  }

  /** 共通の入力処理 */
  private processPointerInput(location: number[]) {

    if (!this.isInputting || !this.inputStroke || !this.optimizedStroke) {
      return;
    }

    this.inputStroke.addPoint(location);
    VectorStrokeEditLogic.updateLastPointParameters(this.inputStroke);

    // 直前の点との距離から点を追加するか置き換えるか判断して処理
    VectorStrokeEditLogic.addOrReplacePointForMinDistance(this.optimizedStroke, location, this.inputStepDistance);
    VectorStrokeEditLogic.updateLastPointParameters(this.optimizedStroke);
  }
}

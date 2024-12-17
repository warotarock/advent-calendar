import { StrokeInputOptimizer } from "./interfaces";
import { VectorStrokeEditLogic } from "./vector-stroke-edit.js";
import { VectorStroke } from "./vector-stroke.js";

/** 角のところでストロークを分割するストローク入力最適化ロジック */
export class CornerSplitStrokeSIO2 implements StrokeInputOptimizer {

  /** ストロークの入力ステップ距離[px] */
  private baseStepDistance = 6.0;

  /** ストロークの微細入力ステップ距離[px] */
  private fineStepDistance = this.baseStepDistance / 3.0;

  /** ストロークの非常に小さい移動を破棄するためのステップ距離[px] */
  private verySmallStepDistance = 1.2;

  /** ストロークを角のところで分割する処理のパラメータ */
  splitStrokeByCornerParams = {
    nearInputIndexRange: 1,
    cornerMininmuCurvingAngle: (90.0 - 15.0) / 180.0 * Math.PI,
    combinationCornerDiferrenceRatio: 3,
    maxCornerCrossPointDistance: 6.0,
  };

  /** 入力されたままのストローク */
  get originalStroke(): VectorStroke | null {
    return this.inputStroke;
  }

  /** 最終結果のストローク */
  get resultStrokes(): VectorStroke[] | null {
    return this.inputStroke ? this.splitedStrokes : null;
  }

  /** デバッグ用などのサンプルのトローク */
  get sampleStroke(): VectorStroke | null {
    return this.inputStroke;
  }

  /** 入力中であるかどうか */
  private isInputting = false;

  /** 入力されたままのストローク */
  private inputStroke: VectorStroke | null = null;

  /** 一段階最適化されたストローク */
  private optimizedStroke1: VectorStroke | null = null;

  /** 二段階最適化されたストローク */
  private optimizedStroke2: VectorStroke | null = null;

  /** 分割されたストローク */
  private splitedStrokes: VectorStroke[] = [];

  /** パラメータの設定 */
  setInputStepDistance(stepDistance: number): void {
    this.baseStepDistance = stepDistance;
    this.fineStepDistance = stepDistance / 2.0;
  }

  /** 入力処理: ポインタダウン */
  onPointerDown(location: number[]) {
    this.inputStroke = new VectorStroke();
    this.inputStroke.addPoint(location);
    this.optimizedStroke1 = new VectorStroke();
    this.optimizedStroke1.addPoint(location);
    this.optimizedStroke2 = new VectorStroke();
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

    if (!this.isInputting || !this.inputStroke || !this.optimizedStroke1) {
      return;
    }

    // 入力ストロークに点を追加
    this.inputStroke.addPoint(location);
    VectorStrokeEditLogic.updateLastPointParameters(this.inputStroke);

    // 非常に小さい移動距離の点を除外
    VectorStrokeEditLogic.addOrReplacePointForMinDistance(this.optimizedStroke1, location, this.verySmallStepDistance);
    VectorStrokeEditLogic.updateLastPointParameters(this.optimizedStroke1);

    // 角の検出と距離による最適化
    this.optimizedStroke2 = VectorStrokeEditLogic.getStepDistanceAndCornerOptimizedStroke(this.optimizedStroke1, this.baseStepDistance, this.fineStepDistance);

    // ストロークを角のところで分割
    this.splitedStrokes = VectorStrokeEditLogic.splitStrokeByRightAngleCorner(this.optimizedStroke2, this.splitStrokeByCornerParams);
  }
}

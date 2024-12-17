import { VectorStroke } from "./vector-stroke";

/**
 * ポインター入力を受け付けて最適化されたストロークを生成するクラスのインターフェース
 */
export interface StrokeInputOptimizer {

  /** 入力されたままのストローク */
  readonly originalStroke: VectorStroke | null;
  /** 最終結果のストローク */
  readonly resultStrokes: VectorStroke[] | null;
  /** デバッグ用などのサンプルのトローク */
  readonly sampleStroke: VectorStroke | null;
  /** パラメータの設定 */
  setInputStepDistance(stepDistance: number): void;
  /** 入力処理: ポインタダウン */
  onPointerDown(location: number[]): void;
  /** 入力処理: ポインタ移動 */
  onPointerMove(location: number[]): void;
  /** 入力処理: ポインタアップ */
  onPointerUp(location: number[]): void;
  /** 入力をキャンセルする */
  cancelInput(): void;
}
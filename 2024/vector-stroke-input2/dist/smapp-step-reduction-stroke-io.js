import { VectorStrokeEditLogic } from "./vector-stroke-edit.js";
import { VectorStroke } from "./vector-stroke.js";
/** 短い距離の移動を破棄するストローク入力最適化ロジック */
export class SmallStepReductionStrokeIO {
    constructor() {
        /** ストロークの入力ステップ距離[px] */
        this.INPUT_STEP_DISTANCE = 15.0;
        /** 入力されたままのストローク */
        this.originalStroke = null;
        /** 入力中のストローク */
        this.currentStroke = null;
    }
    /** 最適化結果のストローク */
    get resultStrokes() {
        return this.currentStroke ? [this.currentStroke] : null;
    }
    /** 入力処理: ポインタダウン */
    onPointerDown(location) {
        this.originalStroke = new VectorStroke();
        this.originalStroke.addPoint(location);
        this.currentStroke = new VectorStroke();
        this.currentStroke.addPoint(location);
    }
    /** 入力処理: ポインタ移動 */
    onPointerMove(location) {
        this.processPointerInput(location);
    }
    /** 入力処理: ポインタアップ */
    onPointerUp(location) {
        this.processPointerInput(location);
        this.cancelInput();
    }
    /** 入力をキャンセルする */
    cancelInput() {
        this.currentStroke = null;
    }
    /** 共通の入力処理 */
    processPointerInput(location) {
        if (!this.currentStroke) {
            return;
        }
        if (this.originalStroke) {
            this.originalStroke.addPoint(location);
        }
        // 直前の点との距離から点を追加するか置き換えるか判断して処理
        VectorStrokeEditLogic.addOrReplacePointForMinDistance(this.currentStroke, location, this.INPUT_STEP_DISTANCE);
    }
}
//# sourceMappingURL=smapp-step-reduction-stroke-io.js.map
import { VectorStrokeEditLogic } from "./vector-stroke-edit.js";
import { VectorStroke } from "./vector-stroke.js";
/** 短い距離の移動を破棄するストローク入力最適化ロジック */
export class SmallStepReductionSIO {
    constructor() {
        /** 入力中であるかどうか */
        this.isInputting = false;
        /** ストロークの入力ステップ距離[px] */
        this.inputStepDistance = 15.0;
        /** 入力されたままのストローク */
        this.inputStroke = null;
        /** 最適化後のストローク */
        this.optimizedStroke = null;
    }
    /** 入力されたままのストローク */
    get originalStroke() {
        return this.inputStroke;
    }
    /** 最終結果のストローク */
    get resultStrokes() {
        return this.optimizedStroke ? [this.optimizedStroke] : null;
    }
    /** デバッグ用などのサンプルのトローク */
    get sampleStroke() {
        return null;
    }
    /** パラメータの設定 */
    setInputStepDistance(stepDistance) {
        this.inputStepDistance = stepDistance;
    }
    /** 入力処理: ポインタダウン */
    onPointerDown(location) {
        this.inputStroke = new VectorStroke();
        this.inputStroke.addPoint(location);
        this.optimizedStroke = new VectorStroke();
        this.optimizedStroke.addPoint(location);
        this.isInputting = true;
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
        this.isInputting = false;
    }
    /** 共通の入力処理 */
    processPointerInput(location) {
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
//# sourceMappingURL=small-step-reduction-sio.js.map
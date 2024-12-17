import { SmallStepReductionSIO } from './small-step-reduction-sio.js';
import { CornerSplitStrokeIO } from './corner-spit-sio.js';
/** メイン処理クラス */
export class Main {
    constructor() {
        this.canvas_scale = 0.2;
        this.canvas_width = 500 * this.canvas_scale;
        this.canvas_height = 500 * this.canvas_scale;
        this.strokeColors = ['#000000', '#FF0000'];
        this.devicePixelRatio = window.devicePixelRatio;
        // キャンバスの初期化
        this.canvas = document.getElementById('main-canvas');
        this.canvas.width = this.canvas_width * this.devicePixelRatio;
        this.canvas.height = this.canvas_height * this.devicePixelRatio;
        this.ctx = this.canvas.getContext('2d');
        // ストローク入力ロジックの初期化
        this.strokeIO = new SmallStepReductionSIO();
        // イベントの初期化
        this.initializeEventListeners();
    }
    /** ストロークを描画する */
    drawStroke(stroke, lineWidth, strokeColor) {
        if (!stroke || stroke.points.length < 2) {
            return;
        }
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.beginPath();
        this.ctx.moveTo(stroke.points[0].location[0], stroke.points[0].location[1]);
        for (let i = 1; i < stroke.points.length; i++) {
            this.ctx.lineTo(stroke.points[i].location[0], stroke.points[i].location[1]);
        }
        this.ctx.stroke();
    }
    /** ストロークを描画する */
    drawStrokes(strokes) {
        let colorIndex = 0;
        for (const stroke of strokes) {
            this.drawStroke(stroke, 1.0, this.strokeColors[colorIndex]);
            colorIndex = (colorIndex + 1) % this.strokeColors.length;
        }
    }
    /** ストロークの頂点情報をテキストエリアに表示する */
    showStrokePointData(strokes) {
        const textArea = document.getElementById('stroke-points');
        let text = '';
        for (const [strokeIndex, stroke] of strokes.entries()) {
            const pointTexts = stroke.points.map((point) => {
                return `(${point.location[0].toFixed(1)}, ${point.location[1].toFixed(1)}) 長さ${point.length.toFixed(1)}px ${(point.angle / Math.PI * 180).toFixed(1)}度`;
            });
            text += `線[${strokeIndex + 1}] 点${stroke.points.length}個\n` + pointTexts.join('\n') + '\n\n';
        }
        textArea.value = text;
    }
    /** イベントからポインターの位置を取得する */
    getPointerLocation(e) {
        return [
            e.offsetX * this.canvas_scale * this.devicePixelRatio,
            e.offsetY * this.canvas_scale * this.devicePixelRatio
        ];
    }
    /** イベント */
    initializeEventListeners() {
        // ストローク入力パラメータの設定
        const inputStepDistance = document.getElementById('stepDistanceInput');
        inputStepDistance.addEventListener('input', () => {
            const value = parseFloat(inputStepDistance.value);
            if (!isNaN(value)) {
                this.strokeIO.setInputStepDistance(value);
            }
        });
        // ストローク入力ロジックの切り替え
        const radioButtons = document.querySelectorAll('input[name="strokeIO"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    if (radio.value === 'SmallStepReduction') {
                        this.strokeIO = new SmallStepReductionSIO();
                    }
                    else if (radio.value === 'CornerSplit') {
                        this.strokeIO = new CornerSplitStrokeIO();
                    }
                }
            });
        });
        this.canvas.addEventListener('pointerdown', (e) => {
            // ポインタキャプチャ
            e.preventDefault();
            this.canvas.setPointerCapture(e.pointerId);
            // ロジックにポインタ位置を入力
            const location = this.getPointerLocation(e);
            this.strokeIO.onPointerDown(location);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            // ロジックにポインタ位置を入力
            const location = this.getPointerLocation(e);
            this.strokeIO.onPointerMove(location);
            // 画面に表示
            if (this.strokeIO.resultStrokes) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.drawStroke(this.strokeIO.originalStroke, 2.0, '#DDDDDD');
                this.drawStrokes(this.strokeIO.resultStrokes);
                this.showStrokePointData(this.strokeIO.resultStrokes);
            }
        });
        this.canvas.addEventListener('pointerup', (e) => {
            // ロジックにポインタ位置を入力
            const location = this.getPointerLocation(e);
            this.strokeIO.onPointerUp(location);
            // 画面に表示
            if (this.strokeIO.resultStrokes) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.drawStrokes(this.strokeIO.resultStrokes);
                this.showStrokePointData(this.strokeIO.resultStrokes);
            }
        });
    }
}
//# sourceMappingURL=main.js.map
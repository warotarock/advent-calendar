import { StrokeInputOptimizer } from './interfaces.js';
import { VectorStroke } from './vector-stroke.js';
import { SmallStepReductionSIO } from './small-step-reduction-sio.js';
import { CornerSplitStrokeSIO } from './corner-spit-sio.js';

/** メイン処理クラス */
export class Main {

  private canvas_scale = 0.2;
  private canvas_width = 500 * this.canvas_scale;
  private canvas_height = 500 * this.canvas_scale;
  private canvas: HTMLCanvasElement;
  private devicePixelRatio: number;
  private ctx: CanvasRenderingContext2D;
  private optimizer: StrokeInputOptimizer;
  private strokeColors: string[] = ['#000000', '#FF0000'];

  constructor() {

    this.devicePixelRatio = window.devicePixelRatio;

    // キャンバスの初期化
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.canvas.width = this.canvas_width * this.devicePixelRatio;
    this.canvas.height = this.canvas_height * this.devicePixelRatio;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    // ストローク入力ロジックの初期化
    this.optimizer = new SmallStepReductionSIO();

    // イベントの初期化
    this.initializeEventListeners();
  }

  /** ストロークを描画する */
  private drawStroke(stroke: VectorStroke | null, lineWidth: number, strokeColor: string): void {

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
  private drawStrokes(strokes: VectorStroke[]): void {

    let colorIndex = 0;
    for (const stroke of strokes) {
      this.drawStroke(stroke, 1.0, this.strokeColors[colorIndex]);
      colorIndex = (colorIndex + 1) % this.strokeColors.length;
    }
  }

  /** ストロークの頂点情報をテキストエリアに表示する */
  private showStrokePointData(strokes: VectorStroke[]): void {

    const textArea = document.getElementById('stroke-points') as HTMLTextAreaElement;

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
  private getPointerLocation(e: PointerEvent): [number, number] {

    return [
      e.offsetX * this.canvas_scale * this.devicePixelRatio,
      e.offsetY * this.canvas_scale * this.devicePixelRatio
    ];
  }

  /** イベント */
  private initializeEventListeners(): void {

    // ストローク入力パラメータの設定
    const inputStepDistance = document.getElementById('stepDistanceInput') as HTMLInputElement;
    inputStepDistance.addEventListener('input', () => {
      const value = parseFloat(inputStepDistance.value);
      if (!isNaN(value)) {
        this.optimizer.setInputStepDistance(value);
      }
    });

    // ストローク入力ロジックの切り替え
    const radioButtons = document.querySelectorAll<HTMLInputElement>('input[name="strokeIO"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
          if (radio.checked) {
            if (radio.value === 'SmallStepReduction') {
              this.optimizer = new SmallStepReductionSIO();
            }
            else if (radio.value === 'CornerSplit') {
              this.optimizer = new CornerSplitStrokeSIO();
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
      this.optimizer.onPointerDown(location);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      // ロジックにポインタ位置を入力
      const location = this.getPointerLocation(e);
      this.optimizer.onPointerMove(location);
      // 画面に表示
      if (this.optimizer.resultStrokes) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawStroke(this.optimizer.originalStroke, 2.0, '#DDDDDD');
        this.drawStrokes(this.optimizer.resultStrokes);
        this.showStrokePointData(this.optimizer.resultStrokes);
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      // ロジックにポインタ位置を入力
      const location = this.getPointerLocation(e);
      this.optimizer.onPointerUp(location);
      // 画面に表示
      if (this.optimizer.resultStrokes) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawStrokes(this.optimizer.resultStrokes);
        this.showStrokePointData(this.optimizer.resultStrokes);
      }
    });
  }
}

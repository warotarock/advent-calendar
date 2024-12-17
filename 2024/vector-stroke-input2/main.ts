import { StrokeInputOptimizer } from './interfaces.js';
import { VectorStroke } from './vector-stroke.js';
import { SmallStepReductionSIO } from './small-step-reduction-sio.js';
import { CornerSplitStrokeSIO2 } from './corner-spit-sio2.js';

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
    this.selectOptimizer();
    this.updateOptimizerParams();

    // イベントの初期化
    this.initializeEventListeners();
  }

  /** ストロークを描画 */
  private drawStroke(stroke: VectorStroke | null, lineWidth: number, strokeColor: string): void {

    if (!stroke || stroke.points.length < 2) {
      return;
    }

    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(stroke.points[0].location[0], stroke.points[0].location[1]);
    for (let i = 1; i < stroke.points.length; i++) {
      this.ctx.lineTo(stroke.points[i].location[0], stroke.points[i].location[1]);
    }
    this.ctx.stroke();
  }

  /** ストローク配列を描画 */
  private drawStrokes(strokes: VectorStroke[]) {

    let colorIndex = 0;
    for (const stroke of strokes) {
      this.drawStroke(stroke, 1.0, this.strokeColors[colorIndex]);
      colorIndex = (colorIndex + 1) % this.strokeColors.length;
    }
  }

  /** ストロークの頂点情報をテキストエリアに表示 */
  private showStrokePointData() {

    const textArea = document.getElementById('stroke-points') as HTMLTextAreaElement;

    let texts = [];

    const resultStrokes = this.optimizer.resultStrokes;
    if (resultStrokes) {
      for (const [strokeIndex, stroke] of resultStrokes.entries()) {
        texts.push(`最適化 線[${strokeIndex + 1}] 点${stroke.points.length}個`);
        for (const point of stroke.points) {
          texts.push(`(${point.location[0].toFixed(0)}, ${point.location[1].toFixed(0)}) 長さ${point.length.toFixed(2)}px ${(point.angle / Math.PI * 180).toFixed(1)}度${point.isFixedCorner ? ' (角)' : ''}`);
        }
      }
    }

    texts.push('');

    const sampleStroke = this.optimizer.sampleStroke;
    if (sampleStroke) {
      texts.push(`入力 点${sampleStroke.points.length}個`);
      for (const point of sampleStroke.points) {
        texts.push(`(${point.location[0].toFixed(0)}, ${point.location[1].toFixed(0)}) 長さ${point.length.toFixed(2)}px ${(point.angle / Math.PI * 180).toFixed(1)}度${point.isFixedCorner ? ' (角)' : ''}`);
      }
    }

    textArea.value = texts.join('\n');
  }

  /** 画面表示を更新 */
  private updateDisplay() {

    if (this.optimizer.resultStrokes) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawStroke(this.optimizer.originalStroke, 3.0, '#DDDDDD');
      this.drawStrokes(this.optimizer.resultStrokes);
      this.showStrokePointData();
    }
  }

  /** ストローク入力ロジックの切り替え */
  private selectOptimizer() {

    const radioButtons = document.querySelectorAll<HTMLInputElement>('input[name="strokeIO"]');
    radioButtons.forEach(radio => {
      if (radio.checked) {
        if (radio.value === 'SmallStepReduction') {
          this.optimizer = new SmallStepReductionSIO();
        }
        else if (radio.value === 'CornerSplit') {
          this.optimizer = new CornerSplitStrokeSIO2();
        }
      }
    });
  }

  /** ストローク入力パラメータの更新 */
  private updateOptimizerParams() {

    const inputStepDistance = document.getElementById('stepDistanceInput') as HTMLInputElement;
    const value = parseFloat(inputStepDistance.value);
    if (!isNaN(value)) {
      this.optimizer.setInputStepDistance(value);
    }
  }

  /** 入力されたストロークの座標データを取得する */
  private getRawStrokeData() {
    return this.optimizer.originalStroke?.points.map(point => point.location) || [];
  }

  /** イベントからポインターの位置を取得する */
  private getPointerLocation(e: PointerEvent): [number, number] {
    return [
      Math.floor(e.offsetX * this.canvas_scale * this.devicePixelRatio),
      Math.floor(e.offsetY * this.canvas_scale * this.devicePixelRatio)
    ];
  }

  /** イベント */
  private initializeEventListeners(): void {

    // ストローク入力パラメータの設定
    const inputStepDistance = document.getElementById('stepDistanceInput') as HTMLInputElement;
    inputStepDistance.addEventListener('input', () => {
      this.updateOptimizerParams();
    });

    // ストローク入力ロジックの切り替え
    const radioButtons = document.querySelectorAll<HTMLInputElement>('input[name="strokeIO"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
          this.selectOptimizer();
          this.updateOptimizerParams();
        });
    });

    // ストロークデータのエクスポート
    const exportJsonButton = document.getElementById('export-json') as HTMLButtonElement;
    const jsonOutputTextArea = document.getElementById('json-output') as HTMLTextAreaElement;
    exportJsonButton.addEventListener('click', () => {
      const strokeData = this.getRawStrokeData();
      jsonOutputTextArea.value = JSON.stringify(strokeData);
    });

    // ストロークデータの再生
    const importJsonButton = document.getElementById('import-json') as HTMLButtonElement;
    importJsonButton.addEventListener('click', () => {
      const strokeData = JSON.parse(jsonOutputTextArea.value) as number[][];
      if (strokeData.length > 0) {
        this.optimizer.onPointerDown(strokeData[0]);
        for (let i = 1; i < strokeData.length - 1; i++) {
          this.optimizer.onPointerMove(strokeData[i]);
        }
        this.optimizer.onPointerUp(strokeData[strokeData.length - 1]);
        // 画面に表示
        this.updateDisplay();
      }
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
      this.updateDisplay();
    });

    this.canvas.addEventListener('pointerup', (e) => {
      // ロジックにポインタ位置を入力
      const location = this.getPointerLocation(e);
      this.optimizer.onPointerUp(location);
      // 画面に表示
      this.updateDisplay();
    });
  }
}

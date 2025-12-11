import { Directive, input, output, signal, effect, inject, ElementRef, Renderer2, HostListener } from '@angular/core';

@Directive({
  selector: '[editableText]',
  standalone: true
})
export class EditableTextDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  readonly editableText = input.required<string>();
  readonly editableTextChange = output<string>();

  private isEditing = signal(false);
  private editValue = signal('');
  private inputElement: HTMLInputElement | null = null;
  private originalElement: HTMLElement;

  constructor() {
    this.originalElement = this.elementRef.nativeElement;

    // 初期値の設定とテキスト変更の監視
    effect(() => {
      const text = this.editableText();
      if (!this.isEditing()) {
        this.updateDisplayText(text);
      }
    });
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.startEdit();
  }

  private startEdit() {
    if (this.isEditing()) return;

    const currentText = this.editableText();
    this.editValue.set(currentText);
    this.isEditing.set(true);

    // input要素を作成
    this.inputElement = this.renderer.createElement('input');
    this.renderer.setAttribute(this.inputElement, 'type', 'text');
    this.renderer.setAttribute(this.inputElement, 'value', currentText);
    this.renderer.setAttribute(this.inputElement, 'aria-label', 'テキスト編集');

    // スタイルをコピー
    this.copyStyles();

    // イベントリスナーを追加
    this.addInputEventListeners();

    // 元の要素を置換
    this.renderer.insertBefore(
      this.originalElement.parentNode,
      this.inputElement,
      this.originalElement
    );
    this.renderer.setStyle(this.originalElement, 'display', 'none');

    // フォーカスと全選択
    setTimeout(() => {
      this.inputElement?.focus();
      this.inputElement?.select();
    });
  }

  private copyStyles() {
    if (!this.inputElement) return;

    const computedStyle = getComputedStyle(this.originalElement);

    // 重要なスタイルプロパティをコピー
    const stylesToCopy = [
      'font-family', 'font-size', 'font-weight', 'font-style',
      'color', 'text-align', 'line-height', 'letter-spacing',
      'padding', 'margin', 'border-radius'
    ];

    stylesToCopy.forEach(prop => {
      this.renderer.setStyle(this.inputElement, prop, computedStyle.getPropertyValue(prop));
    });

    // 編集中の特別なスタイル
    this.renderer.setStyle(this.inputElement, 'box-sizing', 'border-box');
    this.renderer.setStyle(this.inputElement, 'border', 'none');
    this.renderer.setStyle(this.inputElement, 'outline', 'none');
    this.renderer.setStyle(this.inputElement, 'background-color', '#fff');
    this.renderer.setStyle(this.inputElement, 'box-shadow', '0 0 0 2px rgba(0, 123, 255, 0.25)');
    this.renderer.setStyle(this.inputElement, 'min-width', '100px');
  }

  private addInputEventListeners() {
    if (!this.inputElement) return;

    // キーボードイベント
    this.renderer.listen(this.inputElement, 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.saveEdit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelEdit();
      }
    });

    // 値変更イベント
    this.renderer.listen(this.inputElement, 'input', (event: Event) => {
      const target = event.target as HTMLInputElement;
      this.editValue.set(target.value);
    });

    // フォーカス離脱イベント
    this.renderer.listen(this.inputElement, 'blur', () => {
      this.saveEdit();
    });
  }

  private saveEdit() {
    if (!this.isEditing()) return;

    const newValue = this.editValue().trim();
    if (newValue && newValue !== this.editableText()) {
      this.editableTextChange.emit(newValue);
    }

    this.endEdit();
  }

  private cancelEdit() {
    this.endEdit();
  }

  private endEdit() {
    if (!this.isEditing()) return;

    // input要素を削除
    if (this.inputElement && this.inputElement.parentNode) {
      this.renderer.removeChild(this.inputElement.parentNode, this.inputElement);
    }

    // 元の要素を表示
    this.renderer.setStyle(this.originalElement, 'display', '');

    // 状態をリセット
    this.isEditing.set(false);
    this.editValue.set('');
    this.inputElement = null;
  }

  private updateDisplayText(text: string) {
    this.renderer.setProperty(this.originalElement, 'textContent', text);
  }
}

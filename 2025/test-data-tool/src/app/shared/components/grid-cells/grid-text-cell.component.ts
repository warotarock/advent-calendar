import { Component, input, effect, viewChild, ElementRef, signal, inject, forwardRef } from '@angular/core';
import { GridCellValue, GridCellConfig, GridCellComponent } from './grid-cell.interface';
import { DataGridDirective } from '../../directives/data-grid.directive';

@Component({
  selector: 'app-grid-text-cell',
  template: `
    @if (!isEditing()) {
      <span
        class="cell-display"
        (dblclick)="startEdit()"
        (mousedown)="preventTextSelection($event)">
        {{ cellValue().value }}
      </span>
    }
    @if (isEditing()) {
      <input
        #editInput
        type="text"
        [value]="cellValue().value"
        (blur)="stopEdit()"
        (keydown)="onKeyDown($event)"
        class="cell-input">
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      height: 100%;
    }
    .cell-display {
      display: flex;
      align-items: center;
      width: 100%;
      height: 32px;
      padding: 0 8px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      box-sizing: border-box;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .cell-input {
      width: 100%;
      height: 32px;
      padding: 0 8px;
      border: none;
      outline: none;
      background: transparent;
      box-sizing: border-box;
      font-family: monospace;
      font-size: inherit;
    }
  `],
  providers: [
    // DataGrid:ContentChildrenで使用するための登録
    { provide: GridCellComponent, useExisting: forwardRef(() => GridTextCellComponent) }
  ]
})
export class GridTextCellComponent extends GridCellComponent {
  readonly cellType = 'text' as const;

  cellValue = input.required<GridCellValue>();
  config = input.required<GridCellConfig>();

  private editInput = viewChild<ElementRef>('editInput');
  private gridDirective = inject(DataGridDirective, { optional: true });
  readonly elementRef = inject(ElementRef);
  isEditing = signal(false);
  private startedWithCharacter = false;

  constructor() {
    super();
    // フォーカス管理
    effect(() => {
      if (this.isEditing()) {
        setTimeout(() => {
          const inputElement = this.editInput()?.nativeElement;
          if (inputElement) {
            inputElement.focus();
            // 文字入力で開始した場合は全選択しない
            if (!this.startedWithCharacter) {
              inputElement.select();
            }
          }
        });
      }
    });
  }  preventTextSelection(event: MouseEvent) {
    // ダブルクリック時のテキスト選択を防止
    if (event.detail > 1) {
      event.preventDefault();
    }
  }

  override startEdit() {
    this.startedWithCharacter = false;
    this.isEditing.set(true);
    this.config().onStartEdit?.();
  }

  startEditWithCharacter(character: string) {
    this.startedWithCharacter = true;
    this.isEditing.set(true);
    this.config().onStartEdit?.();

    // 入力フィールドに文字を設定してフォーカス
    setTimeout(() => {
      const inputElement = this.editInput()?.nativeElement;
      if (inputElement) {
        inputElement.value = character;
        inputElement.focus();
        // カーソルを末尾に移動
        inputElement.setSelectionRange(character.length, character.length);
      }
    }, 0);
  }  stopEdit() {
    if (this.isEditing()) {
      const newValue = this.editInput()?.nativeElement.value;
      if (newValue !== this.cellValue().value) {
        this.cellValue().onChange(newValue);
      }
      this.isEditing.set(false);
      this.startedWithCharacter = false; // フラグをリセット
      this.config().onStopEdit?.();
    }
  }

  onKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.stopEdit();
        // DataGridDirectiveにも編集終了を通知
        this.gridDirective?.stopEditing();
        break;
      case 'Escape':
        event.preventDefault();
        this.isEditing.set(false);
        this.config().onStopEdit?.();
        // DataGridDirectiveにも編集終了を通知
        this.gridDirective?.stopEditing();
        break;
      default:
        this.config().onKeyDown?.(event);
        break;
    }
  }
}

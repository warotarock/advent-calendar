import { Component, input, effect, viewChild, ElementRef, signal, inject, forwardRef } from '@angular/core';
import { GridCellValue, GridCellConfig, GridCellComponent } from './grid-cell.interface';
import { DataGridDirective } from '../../directives/data-grid.directive';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-grid-select-cell',
  template: `
    @if (!isEditing()) {
      <span
        class="cell-display"
        (click)="startEdit()"
        (mousedown)="preventTextSelection($event)">
        {{ getDisplayLabel() }}
      </span>
    }
    @if (isEditing()) {
      <select
        #editSelect
        [value]="cellValue().value"
        (change)="onChange($event)"
        (blur)="stopEdit()"
        (keydown)="onKeyDown($event)"
        class="cell-select">
        @for (option of options(); track option.value) {
          <option [value]="option.value" [selected]="option.value === cellValue().value">{{ option.label }}</option>
        }
      </select>
    }
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      height: 100%;
      position: relative;
      width: 100%;
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
    .cell-select {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      padding: 0 8px;
      margin: 0;
      border: none;
      outline: none;
      box-shadow: inset 0 0 0 2px #0066cc;
      box-sizing: border-box;
      font-family: monospace;
      font-size: inherit;
    }

    .cell-select option {
      color: black !important;
      border: none;
      box-shadow: none;
    }

    .cell-select::-webkit-scrollbar-track {
      background-color: white;
    }
  `],
  providers: [
    // DataGrid:ContentChildrenで使用するための登録
    { provide: GridCellComponent, useExisting: forwardRef(() => GridSelectCellComponent) }
  ]
})
export class GridSelectCellComponent extends GridCellComponent {
  readonly cellType = 'select' as const;

  cellValue = input.required<GridCellValue>();
  config = input.required<GridCellConfig>();
  options = input.required<SelectOption[]>();

  private editSelect = viewChild<ElementRef>('editSelect');
  private gridDirective = inject(DataGridDirective, { optional: true });
  readonly elementRef = inject(ElementRef);
  isEditing = signal(false);



  constructor() {
    super();
    // フォーカス管理と値設定
    effect(() => {
      if (this.isEditing()) {
        setTimeout(() => {
          const selectElement = this.editSelect()?.nativeElement;
          if (selectElement) {
            // 現在の値を確実に設定
            selectElement.value = this.cellValue().value;
            selectElement.focus();
            console.log('Select value set to:', this.cellValue().value, 'Options:', this.options());
          }
        });
      }
    });
  }  getDisplayLabel(): string {
    const option = this.options().find(opt => opt.value === this.cellValue().value);
    return option?.label || String(this.cellValue().value || '');
  }

  preventTextSelection(event: MouseEvent) {
    // ダブルクリック時のテキスト選択を防止
    if (event.detail > 1) {
      event.preventDefault();
    }
  }

  override startEdit() {
    this.isEditing.set(true);
    this.config().onStartEdit?.();
    // ディレクティブの編集状態は更新しない（フォーカススタイルを維持）
  }

  stopEdit() {
    this.isEditing.set(false);
    this.config().onStopEdit?.();
  }



  onChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value;
    if (newValue !== this.cellValue().value) {
      this.cellValue().onChange(newValue);
    }
    // セレクトボックスの表示を維持（stopEdit()を削除）
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

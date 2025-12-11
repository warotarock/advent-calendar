import { Component, input, inject, ElementRef, forwardRef } from '@angular/core';
import { GridCellValue, GridCellConfig, GridCellComponent } from './grid-cell.interface';

@Component({
  selector: 'app-grid-checkbox-cell',
  template: `
    <label class="checkbox-container" [class.no-label]="!label()">
      <input
        type="checkbox"
        [checked]="cellValue().value"
        (change)="onChange($event)"
        (keydown)="onKeyDown($event)"
        (click)="onClick($event)"
        class="checkbox-input">
      @if (label()) {
        <span class="checkbox-label">{{ label() }}</span>
      }
    </label>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    .checkbox-container {
      display: flex;
      align-items: center;
      cursor: pointer;
      width: 100%;
      height: 100%;
      padding: 4px 8px;
      box-sizing: border-box;
    }
    .checkbox-container.no-label {
      justify-content: center;
      padding: 0;
    }
    .checkbox-input {
      margin: 0;
    }
    .checkbox-label {
      margin-left: 8px;
      flex: 1;
    }
  `],
  providers: [
    // DataGrid:ContentChildrenで使用するための登録
    { provide: GridCellComponent, useExisting: forwardRef(() => GridCheckboxCellComponent) }
  ]
})
export class GridCheckboxCellComponent extends GridCellComponent {
  readonly cellType = 'checkbox' as const;

  cellValue = input.required<GridCellValue>();
  config = input.required<GridCellConfig>();
  label = input<string>('');
  readonly elementRef = inject(ElementRef);

  override startEdit() {
    // チェックボックスは編集モードを持たないため、何もしない
  }

  onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = target.checked;
    if (newValue !== this.cellValue().value) {
      this.cellValue().onChange(newValue);
    }
  }

  onClick(event: Event) {
    // クリックイベントは通常のチェックボックス動作に任せる
    // (change)イベントで値の変更をキャッチする
  }

  onKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        const newValue = !this.cellValue().value;
        this.cellValue().onChange(newValue);
        break;
      default:
        this.config().onKeyDown?.(event);
        break;
    }
  }
}

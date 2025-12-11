import { Directive, ElementRef, Input, OnInit, Optional, computed, inject } from '@angular/core';
import { DataGridDirective } from './data-grid.directive';
import { GridCellComponent } from '../components';

@Directive({
  selector: '[appGridCell]',
  host: {
    '[attr.data-row]': 'row',
    '[attr.data-column]': 'column',
    '[attr.data-can-edit]': 'canEdit',
    '[class.selected]': 'isSelected()',
    '[class.editing]': 'isEditing()',
    '[class.focused]': 'isFocused()',
    'tabindex': '0',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()'
  }
})
export class GridCellDirective implements OnInit {
  @Input() row!: number;
  @Input() column!: number;
  @Input() canEdit: boolean = true;

  private gridDirective = inject(DataGridDirective, { optional: true });
  private hasFocus = false;

  constructor(private elementRef: ElementRef,
    @Optional() public hostCmp: GridCellComponent
  ) {}

  ngOnInit() {
    // データ属性を設定
    const element = this.elementRef.nativeElement;
    element.dataset['row'] = String(this.row);
    element.dataset['column'] = String(this.column);
    element.dataset['canEdit'] = String(this.canEdit);
  }

  isSelected(): boolean {
    return this.gridDirective?.selectedRow() === this.row &&
           this.gridDirective?.selectedColumn() === this.column;
  }

  isEditing(): boolean {
    return this.isSelected() && this.gridDirective?.isEditingOnCell() === true;
  }

  isFocused(): boolean {
    return this.hasFocus;
  }

  onFocus() {
    this.hasFocus = true;
    // フォーカスされたセルを選択状態にする
    this.gridDirective?.selectCell(this.row, this.column);
  }

  onBlur() {
    this.hasFocus = false;
  }
}

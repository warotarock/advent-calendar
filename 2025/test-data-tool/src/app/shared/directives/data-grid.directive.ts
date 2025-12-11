import { Directive, ContentChildren, QueryList, signal, computed, HostListener, AfterContentInit, ElementRef } from '@angular/core';
import { GridCellDirective } from './grid-cell.directive';
import { GridCellComponent } from '../components';

@Directive({
  selector: '[appDataGrid]'
})
export class DataGridDirective implements AfterContentInit {
  @ContentChildren(GridCellDirective, { descendants: true }) gridCellDirectives!: QueryList<GridCellDirective>;

  selectedRow = signal(0);
  selectedColumn = signal(0);
  isEditingOnCell = signal(false);

  // 現在選択されているセル
  selectedCellDirective = computed(() => {
    const directives = this.gridCellDirectives?.toArray() || [];
    const selectedRow = this.selectedRow();
    const selectedColumn = this.selectedColumn();
    return directives.find(directive =>
      directive.row === selectedRow && directive.column === selectedColumn
    );
  });

  // 現在選択されているセルコンポーネント
  selectedCellComponent = computed(() => {
    const directive = this.selectedCellDirective();
    if (!directive) return null;

    // ディレクティブが適用されているコンポーネントを探す
    return directive.hostCmp || null;
  });

  ngAfterContentInit() {
    // QueryListの変更を監視
    this.gridCellDirectives.changes.subscribe(() => {
      this.initializeCells();
    });

    // 初期化
    this.initializeCells();
  }

  private initializeCells() {
    setTimeout(() => {
      if (this.gridCellDirectives.length > 0) {
        this.selectCell(0, 0);
      }
    }, 100);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.isEditingOnCell()) {
      // 編集中はセル自体にキー処理を委譲
      return;
    }

    switch (event.key) {
      case 'F2':
        event.preventDefault();
        this.startEditing();
        break;
      case 'Enter':
        event.preventDefault();
        // チェックボックスセルの場合は直接キーイベントを処理
        if (this.isCheckboxCell()) {
          this.handleCheckboxKeyEvent(event);
        } else {
          this.startEditing();
        }
        break;
      case ' ':
        // スペースキーはチェックボックスセル専用
        if (this.isCheckboxCell()) {
          event.preventDefault();
          this.handleCheckboxKeyEvent(event);
        }
        break;
      case 'Tab':
        event.preventDefault();
        this.moveToNextCell(event.shiftKey);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.moveRight();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveLeft();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.moveDown();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveUp();
        break;
      case 'Escape':
        event.preventDefault();
        this.stopEditing();
        break;
      default:
        // 文字入力の場合、テキストセルなら編集モードに入る
        if (this.isTypableCharacter(event) && this.isTextCell()) {
          event.preventDefault();
          this.startEditingWithCharacter(event.key);
        }
        break;
    }
  }

  selectCell(row: number, column: number) {
    this.selectedRow.set(row);
    this.selectedColumn.set(column);
    this.stopEditing();

    // すべてのセルの状態を更新
    this.updateCellStates();

    // 選択されたセルにフォーカスを移動
    const selectedDirective = this.selectedCellDirective();
    if (selectedDirective) {
      setTimeout(() => {
        selectedDirective['elementRef'].nativeElement.focus();
      }, 0);
    }
  }

  private updateCellStates() {
    const selectedRow = this.selectedRow();
    const selectedColumn = this.selectedColumn();
    const editingCell = this.isEditingOnCell();
    this.gridCellDirectives.forEach(directive => {
      const element = directive['elementRef'].nativeElement;
      const cellRow = directive.row;
      const cellColumn = directive.column;

      // CSS クラスを更新
      element.classList.toggle('selected',
        cellRow === selectedRow && cellColumn === selectedColumn);
      element.classList.toggle('focused',
        cellRow === selectedRow && cellColumn === selectedColumn && !editingCell);
      element.classList.toggle('editing',
        cellRow === selectedRow && cellColumn === selectedColumn && editingCell);
    });
  }

  startEditing() {
    const directive = this.selectedCellDirective();
    if (directive && directive.canEdit) {
      this.isEditingOnCell.set(true);
      this.updateCellStates();

      // セルコンポーネントのインスタンスを取得してstartEditメソッドを呼び出し
      const component = this.selectedCellComponent();
      if (component && typeof component.startEdit === 'function') {
        setTimeout(() => {
          component.startEdit();
        }, 0);
      }
    }
  }



  stopEditing() {
    const isEditingOnCell = this.isEditingOnCell();
    if (isEditingOnCell) {
      this.isEditingOnCell.set(false);
      this.updateCellStates();

      // 編集要素からフォーカスを外してセルに戻す
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        activeElement.blur();
      }

      // 現在選択されているセルにフォーカスを戻す
      const selectedDirective = this.selectedCellDirective();
      if (selectedDirective) {
        setTimeout(() => {
          selectedDirective['elementRef'].nativeElement.focus();
        }, 0);
      }
    }
  }

  moveToNextCell(reverse: boolean = false) {
    const directives = this.gridCellDirectives.toArray();
    const currentDirective = this.selectedCellDirective();
    if (!currentDirective) return;

    const currentIndex = directives.indexOf(currentDirective);
    let nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0) {
      nextIndex = directives.length - 1;
    } else if (nextIndex >= directives.length) {
      nextIndex = 0;
    }

    const nextDirective = directives[nextIndex];
    if (nextDirective) {
      this.selectCell(nextDirective.row, nextDirective.column);
    }
  }

  moveRight() {
    const currentRow = this.selectedRow();
    const currentColumn = this.selectedColumn();
    const rowCells = this.getRowCells(currentRow);

    if (currentColumn < rowCells.length - 1) {
      this.selectCell(currentRow, currentColumn + 1);
    }
  }

  moveLeft() {
    const currentRow = this.selectedRow();
    const currentColumn = this.selectedColumn();

    if (currentColumn > 0) {
      this.selectCell(currentRow, currentColumn - 1);
    }
  }

  moveDown() {
    const currentRow = this.selectedRow();
    const currentColumn = this.selectedColumn();
    const maxRow = this.getMaxRow();

    if (currentRow < maxRow) {
      const nextRowCells = this.getRowCells(currentRow + 1);
      const nextColumn = Math.min(currentColumn, nextRowCells.length - 1);
      this.selectCell(currentRow + 1, nextColumn);
    }
  }

  moveUp() {
    const currentRow = this.selectedRow();
    const currentColumn = this.selectedColumn();

    if (currentRow > 0) {
      const prevRowCells = this.getRowCells(currentRow - 1);
      const prevColumn = Math.min(currentColumn, prevRowCells.length - 1);
      this.selectCell(currentRow - 1, prevColumn);
    }
  }

  private getRowCells(row: number): GridCellDirective[] {
    return this.gridCellDirectives.toArray().filter(directive => directive.row === row);
  }

  private getMaxRow(): number {
    const directives = this.gridCellDirectives.toArray();
    const rows = directives.map(directive => directive.row);
    return Math.max(...rows, 0);
  }

  private isCheckboxCell(): boolean {
    const component = this.selectedCellComponent();
    return component?.cellType === 'checkbox';
  }

  private handleCheckboxKeyEvent(event: KeyboardEvent) {
    const component = this.selectedCellComponent();
    if (component && typeof (component as any).onKeyDown === 'function') {
      (component as any).onKeyDown(event);
    }
  }

  private isTextCell(): boolean {
    const component = this.selectedCellComponent();
    return component?.cellType === 'text';
  }

  private isTypableCharacter(event: KeyboardEvent): boolean {
    // IME入力中は無視
    if (event.isComposing) return false;

    // 修飾キーが押されている場合は無視
    if (event.ctrlKey || event.altKey || event.metaKey) return false;

    // 特殊キーは無視
    const specialKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown',
      'Insert', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
      'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];

    if (specialKeys.includes(event.key)) return false;

    // 印刷可能な文字かチェック（長さが1で、制御文字でない）
    return event.key.length === 1 && event.key >= ' ';
  }

  private startEditingWithCharacter(character: string) {
    const directive = this.selectedCellDirective();
    if (directive && directive.canEdit) {
      this.isEditingOnCell.set(true);
      this.updateCellStates();

      // テキストセルコンポーネントに文字を渡して編集開始
      const component = this.selectedCellComponent();
      if (component && typeof (component as any).startEditWithCharacter === 'function') {
        setTimeout(() => {
          (component as any).startEditWithCharacter(character);
        }, 0);
      }
    }
  }
}

import { Component, Directive } from "@angular/core";

export interface GridCellValue {
  value: any;
  onChange: (value: any) => void;
}

export interface GridCellConfig {
  isEditing: boolean;
  onStartEdit?: () => void;
  onStopEdit?: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}


// セルタイプの定義
export type GridCellType = 'text' | 'checkbox' | 'select';

@Directive()
export abstract class GridCellComponent {
  // 各継承クラスでオーバーライドする抽象プロパティ
  abstract readonly cellType: GridCellType;

  startEdit() {
    // デフォルト実装（必要に応じてオーバーライド）
  }
}

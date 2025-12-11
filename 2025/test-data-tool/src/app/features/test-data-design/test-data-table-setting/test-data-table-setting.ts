import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  GridTextCellComponent,
  GridSelectCellComponent,
  GridCheckboxCellComponent,
  GridCellValue,
  GridCellConfig,
  SelectOption
} from '../../../shared/components';
import { DataGridDirective, GridCellDirective } from '../../../shared/directives';
import { TestDataNode } from '../../../models/test-data-node';
import { TestDataNodeColumnSetting } from '../../../models/test-data-node-column-setting';
import { EditorStateService } from '../../../services/editor-state.service';
import { ProjectService } from '../../../services/project.service';

@Component({
  selector: 'app-test-data-table-setting',
  standalone: true,
  imports: [
    GridTextCellComponent,
    GridSelectCellComponent,
    GridCheckboxCellComponent,
    DataGridDirective,
    GridCellDirective
  ],
  templateUrl: './test-data-table-setting.html',
  styleUrls: ['./test-data-table-setting.scss', '../../../shared/directives/grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestDataTableSettingComponent {
  readonly #projectService = inject(ProjectService);
  readonly #editorState = inject(EditorStateService);

  // 選択されている列設定（ツールバーボタン用）
  selectedColumnSetting = signal<TestDataNodeColumnSetting | null>(null);

  // 利用可能なテーブル一覧
  readonly availableTables = computed(() => {
    return this.#projectService.currentProject()?.tableDesigns || [];
  });

  // 現在フォーカスされているノード
  readonly focusedNode = computed(() => {
    return this.#projectService.currentTestDataNode();
  });

  // 選択されているテーブル
  readonly selectedTable = computed(() => {
    const node = this.#projectService.currentTestDataNode();
    const tableDesigns = this.#projectService.currentProject()?.tableDesigns || [];
    if (!node?.tableName) return null;
    return tableDesigns.find(table => table.name === node.tableName) || null;
  });

  // 列設定が追加可能かどうか(computedではダメらしい)
  isAbleToAddColumnSetting(): boolean {
    const node = this.#projectService.currentTestDataNode();
    const tableDesigns = this.#projectService.currentProject()?.tableDesigns || [];
    if (!node?.tableName) return false;
    return (tableDesigns.find(table => table.name === node.tableName) ?? null) != null;
  }

  // テーブル選択変更
  onTableChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const tableName = selectElement.value;
    const node = this.focusedNode();

    if (!node) return;

    if (node.tableName && node.tableName !== tableName) {
      if (confirm('既にテーブルが設定されています。変更しますか？')) {
        this.changeNodeTable(tableName);
      } else {
        // 変更をキャンセルした場合、セレクトボックスを元に戻す
        selectElement.value = node.tableName;
      }
    } else {
      this.changeNodeTable(tableName);
    }
  }

  private changeNodeTable(tableName: string) {
    if (!this.#projectService.currentTestDataNode()) return;

    this.#projectService.currentTestDataNode.update(node => {
      node!.tableName = tableName;
      // テーブル変更時は列設定をクリア
      node!.columnSettings = [];
      return node;
    });
  }

  // 列設定追加
  addColumnSetting() {
    const node = this.focusedNode();
    if (!node) return;

    const newSetting: TestDataNodeColumnSetting = {
      id: this.#projectService.generateId(),
      columnName: '',
      isVisible: true,
      defaultValue: ''
    };

    node.columnSettings.push(newSetting);
    this.selectedColumnSetting.set(newSetting);
  }


  // 利用可能な列一覧
  getAvailableColumns(): string[] {
    const table = this.selectedTable();
    return table?.columnDesigns.map(col => col.name) || [];
  }

  // グリッドセル用のヘルパーメソッド
  getColumnNameCellValue(setting: TestDataNodeColumnSetting): GridCellValue {
    return {
      value: setting.columnName,
      onChange: (newValue: string) => {
        setting.columnName = newValue;
      }
    };
  }

  getVisibilityCellValue(setting: TestDataNodeColumnSetting): GridCellValue {
    return {
      value: setting.isVisible,
      onChange: (newValue: boolean) => {
        setting.isVisible = newValue;
      }
    };
  }

  getDefaultValueCellValue(setting: TestDataNodeColumnSetting): GridCellValue {
    return {
      value: setting.defaultValue,
      onChange: (newValue: string) => {
        setting.defaultValue = newValue;
      }
    };
  }

  getColumnNameOptions(): SelectOption[] {
    const columns = this.getAvailableColumns();
    return [
      { value: '', label: '列を選択' },
      ...columns.map(col => ({ value: col, label: col }))
    ];
  }

  getCellConfig(row: number, column: number): GridCellConfig {
    return {
      isEditing: false, // セルコンポーネント側で動的に管理
      onStartEdit: () => {
        console.log('Start editing:', row, column);
      },
      onStopEdit: () => {
        console.log('Stop editing:', row, column);
      },
      onKeyDown: (event: KeyboardEvent) => {
        console.log('Key down:', event.key);
      }
    };
  }

  // ツールバー機能
  duplicateColumnSetting() {
    const selected = this.selectedColumnSetting();
    const node = this.focusedNode();
    if (!selected || !node) return;

    const currentIndex = node.columnSettings.indexOf(selected);
    const newSetting: TestDataNodeColumnSetting = {
      id: this.#projectService.generateId(),
      columnName: selected.columnName,
      isVisible: selected.isVisible,
      defaultValue: selected.defaultValue
    };

    node.columnSettings.splice(currentIndex + 1, 0, newSetting);
    this.selectedColumnSetting.set(newSetting);
  }

  moveColumnSettingUp() {
    const selected = this.selectedColumnSetting();
    const node = this.focusedNode();
    if (!selected || !node) return;

    const currentIndex = node.columnSettings.indexOf(selected);
    if (currentIndex > 0) {
      const settings = node.columnSettings;
      [settings[currentIndex - 1], settings[currentIndex]] = [settings[currentIndex], settings[currentIndex - 1]];
    }
  }

  moveColumnSettingDown() {
    const selected = this.selectedColumnSetting();
    const node = this.focusedNode();
    if (!selected || !node) return;

    const currentIndex = node.columnSettings.indexOf(selected);
    const settings = node.columnSettings;
    if (currentIndex < settings.length - 1) {
      [settings[currentIndex], settings[currentIndex + 1]] = [settings[currentIndex + 1], settings[currentIndex]];
    }
  }

  canMoveUp(): boolean {
    const selected = this.selectedColumnSetting();
    const node = this.focusedNode();
    if (!selected || !node) return false;
    return node.columnSettings.indexOf(selected) > 0;
  }

  canMoveDown(): boolean {
    const selected = this.selectedColumnSetting();
    const node = this.focusedNode();
    if (!selected || !node) return false;
    const currentIndex = node.columnSettings.indexOf(selected);
    return currentIndex >= 0 && currentIndex < node.columnSettings.length - 1;
  }

  deleteColumnSetting() {
    const selected = this.selectedColumnSetting();
    const node = this.focusedNode();
    if (!selected || !node) return;

    const currentIndex = node.columnSettings.indexOf(selected);
    node.columnSettings.splice(currentIndex, 1);
    this.selectedColumnSetting.set(null);
  }
}

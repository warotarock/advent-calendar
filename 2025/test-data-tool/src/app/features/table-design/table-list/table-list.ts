import { Component, inject, input, output } from '@angular/core';
import { ProjectService } from '../../../services/project.service';
import { EditorStateService } from '../../../services/editor-state.service';
import { TableDesign as TableDesignModel } from '../../../models/table-design';
import { CommonModule } from '@angular/common';
import { EditableTextDirective } from '../../../shared/directives';

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [CommonModule, EditableTextDirective],
  templateUrl: './table-list.html',
  styleUrl: './table-list.scss',
})
export class TableListComponent {
  readonly #projectService = inject(ProjectService);
  readonly #editorState = inject(EditorStateService);

  tableDesigns = input.required<TableDesignModel[]>();

  // EditorStateServiceのアクティブ状態を使用
  get selectedTable() {
    return this.#editorState.activeTable();
  }

  selectTable(table: TableDesignModel) {
    this.#editorState.setActiveTable(table);
  }

  addTable() {
    const tableName = prompt('新しいテーブル名を入力してください:');
    if (tableName) {
      this.#projectService.addTable(tableName);
    }
  }

  deleteTable() {
    const selectedTable = this.selectedTable;
    if (selectedTable && confirm(`テーブル「${selectedTable.name}」を削除しますか？`)) {
      this.#projectService.deleteTable(selectedTable.name);
    }
  }

  renameTable() {
    const selectedTable = this.selectedTable;
    if (selectedTable) {
      const newName = prompt('新しいテーブル名を入力してください:', selectedTable.name);
      if (newName && newName !== selectedTable.name) {
        this.#projectService.renameTable(selectedTable.name, newName);
      }
    }
  }

  duplicateTable() {
    const selectedTable = this.selectedTable;
    if (selectedTable) {
      const newName = prompt('複製後のテーブル名を入力してください:', `${selectedTable.name}_copy`);
      if (newName) {
        this.#projectService.duplicateTable(selectedTable.name, newName);
      }
    }
  }

  onTableNameChange(table: TableDesignModel, newName: string) {
    if (newName && newName !== table.name) {
      this.#projectService.renameTable(table.name, newName);
    }
  }
}

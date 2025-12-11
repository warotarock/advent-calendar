import { Component, computed, effect, inject, signal } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { EditorStateService } from '../../services/editor-state.service';
import { TableDesign as TableDesignModel } from '../../models/table-design';
import { CommonModule } from '@angular/common';
import { TableListComponent } from './table-list/table-list';
import { ColumnDesignComponent } from './column-design/column-design';

@Component({
  selector: 'app-table-design',
  standalone: true,
  imports: [CommonModule, TableListComponent, ColumnDesignComponent],
  templateUrl: './table-design.html',
  styleUrl: './table-design.scss',
})
export class TableDesign {
  readonly #projectService = inject(ProjectService);
  readonly #editorState = inject(EditorStateService);
  readonly tableDesigns = computed(() => {
    const project = this.#projectService.currentProject();
    return project?.tableDesigns.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [];
  });

  // EditorStateServiceのアクティブ状態を使用
  get selectedTable() {
    return this.#editorState.activeTable();
  }

  constructor() {
    // テーブルが存在していて、選択されていない場合は最初のテーブルを選択
    effect(() => {
      const tables = this.tableDesigns();
      const selected = this.#editorState.activeTable();
      if (tables.length > 0 && !selected) {
        this.#editorState.setActiveTable(tables[0]);
      } else if (tables.length === 0) {
        this.#editorState.setActiveTable(null);
      }
    });
  }
}

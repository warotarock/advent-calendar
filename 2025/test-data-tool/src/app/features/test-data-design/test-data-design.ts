import { Component, computed, effect, inject, signal } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { EditorStateService } from '../../services/editor-state.service';
import { TestDataDesign as TestDataDesignModel } from '../../models/test-data-design';
import { CommonModule } from '@angular/common';
import { TestDataDesignListComponent } from './test-data-design-list/test-data-design-list';
import { TestDataDesignEditor } from './test-data-design-editor/test-data-design-editor';
import { TestDataTableSettingComponent } from './test-data-table-setting/test-data-table-setting';

@Component({
  selector: 'app-test-data-design',
  standalone: true,
  imports: [CommonModule, TestDataDesignListComponent, TestDataDesignEditor, TestDataTableSettingComponent],
  templateUrl: './test-data-design.html',
  styleUrl: './test-data-design.scss',
})
export class TestDataDesign {
  readonly #projectService = inject(ProjectService);
  readonly #editorState = inject(EditorStateService);
  readonly testDataDesigns = computed(() => {
    const project = this.#projectService.currentProject();
    return project?.testDataDesigns.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? [];
  });

  // EditorStateServiceのアクティブ状態を使用
  get selectedTestDataDesign() {
    return this.#editorState.activeTestDataDesign();
  }

  constructor() {
    // テストデータ設計が存在していて、選択されていない場合は最初のテストデータ設計を選択
    effect(() => {
      const testDataDesigns = this.testDataDesigns();
      const selected = this.#editorState.activeTestDataDesign();
      if (testDataDesigns.length > 0 && !selected) {
        this.#editorState.setActiveTestDataDesign(testDataDesigns[0]);
      } else if (testDataDesigns.length === 0) {
        this.#editorState.setActiveTestDataDesign(null);
      }
    });
  }
}

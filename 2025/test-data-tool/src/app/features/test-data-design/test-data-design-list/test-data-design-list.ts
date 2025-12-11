import { Component, inject, input, output } from '@angular/core';
import { ProjectService } from '../../../services/project.service';
import { EditorStateService } from '../../../services/editor-state.service';
import { TestDataDesign as TestDataDesignModel } from '../../../models/test-data-design';
import { CommonModule } from '@angular/common';
import { EditableTextDirective } from '../../../shared/directives';

@Component({
  selector: 'app-test-data-design-list',
  standalone: true,
  imports: [CommonModule, EditableTextDirective],
  templateUrl: './test-data-design-list.html',
  styleUrls: ['./test-data-design-list.scss'],
})
export class TestDataDesignListComponent {
  readonly #projectService = inject(ProjectService);
  readonly #editorState = inject(EditorStateService);

  testDataDesigns = input.required<TestDataDesignModel[]>();

  // EditorStateServiceのアクティブ状態を使用
  get selectedTestDataDesign() {
    return this.#editorState.activeTestDataDesign();
  }

  selectTestData(testData: TestDataDesignModel) {
    this.#editorState.setActiveTestDataDesign(testData);
  }

  addTestData() {
    const testDataName = prompt('新しいテストデータ設計名を入力してください:');
    if (testDataName) {
      this.#projectService.addTestDataDesign(testDataName);
    }
  }

  deleteTestData() {
    const selectedTestDataDesign = this.selectedTestDataDesign;
    if (selectedTestDataDesign && confirm(`テストデータ設計「${selectedTestDataDesign.name}」を削除しますか？`)) {
      this.#projectService.deleteTestDataDesign(selectedTestDataDesign.name);
    }
  }

  renameTestData() {
    const selectedTestDataDesign = this.selectedTestDataDesign;
    if (selectedTestDataDesign) {
      const newName = prompt('新しいテストデータ設計名を入力してください:', selectedTestDataDesign.name);
      if (newName && newName !== selectedTestDataDesign.name) {
        this.#projectService.renameTestDataDesign(selectedTestDataDesign.name, newName);
      }
    }
  }

  duplicateTestData() {
    const selectedTestDataDesign = this.selectedTestDataDesign;
    if (selectedTestDataDesign) {
      const newName = prompt('複製後のテストデータ設計名を入力してください:', `${selectedTestDataDesign.name}_copy`);
      if (newName) {
        this.#projectService.duplicateTestDataDesign(selectedTestDataDesign.name, newName);
      }
    }
  }

  onTestDataNameChange(testData: TestDataDesignModel, newName: string) {
    if (newName && newName !== testData.name) {
      this.#projectService.renameTestDataDesign(testData.name, newName);
    }
  }
}

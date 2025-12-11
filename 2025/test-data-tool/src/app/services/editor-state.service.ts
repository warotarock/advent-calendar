import { Injectable, signal } from '@angular/core';
import { TableDesign } from '../models/table-design';
import { TestDataDesign } from '../models/test-data-design';
import { TestDataTree } from '../models/test-data-tree';
import { TestDataNode } from '../models/test-data-node';
import { TestDataRecord } from '../models/test-data-record';

// フォーカス可能な要素の型定義
export type FocusableElement =
  | { type: 'testDataTree'; element: TestDataTree }
  | { type: 'testDataNode'; element: TestDataNode }
  | { type: 'testDataRecord'; element: TestDataRecord }
  | { type: 'fieldValue'; element: { record: TestDataRecord; fieldName: string } };

// パス情報の型定義
export type ElementPath = {
  testDataDesign: TestDataDesign;
  testDataTree?: TestDataTree;
  testDataNode?: TestDataNode;
  testDataRecord?: TestDataRecord;
};

// フォーカス状態の型定義
export type FocusState = {
  focus: FocusableElement;
  path: ElementPath;
};

@Injectable({
  providedIn: 'root',
})
export class EditorStateService {
  // === アクティブな要素（編集対象） ===
  readonly activeTable = signal<TableDesign | null>(null);
  readonly activeTestDataDesign = signal<TestDataDesign | null>(null);

  // === フォーカス状態（UI操作対象） ===
  readonly focusedElement = signal<FocusState | null>(null);

  // === UI表示状態 ===
  readonly selectedElementIds = signal<Set<string>>(new Set());

  // === フォーカス管理メソッド ===
  setFocusedTestDataTree(tree: TestDataTree, path: ElementPath): void {
    this.focusedElement.set({
      focus: { type: 'testDataTree', element: tree },
      path
    });
  }

  setFocusedTestDataNode(node: TestDataNode, path: ElementPath): void {
    this.focusedElement.set({
      focus: { type: 'testDataNode', element: node },
      path
    });
  }

  setFocusedTestDataRecord(record: TestDataRecord, path: ElementPath): void {
    this.focusedElement.set({
      focus: { type: 'testDataRecord', element: record },
      path
    });
  }

  setFocusedFieldValue(record: TestDataRecord, fieldName: string, path: ElementPath): void {
    this.focusedElement.set({
      focus: { type: 'fieldValue', element: { record, fieldName } },
      path
    });
  }

  clearFocus(): void {
    this.focusedElement.set(null);
  }

  // === 状態判定メソッド - テストデータツリー ===
  isTestDataTreeActive(tree: TestDataTree): boolean {
    const focused = this.focusedElement();
    return focused?.path.testDataTree === tree;
  }

  isTestDataTreeFocused(tree: TestDataTree): boolean {
    const focused = this.focusedElement();
    return focused?.focus.type === 'testDataTree' &&
           focused.focus.element === tree;
  }

  // === 状態判定メソッド - テストデータノード ===
  isTestDataNodeActive(node: TestDataNode): boolean {
    const focused = this.focusedElement();
    return focused?.path.testDataNode === node;
  }

  isTestDataNodeFocused(node: TestDataNode): boolean {
    const focused = this.focusedElement();
    return focused?.focus.type === 'testDataNode' &&
           focused.focus.element === node;
  }

  // === 状態判定メソッド - テストデータレコード ===
  isTestDataRecordActive(record: TestDataRecord): boolean {
    const focused = this.focusedElement();
    return focused?.path.testDataRecord === record;
  }

  isTestDataRecordFocused(record: TestDataRecord): boolean {
    const focused = this.focusedElement();
    return focused?.focus.type === 'testDataRecord' &&
           focused.focus.element === record;
  }

  // === 状態判定メソッド - フィールド値 ===
  isFieldValueFocused(record: TestDataRecord, fieldName: string): boolean {
    const focused = this.focusedElement();
    return focused?.focus.type === 'fieldValue' &&
           focused.focus.element.record === record &&
           focused.focus.element.fieldName === fieldName;
  }

  // === アクティブ要素管理 ===
  setActiveTable(table: TableDesign | null): void {
    this.activeTable.set(table);
    // テーブルが変更された場合はフォーカスをクリア
    this.clearFocus();
  }

  setActiveTestDataDesign(design: TestDataDesign | null): void {
    this.activeTestDataDesign.set(design);
    // テストデータ設計が変更された場合はフォーカスをクリア
    this.clearFocus();
  }



  // === 選択状態管理 ===
  toggleElementSelected(elementId: string): void {
    this.selectedElementIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(elementId)) {
        newIds.delete(elementId);
      } else {
        newIds.add(elementId);
      }
      return newIds;
    });
  }

  isElementSelected(elementId: string): boolean {
    return this.selectedElementIds().has(elementId);
  }

  clearSelection(): void {
    this.selectedElementIds.set(new Set());
  }

  // === フォーカス取得メソッド ===
  getCurrentFocusedElement(): FocusState | null {
    return this.focusedElement();
  }

  getFocusedTestDataTree(): TestDataTree | null {
    const focused = this.focusedElement();
    return focused?.path.testDataTree ?? null;
  }

  getFocusedTestDataNode(): TestDataNode | null {
    const focused = this.focusedElement();
    return focused?.path.testDataNode ?? null;
  }

  // === 状態リセット ===
  resetAllStates(): void {
    this.activeTable.set(null);
    this.activeTestDataDesign.set(null);
    this.clearFocus();
    this.selectedElementIds.set(new Set());
  }

  resetEditorStates(): void {
    this.clearFocus();
    this.clearSelection();
  }

  // === ツリー折りたたみ時のフォーカス調整 ===
  handleTreeCollapsed(tree: TestDataTree): void {
    const focused = this.focusedElement();
    if (!focused) return;

    // フォーカスされた要素がこのツリーの配下にあるかチェック
    const isChildOfCollapsedTree = focused.path.testDataTree === tree &&
                                   focused.focus.type !== 'testDataTree';

    if (isChildOfCollapsedTree) {
      // ツリーの配下の要素にフォーカスがある場合、ツリー自体にフォーカスを移す
      this.setFocusedTestDataTree(tree, {
        testDataDesign: focused.path.testDataDesign,
        testDataTree: tree
      });
    }
  }

  // === ノード折りたたみ時のフォーカス調整 ===
  handleNodeCollapsed(node: TestDataNode, tree: TestDataTree): void {
    const focused = this.focusedElement();
    if (!focused) return;

    // フォーカスされた要素がこのノードの配下にあるかチェック
    const isChildOfCollapsedNode = focused.path.testDataNode === node &&
                                   (focused.focus.type === 'testDataRecord' ||
                                    focused.focus.type === 'fieldValue');

    if (isChildOfCollapsedNode) {
      // ノードの配下の要素にフォーカスがある場合、ノード自体にフォーカスを移す
      this.setFocusedTestDataNode(node, {
        testDataDesign: focused.path.testDataDesign,
        testDataTree: tree,
        testDataNode: node
      });
    }
  }
}

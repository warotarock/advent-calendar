import { Component, input, inject, output, effect, computed, signal, ChangeDetectorRef } from '@angular/core';
import { TestDataDesign } from '../../../models/test-data-design';
import { TestDataTree } from '../../../models/test-data-tree';
import { TestDataNode } from '../../../models/test-data-node';
import { TestDataRecord } from '../../../models/test-data-record';
import { TestDataNodeColumnSetting } from '../../../models/test-data-node-column-setting';
import { DisplayTestDataTree, DisplayTestDataNode } from './display-test-data-node';
import { ProjectService } from '../../../services/project.service';
import { EditorStateService } from '../../../services/editor-state.service';
import { AppCheckbox, CollapseToggle, EditableTextDirective } from '../../../shared';

@Component({
  selector: 'app-test-data-design-editor',
  imports: [AppCheckbox, CollapseToggle, EditableTextDirective],
  templateUrl: './test-data-design-editor.html',
  styleUrl: './test-data-design-editor.scss',
})
export class TestDataDesignEditor {
  readonly #projectService = inject(ProjectService);
  readonly #editorState = inject(EditorStateService);
  readonly #cdr = inject(ChangeDetectorRef);
  readonly testDataDesign = input.required<TestDataDesign>();

  // フラット化されたテストデータツリーのリストをsignalで管理
  readonly displayTestDataTrees = signal<DisplayTestDataTree[]>([]);

  constructor() {
    // ProjectServiceのactiveTestDataTreesを監視してフラット化を更新
    effect(() => {
      const trees = this.#projectService.activeTestDataTrees();
      const flattened = trees.map(tree => this.flattenTestDataTree(tree));
      this.displayTestDataTrees.set(flattened);
    });
  }

  addTree() {
    this.#projectService.addTestDataTree(this.testDataDesign());
  }

  addNode() {
    this.#projectService.addTestDataNode();
  }

  addRecord() {
    const focusedNode = this.#editorState.getFocusedTestDataNode();
    if (!focusedNode) {
      alert('レコードを追加するノードを選択してください');
      return;
    }

    this.#projectService.addTestDataRecord(focusedNode);
    // UIの更新を促す
    this.#cdr.markForCheck();
  }

  canAddRecord(): boolean {
    const focusedNode = this.#editorState.getFocusedTestDataNode();
    return focusedNode != null && focusedNode.tableName != null && focusedNode.tableName.length > 0;
  }

  deleteSelectedTrees() {
    this.#projectService.deleteSelectedTrees(this.testDataDesign());
  }

  isTreeExpanded(tree: TestDataTree): boolean {
    return tree?.isExpanded ?? true; // デフォルトは展開
  }

  onTreeToggle(tree: TestDataTree) {
    tree.isExpanded = !tree.isExpanded;

    // 折りたたまれた場合はフォーカス調整
    if (!tree.isExpanded) {
      this.#editorState.handleTreeCollapsed(tree);
    }
  }

  getTreeSelected(tree: TestDataTree): boolean {
    return tree?.isSelected ?? false;
  }

  onTreeSelectionChange(tree: TestDataTree, event: Event) {
    const target = event.target as unknown as AppCheckbox;
    tree.isSelected = target.checked;
  }

  moveSelectedTreesUp() {
    this.#projectService.moveSelectedTreesUp(this.testDataDesign());
  }

  moveSelectedTreesDown() {
    this.#projectService.moveSelectedTreesDown(this.testDataDesign());
  }

  // ツリー名変更ハンドラー
  onTreeNameChange(tree: TestDataTree, newName: string) {
    tree.name = newName;
  }

  // === フォーカス・アクティブ状態管理 ===
  onTreeClick(tree: TestDataTree, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const path = {
      testDataDesign: this.testDataDesign(),
      testDataTree: tree
    };
    this.#editorState.setFocusedTestDataTree(tree, path);
  }

  onNodeClick(node: TestDataNode, tree: TestDataTree, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const path = {
      testDataDesign: this.testDataDesign(),
      testDataTree: tree,
      testDataNode: node
    };

    this.#editorState.setFocusedTestDataNode(node, path);
    this.#cdr.markForCheck();
  }

  isTreeActive(tree: TestDataTree): boolean {
    return this.#editorState.isTestDataTreeActive(tree);
  }

  isTreeFocused(tree: TestDataTree): boolean {
    return this.#editorState.isTestDataTreeFocused(tree);
  }

  isNodeActive(node: TestDataNode): boolean {
    return this.#editorState.isTestDataNodeActive(node);
  }

  isNodeFocused(node: TestDataNode): boolean {
    return this.#editorState.isTestDataNodeFocused(node);
  }

  isNodeExpanded(node: TestDataNode): boolean {
    return node?.isExpanded ?? true;
  }

  onNodeToggle(node: TestDataNode, tree: TestDataTree) {
    node.isExpanded = !node.isExpanded;

    // 折りたたまれた場合はフォーカス調整
    if (!node.isExpanded) {
      this.#editorState.handleNodeCollapsed(node, tree);
    }
  }

  getNodeSelected(node: TestDataNode): boolean {
    return node?.isSelected ?? false;
  }

  onNodeSelectionChange(node: TestDataNode, event: Event) {
    const target = event.target as unknown as AppCheckbox;
    node.isSelected = target.checked;
  }

  onNodeNameChange(node: TestDataNode, newName: string) {
    node.name = newName;
  }

  // === レコード表示関連 ===
  getVisibleColumnSettings(node: TestDataNode): TestDataNodeColumnSetting[] {
    return node.columnSettings.filter(setting => setting.isVisible);
  }

  isRecordFocused(record: TestDataRecord): boolean {
    return this.#editorState.isTestDataRecordFocused(record);
  }

  isFieldCellSelected(record: TestDataRecord, columnName: string): boolean {
    // 将来的にセル選択機能を実装する際に使用
    return false;
  }

  getFieldValueDisplay(record: TestDataRecord, columnName: string): string {
    const fieldValue = record.fieldValues[columnName];
    if (!fieldValue) {
      return '';
    }
    if (fieldValue.isNull) {
      return '<< NULL >>';
    }
    return fieldValue.value || '';
  }

  getRecordIndentPx(nodeIndentLevel: number): number {
    // チェックボックス幅 + 折り畳みトグル幅 + ノードインデント + 余白
    // 概算: チェックボックス(24px) + 折り畳みトグル(24px) + インデント(nodeIndentLevel * 20) + 余白(8px)
    return 24 + 24 + (nodeIndentLevel * 20) + 8;
  }

  onRecordClick(record: TestDataRecord, node: TestDataNode, event: MouseEvent) {
    event.stopPropagation();
    const path = {
      testDataDesign: this.testDataDesign(),
      testDataTree: this.findTreeForNode(node),
      testDataNode: node,
      testDataRecord: record
    };
    this.#editorState.setFocusedTestDataRecord(record, path);
  }

  onRecordSelectionChange(record: TestDataRecord, event: Event) {
    const target = event.target as unknown as AppCheckbox;
    record.isSelected = target.checked;
  }

  onFieldCellClick(record: TestDataRecord, columnName: string, node: TestDataNode, event: MouseEvent) {
    event.stopPropagation();
    // 将来的にセル編集機能を実装する際に使用
    const path = {
      testDataDesign: this.testDataDesign(),
      testDataTree: this.findTreeForNode(node),
      testDataNode: node,
      testDataRecord: record
    };
    this.#editorState.setFocusedTestDataRecord(record, path);
  }

  // === ユーティリティメソッド ===
  private findTreeForNode(targetNode: TestDataNode): TestDataTree | undefined {
    for (const tree of this.testDataDesign().testDataTrees) {
      if (this.nodeExistsInTree(targetNode, tree.nodes)) {
        return tree;
      }
    }
    return undefined;
  }

  private nodeExistsInTree(targetNode: TestDataNode, nodes: TestDataNode[]): boolean {
    for (const node of nodes) {
      if (node === targetNode) {
        return true;
      }
      if (this.nodeExistsInTree(targetNode, node.children)) {
        return true;
      }
    }
    return false;
  }

  // === フラット化処理 ===
  private flattenTestDataTree(tree: TestDataTree): DisplayTestDataTree {
    const displayNodes: DisplayTestDataNode[] = [];

    // 再帰的にノードをフラット化
    this.flattenNodes(tree.nodes, 0, displayNodes);

    return {
      original: tree,
      nodes: displayNodes
    };
  }

  private flattenNodes(nodes: TestDataNode[], indentLevel: number, result: DisplayTestDataNode[]): void {
    for (const node of nodes) {
      // 現在のノードを追加
      result.push({
        original: node,
        indentLevel: indentLevel
      });

      // 展開されている場合のみ子ノードを処理
      if (this.isNodeExpanded(node) && node.children && node.children.length > 0) {
        this.flattenNodes(node.children, indentLevel + 1, result);
      }
    }
  }

}

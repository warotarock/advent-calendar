import { effect, inject, Injectable, signal } from '@angular/core';
import { TestDataDesign, TestDataNode, TestDataRecord, TestDataTree } from '../models';
import { Identifiable } from '../models/identifiable';
import { ProjectSetting } from '../models/project-setting';
import { TableDesign } from '../models/table-design';
import { EditorStateService } from './editor-state.service';
import { IndexedDb } from './indexed-db';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly indexedDb = inject(IndexedDb);
  private readonly editorState = inject(EditorStateService);
  readonly projects = signal<ProjectSetting[]>([]);
  readonly currentProject = signal<ProjectSetting | null>(null);
  readonly currentTestDataNode = signal<TestDataNode | null>(null);
  private idCounter = 1;

  // アクティブなTestDataDesignのtestDataTreesをsignalで公開
  readonly activeTestDataTrees = signal<TestDataTree[]>([]);

  constructor() {
    this.loadInitialProject();
    effect(() => {
      const current = this.currentProject();
      if (current) {
        this.updateProject(current);
      }
    });
    effect(() => {
      this.editorState.activeTestDataDesign(); // 変更検知用
      this.updateActiveTestDataDesign();
    });
    effect(() => {
      this.editorState.focusedElement(); // 変更検知用
      const focused = this.editorState.getFocusedTestDataNode();
      this.currentTestDataNode.set(focused);
    });
  }

  async loadInitialProject() {
    const projects = await this.indexedDb.getProjectSettings();

    // 各プロジェクトにIDを割り振り
    projects.forEach(project => {
      this.ensureAllIds(project);
    });

    this.projects.set(projects);
    if (projects.length > 0) {
      this.currentProject.set(projects[0]);
    } else {
      await this.addProject();
    }
  }

  async updateProject(project: ProjectSetting) {
    await this.indexedDb.updateProjectSetting(project);
    const allProjects = await this.indexedDb.getProjectSettings();
    this.projects.set(allProjects);
  }

  async addProject() {
    const newProject: ProjectSetting = {
      name: '新しいプロジェクト',
      tableDesigns: [],
      testDataDesigns: [],
    };
    const newProjectId = await this.indexedDb.addProjectSetting(newProject);
    const newProj = { ...newProject, id: newProjectId };
    this.projects.update((projs) => [...projs, newProj]);
    this.currentProject.set(newProj);
  }

  async deleteProject(id: number) {
    await this.indexedDb.deleteProjectSetting(id);
    const projects = await this.indexedDb.getProjectSettings();
    this.projects.set(projects);
    if (projects.length > 0) {
      this.currentProject.set(projects[0]);
    } else {
      await this.addProject();
    }
  }

  selectProject(project: ProjectSetting) {
    // プロジェクト選択時にもID割り振りを実行
    this.ensureAllIds(project);
    this.currentProject.set(project);
    this.editorState.resetAllStates(); // エディタ状態をリセット
  }

  async saveProject() {
    const current = this.currentProject();
    if (current) {
      await this.updateProject(current);
    }
  }

  addTable(tableName: string) {
    let newTable: TableDesign | null = null;
    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      newTable = { name: tableName, columnDesigns: [] };
      const newTableDesigns = [...proj.tableDesigns, newTable];
      return { ...proj, tableDesigns: newTableDesigns };
    });
    // 新しいテーブルを自動選択
    if (newTable) {
      this.editorState.setActiveTable(newTable);
    }
  }

  deleteTable(tableName: string) {
    const wasSelected = this.editorState.activeTable()?.name === tableName;

    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      const newTableDesigns = proj.tableDesigns.filter((t) => t.name !== tableName);
      return { ...proj, tableDesigns: newTableDesigns };
    });

    // 選択中のテーブルが削除された場合の処理
    if (wasSelected) {
      const currentProject = this.currentProject();
      if (currentProject && currentProject.tableDesigns.length > 0) {
        // 最初のテーブルを選択
        this.editorState.setActiveTable(currentProject.tableDesigns[0]);
      } else {
        // テーブルがない場合は選択をクリア
        this.editorState.setActiveTable(null);
      }
    }
  }

  renameTable(oldName: string, newName: string) {
    const wasSelected = this.editorState.activeTable()?.name === oldName;
    let updatedTable: TableDesign | null = null;

    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      const newTableDesigns = proj.tableDesigns.map((t) => {
        if (t.name === oldName) {
          updatedTable = { ...t, name: newName };
          return updatedTable;
        }
        return t;
      });
      return { ...proj, tableDesigns: newTableDesigns };
    });

    // 選択中のテーブルの名前が変更された場合、更新後のテーブルを選択状態に保持
    if (wasSelected && updatedTable) {
      this.editorState.setActiveTable(updatedTable);
    }
  }

  duplicateTable(tableName: string, newName: string) {
    let duplicatedTable: TableDesign | null = null;

    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      const table = proj.tableDesigns.find((t) => t.name === tableName);
      if (table) {
        const newTable: TableDesign = JSON.parse(JSON.stringify(table));
        newTable.name = newName;
        duplicatedTable = newTable;
        const newTableDesigns = [...proj.tableDesigns, newTable];
        return { ...proj, tableDesigns: newTableDesigns };
      }
      return proj;
    });

    // 複製されたテーブルを選択
    if (duplicatedTable) {
      this.editorState.setActiveTable(duplicatedTable);
    }
  }

  addTestDataDesign(testDataDesignName: string) {
    let newTestDataDesign: TestDataDesign | null = null;
    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      newTestDataDesign = { name: testDataDesignName, note: '', testDataTrees: [] };
      const newTestDataDesigns = [
        ...proj.testDataDesigns,
        newTestDataDesign,
      ];
      return { ...proj, testDataDesigns: newTestDataDesigns };
    });
    // 新しいテストデータ設計を自動選択
    if (newTestDataDesign) {
      this.editorState.setActiveTestDataDesign(newTestDataDesign);
      this.updateActiveTestDataDesign();
    }
  }

  deleteTestDataDesign(testDataDesignName: string) {
    const wasSelected = this.editorState.activeTestDataDesign()?.name === testDataDesignName;

    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      const newTestDataDesigns = proj.testDataDesigns.filter(
        (t) => t.name !== testDataDesignName
      );
      return { ...proj, testDataDesigns: newTestDataDesigns };
    });

    // 選択中のテストデータ設計が削除された場合の処理
    if (wasSelected) {
      const currentProject = this.currentProject();
      if (currentProject && currentProject.testDataDesigns.length > 0) {
        // 最初のテストデータ設計を選択
        this.editorState.setActiveTestDataDesign(currentProject.testDataDesigns[0]);
      } else {
        // テストデータ設計がない場合は選択をクリア
        this.editorState.setActiveTestDataDesign(null);
      }
      this.updateActiveTestDataDesign();
    }
  }

  renameTestDataDesign(oldName: string, newName: string) {
    const wasSelected = this.editorState.activeTestDataDesign()?.name === oldName;
    let updatedTestDataDesign: TestDataDesign | null = null;

    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      const newTestDataDesigns = proj.testDataDesigns.map((t) => {
        if (t.name === oldName) {
          updatedTestDataDesign = { ...t, name: newName };
          return updatedTestDataDesign;
        }
        return t;
      });
      return { ...proj, testDataDesigns: newTestDataDesigns };
    });

    // 選択中のテストデータ設計の名前が変更された場合、更新後のテストデータ設計を選択状態に保持
    if (wasSelected && updatedTestDataDesign) {
      this.editorState.setActiveTestDataDesign(updatedTestDataDesign);
      this.updateActiveTestDataDesign();
    }
  }

  duplicateTestDataDesign(testDataDesignName: string, newName: string) {
    let duplicatedTestDataDesign: TestDataDesign | null = null;

    this.currentProject.update((proj) => {
      if (!proj) {
        return null;
      }
      const testDataDesign = proj.testDataDesigns.find(
        (t) => t.name === testDataDesignName
      );
      if (testDataDesign) {
        const newTestDataDesign: TestDataDesign = JSON.parse(JSON.stringify(testDataDesign));
        newTestDataDesign.name = newName;
        duplicatedTestDataDesign = newTestDataDesign;
        const newTestDataDesigns = [...proj.testDataDesigns, newTestDataDesign];
        return { ...proj, testDataDesigns: newTestDataDesigns };
      }
      return proj;
    });

    // 複製されたテストデータ設計を選択
    if (duplicatedTestDataDesign) {
      this.editorState.setActiveTestDataDesign(duplicatedTestDataDesign);
      this.updateActiveTestDataDesign();
    }
  }

  addTestDataTree(testDataDesign: TestDataDesign) {
    const newTreeName = this.generateUniqueTreeName(testDataDesign);
    const newTree = {
      id: this.generateId(),
      name: newTreeName,
      note: '',
      isVisible: true,
      isExpanded: true,
      isSelected: false,
      nodes: []
    };
    testDataDesign.testDataTrees = [...testDataDesign.testDataTrees, newTree];
    // signalを更新
    this.refreshActiveTestDataTrees();
  }

  addTestDataNode(): void {
    const focusedTree = this.editorState.getFocusedTestDataTree();
    const focusedNode = this.editorState.getFocusedTestDataNode();
    const currentFocus = this.editorState.getCurrentFocusedElement();

    if (!focusedTree || !currentFocus) {
      // フォーカスがない場合は何もしない
      return;
    }

    // 新しいノード名を生成
    const nodeName = this.generateUniqueNodeName(focusedTree.nodes);

    const newNode: TestDataNode = {
      id: this.generateId(),
      name: nodeName,
      note: '',
      isVisible: true,
      isSelected: false,
      isExpanded: true,
      tableName: '',
      joinColumns: [],
      columnSettings: [],
      records: [],
      children: []
    };

    if (focusedNode) {
      // ノードにフォーカスがある場合、その子ノードとして追加
      focusedNode.children.push(newNode);
      // 親ノードを展開する
      focusedNode.isExpanded = true;
    } else {
      // ツリーにフォーカスがある場合、ルートノードとして追加
      focusedTree.nodes.push(newNode);
      // ツリーを展開する
      focusedTree.isExpanded = true;
    }

    // 新しいノードにフォーカスを設定
    this.editorState.setFocusedTestDataNode(newNode, {
      testDataDesign: currentFocus.path.testDataDesign,
      testDataTree: focusedTree,
      testDataNode: newNode
    });

    // signalを更新
    this.refreshActiveTestDataTrees(true);
  }

  addTestDataRecord(node: TestDataNode): void {
    // ノードにテーブル設定がない場合は追加できない
    if (!node.tableName || node.columnSettings.length === 0) {
      return;
    }

    // 新しいレコードを作成
    const newRecord: TestDataRecord = {
      id: this.generateId(),
      isVisible: true,
      isSelected: false,
      note: '',
      fieldValues: {}
    };

    // 列設定に基づいてフィールド値を初期化
    for (const columnSetting of node.columnSettings) {
      if (columnSetting.columnName) {
        newRecord.fieldValues[columnSetting.columnName] = {
          id: this.generateId(),
          value: columnSetting.defaultValue || '',
          isNull: false,
          note: ''
        };
      }
    }

    // レコードをノードに追加
    node.records.push(newRecord);

    // ノードを展開状態にする
    node.isExpanded = true;

    // signalを更新
    this.refreshActiveTestDataTrees(true);
  }

  private generateUniqueTreeName(testDataDesign: TestDataDesign): string {
    const existingNames = testDataDesign.testDataTrees.map(tree => tree.name);
    let counter = 1;
    let baseName = 'テストデータ';

    while (existingNames.includes(`${baseName}${counter}`)) {
      counter++;
    }

    return `${baseName}${counter}`;
  }

  private generateUniqueNodeName(parentNodes: TestDataNode[]): string {
    const existingNames = this.getAllNodeNames(parentNodes);
    let counter = 1;
    let baseName = 'ノード';

    while (existingNames.includes(`${baseName}${counter}`)) {
      counter++;
    }

    return `${baseName}${counter}`;
  }

  private getAllNodeNames(nodes: TestDataNode[]): string[] {
    const names: string[] = [];
    for (const node of nodes) {
      names.push(node.name);
      names.push(...this.getAllNodeNames(node.children));
    }
    return names;
  }

  deleteSelectedTrees(testDataDesign: TestDataDesign) {
    const selected_testDataTrees = testDataDesign.testDataTrees
      .filter(tree => tree.isSelected);

    if (selected_testDataTrees.length === 0) {
      return; // 選択されたツリーがない場合は何もしない
    }

    const new_testDataTrees = testDataDesign.testDataTrees.filter(tree => !tree.isSelected);

    testDataDesign.testDataTrees = new_testDataTrees;
    // signalを更新
    this.refreshActiveTestDataTrees();
  }

  moveSelectedTreesUp(testDataDesign: TestDataDesign) {
    const trees = testDataDesign.testDataTrees;
    const selectedIndices = trees
      .map((tree, index) => tree.isSelected ? index : -1)
      .filter(index => index !== -1);

    if (selectedIndices.length === 0 || selectedIndices[0] === 0) {
      return; // 選択されたツリーがないか、最初のツリーが選択されている場合
    }

    // 選択されたツリーを上に移動
    for (const index of selectedIndices) {
      [trees[index - 1], trees[index]] = [trees[index], trees[index - 1]];
    }

    // signalを更新
    this.refreshActiveTestDataTrees();
  }

  moveSelectedTreesDown(testDataDesign: TestDataDesign) {
    const trees = testDataDesign.testDataTrees;
    const selectedIndices = trees
      .map((tree, index) => tree.isSelected ? index : -1)
      .filter(index => index !== -1)
      .reverse(); // 下に移動する場合は逆順で処理

    if (selectedIndices.length === 0 || selectedIndices[0] === trees.length - 1) {
      return; // 選択されたツリーがないか、最後のツリーが選択されている場合
    }

    // 選択されたツリーを下に移動
    for (const index of selectedIndices) {
      [trees[index], trees[index + 1]] = [trees[index + 1], trees[index]];
    }

    // signalを更新
    this.refreshActiveTestDataTrees();
  }

  // activeTestDataTrees signalを更新
  private refreshActiveTestDataTrees(forceUpdate: boolean = false) {
    const activeDesign = this.editorState.activeTestDataDesign();
    if (forceUpdate && activeDesign) {
      // 強制更新の場合、浅いコピーを作成してsignalの変更を検知させる
      activeDesign.testDataTrees = [...activeDesign.testDataTrees];
    }
    this.activeTestDataTrees.set(activeDesign?.testDataTrees || []);
  }

  // アクティブTestDataDesignが変更されたときに呼び出される
  updateActiveTestDataDesign() {
    this.refreshActiveTestDataTrees();
  }

  // === ID管理システム ===
  generateId(): string {
    return `id_${this.idCounter++}`;
  }

  private setId(obj: Identifiable) {
    obj.id = this.generateId();
  }

  private ensureAllIds(project: ProjectSetting) {
    for (const design of project.testDataDesigns) {
      for (const tree of design.testDataTrees) {
        this.setId(tree);
        if (!tree.nodes) {
          tree.nodes = []; // 簡易マイグレーション
        }
        for (const node of tree.nodes) {
          this.ensureNodeIds(node);
        }
      }
    }
  }

  private ensureNodeIds(node: TestDataNode) {
    this.setId(node);

    // Join列にIDを割り振り
    if (node.joinColumns) {
       for (const joinCol of node.joinColumns) {
        this.setId(joinCol);
      }
    }

    // 列設定にIDを割り振り
    if (node.columnSettings) {
      for (const colSetting of node.columnSettings) {
        this.setId(colSetting);
      }
    }

    // レコードにIDを割り振り
    if (node.records) {
      for (const record of node.records) {
        this.setId(record);

        // フィールド値にIDを割り振り
        if (record.fieldValues) {
          for (const fieldValue of Object.values(record.fieldValues)) {
            this.setId(fieldValue);
          }
        }
      }
    }

    // 子ノードを再帰的に処理
    if (node.children) {
      for (const child of node.children) {
        this.ensureNodeIds(child);
      }
    }
  }
}

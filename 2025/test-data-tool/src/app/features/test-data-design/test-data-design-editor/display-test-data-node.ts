import { TestDataNode, TestDataTree } from "../../../models";

export interface DisplayTestDataTree {
  original: TestDataTree;
  nodes: DisplayTestDataNode[];
}

export interface DisplayTestDataNode {
  original: TestDataNode;
  indentLevel: number;
}

import { TestDataNode } from './test-data-node';
import { Identifiable } from './identifiable';

export interface TestDataTree extends Identifiable {
  name: string;
  note?: string;
  isVisible: boolean;
  isSelected?: boolean;
  isExpanded: boolean;
  nodes: TestDataNode[];
}

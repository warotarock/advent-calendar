import { TestDataTree } from './test-data-tree';

export interface TestDataDesign {
  name: string;
  note?: string;
  testDataTrees: TestDataTree[];
}

import { TableDesign } from './table-design';
import { TestDataDesign } from './test-data-design';

export interface ProjectSetting {
  id?: number;
  name: string;
  tableDesigns: TableDesign[];
  testDataDesigns: TestDataDesign[];
}

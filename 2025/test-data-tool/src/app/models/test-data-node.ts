import { TestDataNodeColumnSetting } from "./test-data-node-column-setting";
import { TestDataNodeJoinColumn } from "./test-data-node-join-column";
import { TestDataRecord } from "./test-data-record";
import { Identifiable } from './identifiable';

export interface TestDataNode extends Identifiable {
  name: string;
  note?: string;
  isVisible: boolean;
  isSelected?: boolean;
  isExpanded: boolean;
  tableName: string;
  joinColumns: TestDataNodeJoinColumn[];
  columnSettings: TestDataNodeColumnSetting[];
  records: TestDataRecord[];
  children: TestDataNode[];
}

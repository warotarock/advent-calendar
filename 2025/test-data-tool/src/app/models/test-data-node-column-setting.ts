import { Identifiable } from './identifiable';

export interface TestDataNodeColumnSetting extends Identifiable {
  columnName: string;
  isVisible: boolean;
  defaultValue?: string;
}

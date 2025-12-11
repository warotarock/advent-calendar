import { TestDataRecordFieldValue } from "./test-data-record-field-value";
import { Identifiable } from './identifiable';

export interface TestDataRecord extends Identifiable {
  isVisible: boolean;
  isSelected: boolean;
  note?: string;
  fieldValues: Record<string, TestDataRecordFieldValue>;
}

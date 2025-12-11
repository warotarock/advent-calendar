import { Identifiable } from './identifiable';

export interface TestDataRecordFieldValue extends Identifiable {
  value: string;
  isNull?: boolean;
  note?: string;
}

export interface ColumnDesign {
  name: string;
  type: string;
  isNullable: boolean;
  maxLength?: number;
  useThousandsSeparator?: boolean;
}

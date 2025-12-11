import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TableDesign } from '../../../models/table-design';
import { ColumnDesign } from '../../../models/column-design';
import { ProjectService } from '../../../services/project.service';
import {
  GridTextCellComponent,
  GridSelectCellComponent,
  GridCellValue,
  GridCellConfig,
  SelectOption
} from '../../../shared/components/grid-cells';
import { DataGridDirective, GridCellDirective } from '../../../shared/directives';

const COLUMN_TYPES = ['int', 'decimal', 'string', 'GUID', 'Date', 'DateTime'];

@Component({
  selector: 'app-column-design',
  standalone: true,
  imports: [
    GridTextCellComponent,
    GridSelectCellComponent,
    DataGridDirective,
    GridCellDirective
  ],
  templateUrl: './column-design.html',
  styleUrls: ['./column-design.scss', '../../../shared/directives/grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnDesignComponent {
  readonly #projectService = inject(ProjectService);
  table = input<TableDesign | null>(null);
  columns = computed(() => {
    const table = this.table();
    return table ? table.columnDesigns : [];
  });
  selectedColumn = signal<ColumnDesign | null>(null);

  readonly columnTypes: SelectOption[] = COLUMN_TYPES.map(type => ({
    value: type,
    label: type
  }));

  // グリッドセル用のヘルパーメソッド
  getNameCellValue(column: ColumnDesign): GridCellValue {
    return {
      value: column.name,
      onChange: (newValue: string) => {
        column.name = newValue;
      }
    };
  }

  getTypeCellValue(column: ColumnDesign): GridCellValue {
    return {
      value: column.type,
      onChange: (newValue: string) => {
        column.type = newValue;
      }
    };
  }

  getCellConfig(row: number, column: number): GridCellConfig {
    return {
      isEditing: false, // セルコンポーネント側で動的に管理
      onStartEdit: () => {
        console.log('Start editing:', row, column);
      },
      onStopEdit: () => {
        console.log('Stop editing:', row, column);
      },
      onKeyDown: (event: KeyboardEvent) => {
        console.log('Key down:', event.key);
      }
    };
  }

  addColumn() {
    const table = this.table();
    if (!table) return;

    const newColumnName = this.generateUniqueColumnName('new_column');
    const newColumn: ColumnDesign = { name: newColumnName, type: 'string', isNullable: true };

    table.columnDesigns.push(newColumn);
    this.selectedColumn.set(newColumn);
  }

  deleteColumn() {
    const table = this.table();
    const selected = this.selectedColumn();
    if (!table || !selected) return;

    const index = table.columnDesigns.indexOf(selected);
    if (index > -1) {
      table.columnDesigns.splice(index, 1);
      if (table.columnDesigns.length > 0) {
        const newIndex = Math.min(index, table.columnDesigns.length - 1);
        this.selectedColumn.set(table.columnDesigns[newIndex]);
      } else {
        this.selectedColumn.set(null);
      }
    }
  }

  duplicateColumn() {
    const table = this.table();
    const selected = this.selectedColumn();
    if (!table || !selected) return;

    const newColumnName = this.generateUniqueColumnName(
      `${selected.name}_copy`
    );
    const newColumn: ColumnDesign = { ...selected, name: newColumnName };

    const index = table.columnDesigns.indexOf(selected);
    table.columnDesigns.splice(index + 1, 0, newColumn);
    this.selectedColumn.set(newColumn);
  }

  moveColumnUp() {
    const table = this.table();
    const selected = this.selectedColumn();
    if (!table || !selected) return;

    const index = table.columnDesigns.indexOf(selected);
    if (index > 0) {
      [table.columnDesigns[index], table.columnDesigns[index - 1]] = [
        table.columnDesigns[index - 1],
        table.columnDesigns[index],
      ];
    }
  }

  moveColumnDown() {
    const table = this.table();
    const selected = this.selectedColumn();
    if (!table || !selected) return;

    const index = table.columnDesigns.indexOf(selected);
    if (index < table.columnDesigns.length - 1) {
      [table.columnDesigns[index], table.columnDesigns[index + 1]] = [
        table.columnDesigns[index + 1],
        table.columnDesigns[index],
      ];
    }
  }

  private generateUniqueColumnName(baseName: string): string {
    const columns = this.columns();
    let newName = baseName;
    let counter = 1;
    while (columns.some((c) => c.name === newName)) {
      newName = `${baseName}_${counter}`;
      counter++;
    }
    return newName;
  }
}

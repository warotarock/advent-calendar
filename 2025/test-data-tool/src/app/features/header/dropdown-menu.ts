import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-dropdown-menu',
  template: `
    <div class="dropdown-menu">
      <button class="dropdown-item" (click)="openProject.emit()">プロジェクトを開く</button>
      <button class="dropdown-item" (click)="saveProject.emit()">プロジェクトを保存</button>
    </div>
  `,
  styles: [
    `
      .dropdown-menu {
        position: absolute;
        top: 50px;
        left: 10px;
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        z-index: 1000;
      }

      .dropdown-item {
        background: none;
        border: none;
        padding: 10px 20px;
        text-align: left;
        width: 100%;
        cursor: pointer;

        &:hover {
          background-color: #f5f5f5;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenuComponent {
  @Output() openProject = new EventEmitter<void>();
  @Output() saveProject = new EventEmitter<void>();
}

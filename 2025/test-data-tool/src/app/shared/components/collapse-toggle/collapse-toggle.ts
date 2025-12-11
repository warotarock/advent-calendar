import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-collapse-toggle',
  template: `
    <div
      class="collapse-toggle-container"
      [class.expanded]="expanded()"
      [class.collapsed]="!expanded()"
      [class.disabled]="disabled()"
      [title]="disabled() ? '' : (expanded() ? '折り畳む' : '展開する')"
      (click)="onToggle()"
    >
      <svg class="collapse-icon" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5 L6 7.5 L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </svg>
    </div>
  `,
  styleUrl: './collapse-toggle.scss'
})
export class CollapseToggle {
  readonly expanded = input.required<boolean>();
  readonly disabled = input<boolean>(false);

  readonly toggleChange = output<boolean>();

  onToggle() {
    if (this.disabled()) return;

    const newState = !this.expanded();
    this.toggleChange.emit(newState);
  }
}

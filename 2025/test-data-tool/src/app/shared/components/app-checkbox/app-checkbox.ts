import { Component, input, output, forwardRef, effect, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-checkbox',
  template: `
    <div class="checkbox-container" (click)="toggle($event)">
      <input
        type="checkbox"
        class="item-checkbox"
        [id]="checkboxId()"
        [checked]="checked"
        [disabled]="disabled()"
        [title]="title()"
        (change)="onInputChange($event)"
        (click)="$event.stopPropagation()"
        (focus)="onFocus()"
        (blur)="onBlur()">
      <div class="checkbox-visual"></div>
      @if (label()) {
        <label [for]="checkboxId()" class="sr-only">{{ label() }}</label>
      }
    </div>
  `,
  styleUrl: './app-checkbox.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCheckbox),
      multi: true
    }
  ]
})
export class AppCheckbox implements ControlValueAccessor {
  readonly checkboxId = input.required<string>();
  readonly label = input<string>('');
  readonly title = input<string>('チェックボックス');
  readonly disabled = input<boolean>(false);
  readonly value = input<boolean>(false);

  private checkedSignal = signal<boolean>(false);

  get checked() {
    return this.checkedSignal();
  }

  set checked(value: boolean) {
    this.checkedSignal.set(value);
  }

  constructor() {
    // 外部からのvalue inputが変更されたときにcheckbox状態を同期
    effect(() => {
      const inputValue = this.value();
      this.checkedSignal.set(inputValue);
    }, { allowSignalWrites: true });
  }

  private onChange = () => {};
  private onTouched = () => {};

  toggle(event: Event) {
    if (this.disabled()) return;
    event.stopPropagation();

    const target = event.target as HTMLInputElement;
    this.checkedSignal.set(target.checked);
    this.onChange();
  }

  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.checkedSignal.set(target.checked);
    this.onChange();
  }

  onFocus() {
    this.onTouched();
  }

  onBlur() {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    this.checkedSignal.set(!!value);
  }

  registerOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // disabled input is reactive, no additional logic needed
  }
}

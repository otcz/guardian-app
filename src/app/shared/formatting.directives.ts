import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({ selector: '[appUppercase]', standalone: true })
export class UppercaseDirective {
  constructor(private control: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(e: Event) {
    const input = e.target as HTMLInputElement | HTMLTextAreaElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const upper = (input.value || '').toUpperCase();
    if (upper !== input.value) {
      input.value = upper;
      // actualizar form control sin emitir otro evento de input
      this.control?.control?.setValue(upper, { emitEvent: true, emitModelToViewChange: false });
      try { input.setSelectionRange(start, end); } catch {}
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(e: Event) {
    const input = e.target as HTMLInputElement | HTMLTextAreaElement;
    const trimmed = (input.value || '').trim();
    if (trimmed !== input.value) {
      input.value = trimmed;
      this.control?.control?.setValue(trimmed, { emitEvent: true, emitModelToViewChange: false });
    }
  }
}

@Directive({ selector: '[appLowercase]', standalone: true })
export class LowercaseDirective {
  constructor(private control: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(e: Event) {
    const input = e.target as HTMLInputElement | HTMLTextAreaElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const lower = (input.value || '').toLowerCase();
    if (lower !== input.value) {
      input.value = lower;
      this.control?.control?.setValue(lower, { emitEvent: true, emitModelToViewChange: false });
      try { input.setSelectionRange(start, end); } catch {}
    }
  }
}

@Directive({ selector: '[appDigitsOnly]', standalone: true })
export class DigitsOnlyDirective {
  constructor(private control: NgControl) {}

  @HostListener('beforeinput', ['$event'])
  onBeforeInput(e: InputEvent) {
    if (e.data && /\D/.test(e.data)) {
      e.preventDefault();
    }
  }

  @HostListener('input', ['$event'])
  onInput(e: Event) {
    const input = e.target as HTMLInputElement | HTMLTextAreaElement;
    const filtered = (input.value || '').replace(/\D+/g, '');
    if (filtered !== input.value) {
      input.value = filtered;
      this.control?.control?.setValue(filtered, { emitEvent: true, emitModelToViewChange: false });
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') ?? '';
    if (/\D/.test(text)) {
      e.preventDefault();
      const digits = text.replace(/\D+/g, '');
      const input = e.target as HTMLInputElement | HTMLTextAreaElement;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const newValue = (input.value.slice(0, start) + digits + input.value.slice(end));
      input.value = newValue;
      this.control?.control?.setValue(newValue, { emitEvent: true, emitModelToViewChange: false });
      try { input.setSelectionRange(start + digits.length, start + digits.length); } catch {}
    }
  }
}

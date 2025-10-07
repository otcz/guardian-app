import { Inject, Injectable, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class UppercaseGlobalService {
  private processing = false;

  constructor(@Inject(DOCUMENT) private doc: Document, private zone: NgZone) {
    // Ejecutar fuera de Angular para minimizar change detection; re-entrar solo cuando cambiamos valor
    this.zone.runOutsideAngular(() => {
      this.doc.addEventListener('input', this.onInput, { capture: true });
      this.doc.addEventListener('blur', this.onBlur, { capture: true, passive: true });
      this.doc.addEventListener('paste', this.onPaste, { capture: true });
    });
  }

  private isTarget(el: any): el is HTMLInputElement | HTMLTextAreaElement {
    if (!el) return false;
    const isInput = el instanceof HTMLInputElement;
    const isTextArea = el instanceof HTMLTextAreaElement;
    if (!isInput && !isTextArea) return false;
    // Opt-out por atributo o clase
    const attr = (el.getAttribute && (el.getAttribute('data-uppercase') || el.getAttribute('data-no-uppercase'))) || '';
    const hasOptOut = (attr && attr.toString().toLowerCase() === 'off') || el.hasAttribute?.('data-no-uppercase') || el.classList?.contains('no-uppercase');
    if (hasOptOut) return false;
    if (isInput) {
      const type = (el.type || 'text').toLowerCase();
      // Excluir tipos que no deben transformarse
      if (['password', 'file', 'number', 'range', 'date', 'datetime-local', 'time', 'month', 'week', 'color'].includes(type)) return false;
    }
    // Aceptar: text, search, email, url, tel, textarea, y inputs sin type
    return true;
  }

  private onInput = (ev: Event) => {
    if (this.processing) return;
    const target = ev.target as any;
    if (!this.isTarget(target)) return;
    const el = target as HTMLInputElement | HTMLTextAreaElement;
    const prev = el.value ?? '';
    const upper = prev.toUpperCase();
    if (upper !== prev) {
      // Evitar bucle reentrante
      this.processing = true;
      const start = el.selectionStart ?? upper.length;
      const end = el.selectionEnd ?? upper.length;
      el.value = upper;
      // Re-emitir input para notificar a Angular/NgModel/FormControl
      const evt = new Event('input', { bubbles: true });
      el.dispatchEvent(evt);
      try { el.setSelectionRange(start, end); } catch {}
      this.processing = false;
    }
  };

  private onBlur = (ev: Event) => {
    const target = ev.target as any;
    if (!this.isTarget(target)) return;
    const el = target as HTMLInputElement | HTMLTextAreaElement;
    const prev = el.value ?? '';
    const trimmed = prev.trim();
    if (trimmed !== prev) {
      this.processing = true;
      el.value = trimmed;
      const evt = new Event('input', { bubbles: true });
      el.dispatchEvent(evt);
      this.processing = false;
    }
  };

  private onPaste = (ev: ClipboardEvent) => {
    const target = ev.target as any;
    if (!this.isTarget(target)) return;
    const el = target as HTMLInputElement | HTMLTextAreaElement;
    const data = ev.clipboardData?.getData('text');
    if (data == null) return;
    // Prevenir pegado original y forzar mayúsculas manualmente para mantener caret
    ev.preventDefault();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const upper = data.toUpperCase();
    const next = (el.value.slice(0, start) + upper + el.value.slice(end));
    this.processing = true;
    el.value = next;
    const evt = new Event('input', { bubbles: true });
    el.dispatchEvent(evt);
    try { const pos = start + upper.length; el.setSelectionRange(pos, pos); } catch {}
    this.processing = false;
  };
}

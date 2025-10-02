import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

type UiMessage = { severity?: 'success' | 'info' | 'warn' | 'error'; summary?: string; detail?: string; life?: number; closable?: boolean; key?: string };

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private msg: MessageService) {}

  private normalize(text: any): string {
    const s = String(text ?? '').trim();
    if (!s) return '';
    try {
      // Intenta corregir mojibake típico (latin-1 tratado como utf-8)
      const bytes = Uint8Array.from([...s].map(ch => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      // Si la decodificación no mejoró, regresa original
      return decoded.includes('�') ? s : decoded;
    } catch {
      return s;
    }
  }

  private pickMessageFromResponse(resp: any): string {
    return this.normalize(resp?.message ?? resp?.data?.message ?? '');
  }
  private pickMessageFromError(err: any): string {
    return this.normalize(err?.error?.message ?? err?.message ?? '');
  }

  success(message: string) {
    const m = this.normalize(message) || 'Operación exitosa.';
    this.msg.add({ severity: 'success', summary: 'Éxito', detail: m, life: 3500 });
  }
  error(message: string) {
    const m = this.normalize(message) || 'Ocurrió un problema.';
    this.msg.add({ severity: 'error', summary: 'Error', detail: m, life: 4500 });
  }
  info(message: string) {
    const m = this.normalize(message) || 'Información';
    this.msg.add({ severity: 'info', summary: 'Info', detail: m, life: 3500 });
  }
  warn(message: string) {
    const m = this.normalize(message) || 'Atención';
    this.msg.add({ severity: 'warn', summary: 'Aviso', detail: m, life: 3500 });
  }

  fromApiResponse(resp: any, fallback = 'Operación exitosa.') {
    this.success(this.pickMessageFromResponse(resp) || fallback);
  }
  fromApiError(err: any, fallback = 'Ocurrió un problema.') {
    this.error(this.pickMessageFromError(err) || fallback);
  }
}

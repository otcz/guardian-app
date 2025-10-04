import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

export type Severity = 'success' | 'info' | 'warn' | 'error';
export interface UIMessage { severity?: Severity; summary?: string; detail?: string; life?: number; key?: string; sticky?: boolean; }

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private messages: MessageService) {}

  show(msg: UIMessage) { this.messages.add({ life: msg.life ?? 3500, ...msg }); }
  success(summary: string, detail?: string) { this.show({ severity: 'success', summary, detail }); }
  info(summary: string, detail?: string) { this.show({ severity: 'info', summary, detail }); }
  warn(summary: string, detail?: string) { this.show({ severity: 'warn', summary, detail }); }
  error(summary: string, detail?: string) { this.show({ severity: 'error', summary, detail, life: 5000 }); }

  // helper para mensajes estándar de CRUD
  saved(ok: boolean, entity = 'registro') {
    if (ok) this.success('Listo', `${entity} guardado correctamente.`);
    else this.error('Ups', `No se pudo guardar el ${entity}.`);
  }
}

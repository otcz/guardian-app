import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ScopeNivel = 'ORGANIZACION' | 'SECCION' | string;

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private orgKey = 'currentOrgId';
  private scopeKey = 'scopeNivel';
  private seccionKey = 'seccionPrincipalId';
  private lockKey = 'ctxLocked';

  private orgSubj = new BehaviorSubject<string | null>(null);
  private scopeSubj = new BehaviorSubject<ScopeNivel | null>(null);
  private seccionSubj = new BehaviorSubject<string | null>(null);
  private lockedSubj = new BehaviorSubject<boolean>(false);

  readonly orgId$ = this.orgSubj.asObservable();
  readonly scope$ = this.scopeSubj.asObservable();
  readonly seccionId$ = this.seccionSubj.asObservable();
  readonly locked$ = this.lockedSubj.asObservable();

  constructor() {
    // inicializar desde storage
    try { const id = localStorage.getItem(this.orgKey); this.orgSubj.next(id ? String(id) : null); } catch { this.orgSubj.next(null); }
    try { const scope = localStorage.getItem(this.scopeKey); this.scopeSubj.next(scope ? String(scope) as ScopeNivel : null); } catch { this.scopeSubj.next(null); }
    try { const sec = localStorage.getItem(this.seccionKey); this.seccionSubj.next(sec ? String(sec) : null); } catch { this.seccionSubj.next(null); }
    try { const locked = localStorage.getItem(this.lockKey) === '1'; this.lockedSubj.next(locked); } catch { this.lockedSubj.next(false); }
  }

  // Getters actuales
  get value(): string | null { return this.orgSubj.value; }
  get scope(): ScopeNivel | null { return this.scopeSubj.value; }
  get seccion(): string | null { return this.seccionSubj.value; }
  get isLocked(): boolean { return this.lockedSubj.value; }

  // Bloquear contexto: fija valores iniciales y los vuelve inmutables hasta logout/clear
  lock(ctx: { orgId: string | null; scopeNivel: ScopeNivel | null; seccionPrincipalId: string | null }) {
    if (this.lockedSubj.value) return; // ya bloqueado
    // Normalizar y persistir
    const id = ctx.orgId != null ? String(ctx.orgId) : null;
    const scope = ctx.scopeNivel != null ? (String(ctx.scopeNivel).toUpperCase() as ScopeNivel) : null;
    const sec = ctx.seccionPrincipalId != null ? String(ctx.seccionPrincipalId) : null;

    this.orgSubj.next(id);
    this.scopeSubj.next(scope);
    this.seccionSubj.next(sec);
    try {
      if (id) localStorage.setItem(this.orgKey, id); else localStorage.removeItem(this.orgKey);
      if (scope) localStorage.setItem(this.scopeKey, scope); else localStorage.removeItem(this.scopeKey);
      if (sec) localStorage.setItem(this.seccionKey, sec); else localStorage.removeItem(this.seccionKey);
      localStorage.setItem(this.lockKey, '1');
    } catch {}
    this.lockedSubj.next(true);
  }

  // Setters (no-op si está bloqueado)
  set(id: string | null | undefined) {
    if (this.lockedSubj.value) return;
    const v = id != null ? String(id) : null;
    this.orgSubj.next(v);
    try { if (v) localStorage.setItem(this.orgKey, v); else localStorage.removeItem(this.orgKey); } catch {}
  }
  setScope(scope: ScopeNivel | null | undefined) {
    if (this.lockedSubj.value) return;
    const v = scope != null ? (String(scope).toUpperCase() as ScopeNivel) : null;
    this.scopeSubj.next(v);
    try { if (v) localStorage.setItem(this.scopeKey, v); else localStorage.removeItem(this.scopeKey); } catch {}
  }
  setSeccion(id: string | null | undefined) {
    if (this.lockedSubj.value) return;
    const v = id != null ? String(id) : null;
    this.seccionSubj.next(v);
    try { if (v) localStorage.setItem(this.seccionKey, v); else localStorage.removeItem(this.seccionKey); } catch {}
  }
  setContext(ctx: { orgId?: string | null; scopeNivel?: ScopeNivel | null; seccionPrincipalId?: string | null }) {
    if (this.lockedSubj.value) return;
    if (ctx.orgId !== undefined) this.set(ctx.orgId);
    if (ctx.scopeNivel !== undefined) this.setScope(ctx.scopeNivel);
    if (ctx.seccionPrincipalId !== undefined) this.setSeccion(ctx.seccionPrincipalId);
  }

  ensureFromQuery(qId: string | null | undefined): string | null {
    if (qId) { this.set(String(qId)); return String(qId); }
    if (this.value) return this.value;
    try { const ls = localStorage.getItem(this.orgKey); if (ls) { this.set(ls); return ls; } } catch {}
    return null;
  }

  clear() {
    this.lockedSubj.next(false);
    try { localStorage.removeItem(this.lockKey); } catch {}
    this.set(null);
    this.setScope(null);
    this.setSeccion(null);
  }
}

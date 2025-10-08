import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ScopeNivel = 'ORGANIZACION' | 'SECCION' | string;

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private orgKey = 'currentOrgId';
  private scopeKey = 'scopeNivel';
  private seccionKey = 'seccionPrincipalId';

  private orgSubj = new BehaviorSubject<string | null>(null);
  private scopeSubj = new BehaviorSubject<ScopeNivel | null>(null);
  private seccionSubj = new BehaviorSubject<string | null>(null);

  readonly orgId$ = this.orgSubj.asObservable();
  readonly scope$ = this.scopeSubj.asObservable();
  readonly seccionId$ = this.seccionSubj.asObservable();

  constructor() {
    // inicializar desde storage
    try { const id = localStorage.getItem(this.orgKey); this.orgSubj.next(id ? String(id) : null); } catch { this.orgSubj.next(null); }
    try { const scope = localStorage.getItem(this.scopeKey); this.scopeSubj.next(scope ? String(scope) as ScopeNivel : null); } catch { this.scopeSubj.next(null); }
    try { const sec = localStorage.getItem(this.seccionKey); this.seccionSubj.next(sec ? String(sec) : null); } catch { this.seccionSubj.next(null); }
  }

  // Getters actuales
  get value(): string | null { return this.orgSubj.value; }
  get scope(): ScopeNivel | null { return this.scopeSubj.value; }
  get seccion(): string | null { return this.seccionSubj.value; }

  // Setters
  set(id: string | null | undefined) {
    const v = id != null ? String(id) : null;
    this.orgSubj.next(v);
    try { if (v) localStorage.setItem(this.orgKey, v); else localStorage.removeItem(this.orgKey); } catch {}
  }
  setScope(scope: ScopeNivel | null | undefined) {
    const v = scope != null ? (String(scope).toUpperCase() as ScopeNivel) : null;
    this.scopeSubj.next(v);
    try { if (v) localStorage.setItem(this.scopeKey, v); else localStorage.removeItem(this.scopeKey); } catch {}
  }
  setSeccion(id: string | null | undefined) {
    const v = id != null ? String(id) : null;
    this.seccionSubj.next(v);
    try { if (v) localStorage.setItem(this.seccionKey, v); else localStorage.removeItem(this.seccionKey); } catch {}
  }
  setContext(ctx: { orgId?: string | null; scopeNivel?: ScopeNivel | null; seccionPrincipalId?: string | null }) {
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
    this.set(null);
    this.setScope(null);
    this.setSeccion(null);
  }
}

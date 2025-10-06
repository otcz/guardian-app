import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private key = 'currentOrgId';
  private subj = new BehaviorSubject<string | null>(null);
  readonly orgId$ = this.subj.asObservable();

  constructor() {
    // inicializar desde storage
    try {
      const id = localStorage.getItem(this.key);
      this.subj.next(id ? String(id) : null);
    } catch {
      this.subj.next(null);
    }
  }

  get value(): string | null { return this.subj.value; }

  set(id: string | null | undefined) {
    const v = id != null ? String(id) : null;
    this.subj.next(v);
    try { if (v) localStorage.setItem(this.key, v); else localStorage.removeItem(this.key); } catch {}
  }

  ensureFromQuery(qId: string | null | undefined): string | null {
    if (qId) { this.set(String(qId)); return String(qId); }
    if (this.value) return this.value;
    try { const ls = localStorage.getItem(this.key); if (ls) { this.set(ls); return ls; } } catch {}
    return null;
  }

  clear() { this.set(null); }
}


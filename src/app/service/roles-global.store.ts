import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { RolesService, RoleEntity } from './roles.service';

export interface RolesGlobalState {
  data: RoleEntity[];
  loading: boolean;
  error: string | null;
  lastLoadedAt?: number | null;
}

@Injectable({ providedIn: 'root' })
export class RolesGlobalStore {
  private state$: BehaviorSubject<RolesGlobalState> = new BehaviorSubject<RolesGlobalState>({
    data: [],
    loading: false,
    error: null,
    lastLoadedAt: null
  });

  constructor(private rolesSvc: RolesService) {}

  get snapshot(): RolesGlobalState { return this.state$.value; }
  select(): Observable<RolesGlobalState> { return this.state$.asObservable(); }
  data$(): Observable<RoleEntity[]> { return this.state$.asObservable().pipe(map(s => s.data)); }

  /** Carga una vez la lista global de roles (sin paginación). Usa cache en memoria. */
  loadOnce(force: boolean = false): Observable<RoleEntity[]> {
    const st = this.snapshot;
    if (!force && st.data.length > 0) {
      return of(st.data);
    }
    if (st.loading) {
      return this.data$().pipe(take(1));
    }
    this.patch({ loading: true, error: null });
    return this.rolesSvc.fetchAllGlobalRoles().pipe(
      map(list => list.map(r => ({
        ...r,
        display: r.display || `${r.nombre}${r.orgNombre ? '-' + r.orgNombre : ''}`
      } as RoleEntity))),
      catchError((e) => {
        const msg = e?.error?.message || e?.message || 'No se pudieron obtener los roles';
        this.patch({ error: msg });
        return of([] as RoleEntity[]);
      }),
      finalize(() => this.patch({ loading: false, lastLoadedAt: Date.now() })),
      switchMap(arr => {
        if (arr.length) this.patch({ data: arr });
        return of(this.snapshot.data);
      }),
      shareReplay(1)
    );
  }

  /** Filtro local por display (ROL-ORG). */
  filterLocal(query: string): Observable<RoleEntity[]> {
    const q = (query || '').trim().toLowerCase();
    return this.data$().pipe(
      map(list => {
        if (!q) return list;
        return list.filter(r => String(r.display || `${r.nombre}${r.orgNombre ? '-' + r.orgNombre : ''}`).toLowerCase().includes(q));
      })
    );
  }

  private patch(patch: Partial<RolesGlobalState>) {
    this.state$.next({ ...this.snapshot, ...patch });
  }
}

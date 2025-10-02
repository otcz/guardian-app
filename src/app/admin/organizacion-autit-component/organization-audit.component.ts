import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {FormsModule} from '@angular/forms';
import {environment} from '../../config/environment';
import {CardModule} from 'primeng/card';
import {InputSwitchModule} from 'primeng/inputswitch';
import {InputTextModule} from 'primeng/inputtext';

interface AuditLog {
  id?: string;
  fecha_creacion?: string; // timestamp
  nivel_contexto?: string; // ORGANIZACION | SECCION
  accion?: string;
  detalle?: string;
  id_usuario?: string;
  id_seccion?: string;
}

@Component({
  selector: 'app-organization-audit',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, TagModule, ProgressSpinnerModule, FormsModule, CardModule, InputSwitchModule, InputTextModule],
  templateUrl: './organization-audit.component.html',
  styleUrls: ['./organization-audit.component.scss']
})
export class OrganizationAuditComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  error: string | null = null;
  logs: AuditLog[] = [];
  filtered: AuditLog[] = [];
  filter = '';
  autoRefresh = false;
  private intervalRef: any;

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) {
  }

  ngOnInit(): void {
    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    if (!this.orgId) {
      this.error = 'No se ha definido organización';
      return;
    }
    this.load();
  }

  ngOnDestroy() {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  toggleAuto() {
    if (this.autoRefresh) {
      this.intervalRef = setInterval(() => this.load(true), 10000);
    } else if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  applyFilter() {
    const f = (this.filter || '').toLowerCase().trim();
    if (!f) {
      this.filtered = [...this.logs];
      return;
    }
    this.filtered = this.logs.filter(l => (l.accion || '').toLowerCase().includes(f) || (l.detalle || '').toLowerCase().includes(f));
  }

  load(silent = false) {
    if (!this.orgId) return;
    if (!silent) {
      this.loading = true;
      this.error = null;
    }
    // Endpoint tentativo (ajusta al real cuando esté disponible). Ej: /api/orgs/{id}/auditoria
    const url = `${environment.apiBase}/orgs/${this.orgId}/auditoria`;
    this.http.get<AuditLog[]>(url).subscribe({
      next: data => {
        this.logs = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: e => {
        this.error = e?.error?.message || 'No se pudieron cargar los registros';
        this.loading = false;
      }
    });
  }

  back() {
    this.router.navigate(['/listar-organizaciones']);
  }
}

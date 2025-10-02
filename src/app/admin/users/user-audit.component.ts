// filepath: c:\Users\OTCZ\WebstormProjects\guardian-app\src\app\admin\users\user-audit.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { UsersService } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { SideNavComponent } from '../../shared/side-nav.component';
import { TranslatePipe } from '../../service/i18n.service';

interface AuditItem { id?: number; when?: string; who?: string; action?: string; detail?: string }

@Component({
  selector: 'app-user-audit',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, TooltipModule, SideNavComponent, TranslatePipe],
  template: `
  <div class="admin-grid">
    <app-side-nav title="Administración"></app-side-nav>
    <div class="card">
      <div class="header-row">
        <h2>{{ 'audit.title' | t }}</h2>
        <span class="spacer"></span>
        <button pButton class="p-button-outlined" icon="pi pi-arrow-left" label="Volver" (click)="back()"></button>
      </div>

      <p-table [value]="items" [loading]="loading()">
        <ng-template pTemplate="header">
          <tr><th>Fecha</th><th>Acción</th><th>Usuario</th><th>Detalle</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>{{ row.when || '-' }}</td>
            <td>{{ row.action || '-' }}</td>
            <td>{{ row.who || '-' }}</td>
            <td>{{ row.detail || '-' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4">{{ 'audit.empty' | t }}</td></tr>
        </ng-template>
      </p-table>
    </div>
  </div>
  `,
  styles: [`.admin-grid{display:grid;grid-template-columns:auto 1fr;gap:16px}.header-row{display:flex;align-items:center;gap:10px}.spacer{flex:1 1 auto}`]
})
export class UserAuditComponent implements OnInit {
  id!: number;
  items: AuditItem[] = [];
  loading = signal(false);
  constructor(private route: ActivatedRoute, private router: Router, private users: UsersService, private notify: NotificationService) {}
  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id') || '0');
    if (!this.id) { this.notify.warn('ID inválido'); this.back(); return; }
    this.fetch();
  }
  fetch() {
    this.loading.set(true);
    this.users.getAudit(this.id).subscribe({
      next: (arr: any[]) => { this.items = (arr||[]).map((it: any) => ({ id: it.id, when: it.when || it.fecha || it.createdAt, who: it.who || it.usuario || it.user, action: it.action || it.accion, detail: it.detail || it.detalle })); this.loading.set(false); },
      error: (e: any) => { this.loading.set(false); this.notify.fromApiError(e, 'No fue posible cargar auditoría.'); }
    });
  }
  back() { this.router.navigate(['/admin/users']); }
}


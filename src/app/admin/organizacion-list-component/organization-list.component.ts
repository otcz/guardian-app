// filepath: c:\Users\oscar.carrillo\WebstormProjects\guardian-app\src\app\admin\organization-list.component.ts
import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule} from '@angular/router';
import {Organization, OrganizationService} from '../../service/organization.service';
import {TableModule} from 'primeng/table';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TagModule} from 'primeng/tag';
import {FormsModule} from '@angular/forms';
import {TooltipModule} from 'primeng/tooltip';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, ButtonModule, InputTextModule, TagModule, FormsModule, TooltipModule],
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.scss']
})
export class OrganizationListComponent implements OnInit {
  loading = false;
  orgs: Organization[] = [];
  filtered: Organization[] = [];
  filter = '';
  error: string | null = null;

  constructor(private orgService: OrganizationService, private router: Router) {
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = null;
    this.orgService.list().subscribe({
      next: (data) => {
        this.orgs = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.message || 'Error al cargar organizaciones';
        this.loading = false;
      }
    });
  }

  applyFilter() {
    const f = (this.filter || '').trim().toLowerCase();
    if (!f) {
      this.filtered = [...this.orgs];
      return;
    }
    this.filtered = this.orgs.filter(o => (o.nombre || '').toLowerCase().includes(f));
  }

  goCreate() {
    this.router.navigate(['/crear-organizacion']);
  }

  manage(org: Organization) {
    if (org.id) localStorage.setItem('currentOrgId', org.id);
    this.router.navigate(['/gestionar-organizacion'], {queryParams: {id: org.id}});
  }

  strategy(org: Organization) {
    if (org.id) localStorage.setItem('currentOrgId', org.id);
    this.router.navigate(['/cambiar-estrategia-de-gobernanza'], { queryParams: { id: org.id } });
  }
}

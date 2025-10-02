// filepath: c:\Users\oscar.carrillo\WebstormProjects\guardian-app\src\app\admin\organization-strategy.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrganizationService, GovernanceStrategy } from '../../service/organization.service';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';

interface AlcanceOption { label: string; value: GovernanceStrategy['alcance_ingresos']; }

@Component({
  selector: 'app-organization-strategy',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CardModule, InputTextModule, InputTextarea, InputSwitchModule, DropdownModule, ButtonModule, ProgressSpinnerModule, ThemeToggleComponent],
  templateUrl: './organization-strategy.component.html',
  styleUrls: ['./organization-strategy.component.scss']
})
export class OrganizationStrategyComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  strategy: GovernanceStrategy | null = null;
  form!: FormGroup;
  alcanceOptions: AlcanceOption[] = [
    { label: 'ORGANIZACION', value: 'ORGANIZACION' },
    { label: 'SECCION', value: 'SECCION' },
    { label: 'AMBOS', value: 'AMBOS' }
  ];
  nombreOptions = ['CENTRALIZADA', 'FEDERADA', 'HIBRIDA'];

  constructor(private route: ActivatedRoute, private router: Router, private fb: FormBuilder, private orgService: OrganizationService) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      hereda_roles: [true],
      crea_roles_locales: [false],
      crea_parametros_locales: [false],
      autonomia_menu_local: [false],
      crea_usuarios_en_seccion: [false],
      gestiona_vehiculos_locales: [false],
      asigna_permisos_directos: [false],
      alcance_ingresos: ['ORGANIZACION', Validators.required],
      activa: [true]
    });
  }

  ngOnInit(): void {
    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    if (!this.orgId) {
      this.error = 'No se proporcionó id de organización';
      return;
    }
    this.load();
  }

  back() { this.router.navigate(['/listar-organizaciones']); }

  load() {
    this.loading = true; this.error = null;
    this.orgService.getStrategy(this.orgId!).subscribe({
      next: (s) => { this.strategy = s; this.form.patchValue(s); this.loading = false; },
      error: (e) => { // si 404 se considera nueva estrategia
        if (e?.status === 404) { this.strategy = null; this.loading = false; }
        else { this.error = e?.error?.message || 'Error al cargar estrategia'; this.loading = false; }
      }
    });
  }

  submit() {
    if (!this.orgId) return; this.error = null; this.success = null;
    if (this.form.invalid) { this.error = 'Formulario inválido'; return; }
    const value = this.form.value as GovernanceStrategy;
    this.saving = true;
    this.orgService.updateStrategy(this.orgId, value).subscribe({
      next: (s) => { this.strategy = s; this.success = 'Estrategia guardada'; this.saving = false; },
      error: (e) => { this.error = e?.error?.message || 'Error al guardar estrategia'; this.saving = false; }
    });
  }

  adjustByNombre() {
    const nombre: string = this.form.get('nombre')?.value;
    if (!nombre) return;
    if (nombre === 'CENTRALIZADA') {
      this.form.patchValue({
        hereda_roles: true,
        crea_roles_locales: false,
        crea_parametros_locales: false,
        autonomia_menu_local: false,
        crea_usuarios_en_seccion: false,
        gestiona_vehiculos_locales: false,
        asigna_permisos_directos: false,
        alcance_ingresos: 'ORGANIZACION'
      });
    } else if (nombre === 'FEDERADA') {
      this.form.patchValue({
        hereda_roles: true,
        crea_roles_locales: true,
        crea_parametros_locales: true,
        autonomia_menu_local: true,
        crea_usuarios_en_seccion: true,
        gestiona_vehiculos_locales: true,
        asigna_permisos_directos: true,
        alcance_ingresos: 'AMBOS'
      });
    } else if (nombre === 'HIBRIDA') {
      this.form.patchValue({
        hereda_roles: true,
        crea_roles_locales: false,
        crea_parametros_locales: true,
        autonomia_menu_local: true,
        crea_usuarios_en_seccion: false,
        gestiona_vehiculos_locales: true,
        asigna_permisos_directos: false,
        alcance_ingresos: 'AMBOS'
      });
    }
  }
}

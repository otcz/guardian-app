// filepath: c:\Users\oscar.carrillo\WebstormProjects\guardian-app\src\app\admin\organization-strategy.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrganizationService, GovernanceStrategy } from '../../service/organization.service';
import { NotificationService } from '../../service/notification.service';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface AlcanceOption { label: string; value: GovernanceStrategy['alcance_ingresos']; }

@Component({
  selector: 'app-crear-strategy',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CardModule, InputTextModule, TextareaModule, InputSwitchModule, DropdownModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './crear-strategy.component.html',
  styleUrls: ['./crear-strategy.component.scss']
})
export class CrearStrategyComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  infoMessage: string | null = null; // Mensaje dinámico cuando no hay estrategia
  strategy: GovernanceStrategy | null = null;
  form!: FormGroup;
  alcanceOptions: AlcanceOption[] = [
    { label: 'ORGANIZACION', value: 'ORGANIZACION' },
    { label: 'SECCION', value: 'SECCION' },
    { label: 'AMBOS', value: 'AMBOS' }
  ];
  nombreOptions = ['CENTRALIZADA', 'FEDERADA', 'HIBRIDA'];

  constructor(private route: ActivatedRoute, private router: Router, private fb: FormBuilder, private orgService: OrganizationService, private notify: NotificationService) {
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
    // Ya no dependemos de organización para crear estrategia
    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    // Modo creaci��n: no cargamos nada, dejamos el formulario en blanco
    this.infoMessage = 'Define los parámetros y pulsa Guardar para crear la estrategia de gobernanza.';
  }

  submit() {
    const nombreCtrl = this.form.get('nombre');
    const descCtrl = this.form.get('descripcion');
    const nombreVal = (nombreCtrl?.value || '').toString().trim();
    const descVal = (descCtrl?.value || '').toString().trim();
    if (nombreVal && descVal && nombreVal.toUpperCase() === descVal.toUpperCase()) {
      this.error = 'La descripción no puede ser igual al nombre';
      this.notify.warn('Corrige la descripción', 'La descripción no puede ser igual al nombre.');
      return;
    }

    // Guardado independiente de organizaci��n: catálogo global
    this.error = null; this.success = null; this.infoMessage = null;
    if (this.form.invalid) { this.error = 'Formulario inválido'; this.notify.warn('Formulario inválido', 'Revisa los campos requeridos.'); return; }
    const value = this.form.value as GovernanceStrategy; value.nombre = (value.nombre || '').toString().trim().toUpperCase();
    this.saving = true;
    this.orgService.saveOrgGovernanceStrategy(null, value).subscribe({
      next: (res) => {
        this.strategy = res.strategy; this.form.patchValue(res.strategy); this.saving = false;
        this.notify.success('Guardado', res.message);
      },
      error: (e) => {
        const msg = (e?.error?.message ?? e?.message) as string | undefined;
        this.saving = false;
        this.notify.error('No se pudo crear', msg);
      }
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

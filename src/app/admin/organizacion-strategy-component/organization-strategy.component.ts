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
  selector: 'app-organization-strategy',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, CardModule, InputTextModule, TextareaModule, InputSwitchModule, DropdownModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './organization-strategy.component.html',
  styleUrls: ['./organization-strategy.component.scss']
})
export class OrganizationStrategyComponent implements OnInit {
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
    this.orgId = this.route.snapshot.queryParamMap.get('id') || localStorage.getItem('currentOrgId');
    if (!this.orgId) {
      this.error = 'No se proporcionó id de organización';
      return;
    }
    this.loadStrategy();
  }

  /** Carga la estrategia actual evitando peticiones 400 si no hay registros: primero listamos */
  loadStrategy() {
    this.loading = true; this.error = null; this.infoMessage = null;
    this.orgService.listOrgGovernanceStrategies(this.orgId!)
      .subscribe({
        next: (list) => {
          if (!list || list.length === 0) {
            this.strategy = null;
            this.loading = false;
            this.infoMessage = 'Aún no existe una estrategia de gobernanza registrada para esta organización. Configure los parámetros y guarde para crear la primera.';
            return;
          }
          // hay registros: ahora sí pedimos la actual
          this.orgService.getCurrentOrgStrategy(this.orgId!)
            .subscribe({
              next: (st) => {
                this.strategy = st;
                if (st) this.form.patchValue(st);
                this.loading = false;
              },
              error: (e) => {
                // si algo distinto a 400/404 falla, notificamos sin llenar consola
                this.loading = false;
                this.error = e?.error?.message || 'Error al cargar estrategia';
                this.notify.error('Error al cargar', this.error ?? undefined);
              }
            });
        },
        error: (e) => {
          this.loading = false;
          this.error = e?.error?.message || 'Error al cargar estrategias';
          this.notify.error('Error', this.error ?? undefined);
        }
      });
  }

  submit() {
    if (!this.orgId) return; this.error = null; this.success = null; this.infoMessage = null;
    if (this.form.invalid) { this.error = 'Formulario inválido'; this.notify.warn('Formulario inválido', 'Revisa los campos requeridos.'); return; }

    const value = this.form.value as GovernanceStrategy;
    value.nombre = (value.nombre || '').toString().trim().toUpperCase();

    const newRecord = !this.strategy?.id; // capturamos antes de la llamada
    this.saving = true;
    const req$ = newRecord
      ? this.orgService.createOrgGovernanceStrategy(this.orgId, value)
      : this.orgService.updateOrgGovernanceStrategy(this.orgId, this.strategy!.id!, value);

    req$.subscribe({
      next: (dto: GovernanceStrategy) => {
        this.strategy = dto; // ya viene mapeada
        this.form.patchValue(dto);
        this.saving = false;
        // Toast elegante
        this.notify.success('Guardado', newRecord ? 'Estrategia creada correctamente.' : 'Estrategia actualizada.');
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Error al guardar estrategia';
        this.saving = false;
        this.notify.error('No se pudo guardar', this.error ?? undefined);
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

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { AuthService, RegisterPayload, ApiResponse } from '../service/auth.service';
import { UppercaseDirective, LowercaseDirective, DigitsOnlyDirective } from '../shared/formatting.directives';
import { InvitacionesService, InvitationPreviewDto } from '../service/invitaciones.service';

interface TipoDocOption { label: string; value: string }

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, InputTextModule, DropdownModule, ButtonModule, ThemeToggleComponent, UppercaseDirective, LowercaseDirective, DigitsOnlyDirective],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  loading = false;
  errorMsg: string | null = null;
  form!: FormGroup;
  tiposDocumento: TipoDocOption[] = [
    { label: 'Cédula de ciudadanía (CC)', value: 'CC' },
    { label: 'Tarjeta de identidad (TI)', value: 'TI' },
    { label: 'Cédula de extranjería (CE)', value: 'CE' },
    { label: 'Pasaporte (PA)', value: 'PA' }
  ];

  // Invitación
  inviteCode: string | null = null;
  invitePreview: InvitationPreviewDto | null = null;
  sectionDisplayName: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute, private invites: InvitacionesService) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(128)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      documentoIdentidad: ['', Validators.required],
      tipoDocumento: ['CC', Validators.required],
      email: ['', Validators.email],
      telefono: ['']
    });
  }

  ngOnInit() {
    const current = this.form.get('tipoDocumento')?.value;
    if (!current) {
      this.form.get('tipoDocumento')?.setValue('CC');
    }
    // Leer query param ?invite
    this.inviteCode = this.route.snapshot.queryParamMap.get('invite');
    if (this.inviteCode) {
      this.loading = true;
      this.invites.previewPorCodigo(this.inviteCode).subscribe({
        next: (resp) => {
          this.invitePreview = resp?.data || null;
          try { console.log('[REGISTER preview] data:', this.invitePreview); } catch {}
          const inv: any = this.invitePreview || {};
          this.sectionDisplayName = (inv.seccionNombre || (inv.seccion && inv.seccion.nombre) || null);
          this.loading = false;
        },
        error: (e) => {
          this.errorMsg = e?.error?.message || 'Invitación inválida o no encontrada.';
          this.loading = false;
        }
      });
    }
  }

  submit() {
    this.errorMsg = null;
    if (this.form.invalid) { this.errorMsg = 'Revisa los campos obligatorios.'; return; }

    // Si viene por invitación, usar flujo de unión
    if (this.inviteCode) {
      this.loading = true;
      const nombreCompleto = `${this.form.get('nombres')?.value || ''} ${this.form.get('apellidos')?.value || ''}`.trim();
      const payload = {
        username: this.form.get('username')?.value,
        email: this.form.get('email')?.value,
        nombreCompleto: nombreCompleto || null,
        createIfNotExists: true
      } as const;
      this.invites.unirse(this.inviteCode, payload).subscribe({
        next: (_resp) => {
          // Unión exitosa: ir a login
          this.router.navigate(['/login']);
          this.loading = false;
        },
        error: (e: any) => {
          const code = e?.error?.message || e?.message;
          this.errorMsg = code || 'No fue posible aceptar la invitación.';
          this.loading = false;
        }
      });
      return;
    }

    // Registro estándar
    this.loading = true;
    const payload: RegisterPayload = this.form.value as RegisterPayload;
    this.auth.register(payload).subscribe({
      next: (resp: ApiResponse<any>) => {
        if (!resp?.success) {
          this.errorMsg = resp?.message || 'No fue posible registrar el usuario.';
          this.loading = false; return;
        }
        // Registro ok: ir al login
        this.router.navigate(['/login']);
        this.loading = false;
      },
      error: (e: any) => {
        if (e?.status === 0) this.errorMsg = 'No fue posible conectar con el servidor. Verifica el backend en http://localhost:8081/auth/register.';
        else this.errorMsg = e?.error?.message || 'Error al registrar.';
        this.loading = false;
      }
    });
  }
}

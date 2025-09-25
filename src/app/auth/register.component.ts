import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { AuthService, RegisterPayload, ApiResponse } from '../service/auth.service';
import { UppercaseDirective, LowercaseDirective, DigitsOnlyDirective } from '../shared/formatting.directives';

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

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      orgCode: [''],
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
  }

  submit() {
    this.errorMsg = null;
    if (this.form.invalid) { this.errorMsg = 'Revisa los campos obligatorios.'; return; }
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

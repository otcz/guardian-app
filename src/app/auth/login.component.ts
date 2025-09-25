import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../service/auth.service';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';
import { UppercaseDirective } from '../shared/formatting.directives';
import { MenuService } from '../service/menu.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, InputTextModule, ButtonModule, ThemeToggleComponent, UppercaseDirective],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loading = false;
  showPassword = false;
  errorMsg: string | null = null;
  isSysadmin = false;

  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private menu: MenuService) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    this.form.get('username')!.valueChanges.subscribe((val: string) => {
      const u = (val || '').trim().toLowerCase();
      this.isSysadmin = u === 'sysadmin';
    });
  }

  togglePassword() { this.showPassword = !this.showPassword; }

  submit() {
    this.errorMsg = null;
    if (this.form.invalid) { this.errorMsg = 'Completa todos los campos.'; return; }
    this.loading = true;
    const { username, password } = this.form.value as { username: string; password: string };
    const isSys = (username || '').trim().toLowerCase() === 'sysadmin';
    const payload: any = { username, password };
    if (isSys) payload.orgCode = 'SYSTEM';

    this.auth.login(payload).subscribe({
      next: (resp: any) => {
        const token = resp?.data?.token;
        if (!resp?.success || !token) {
          this.errorMsg = 'Credenciales incorrectas.';
          this.loading = false; return;
        }
        // Guardar sesión básica
        localStorage.setItem('token', token);
        if (resp?.data?.refreshToken) localStorage.setItem('refreshToken', resp.data.refreshToken);
        if (resp?.data?.expiresAt) localStorage.setItem('expiresAt', resp.data.expiresAt);
        if (resp?.data?.username) localStorage.setItem('username', resp.data.username);
        if (resp?.data?.orgId != null) localStorage.setItem('orgId', String(resp.data.orgId));
        if (Array.isArray(resp?.data?.roles)) localStorage.setItem('roles', JSON.stringify(resp.data.roles));
        // Guardar opciones de navegación del backend
        this.menu.setFromLogin({ opciones: resp?.data?.opciones, opcionesDetalle: resp?.data?.opcionesDetalle });
        // Navegar al dashboard
        this.router.navigate(['/dashboard']);
        this.loading = false;
      },
      error: (e: any) => {
        if (e?.status === 0) this.errorMsg = 'No fue posible conectar con el servidor. Verifica el backend en http://localhost:8081/auth/login.';
        else if (e?.status === 404) this.errorMsg = 'Endpoint no encontrado (404): http://localhost:8081/auth/login';
        else if (e?.status === 401) this.errorMsg = 'Credenciales incorrectas.';
        else this.errorMsg = e?.error?.message || 'Error de autenticación.';
        this.loading = false;
      }
    });
  }
}

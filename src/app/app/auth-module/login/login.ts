import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../service/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  darkMode = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      correo: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    const body = document.body;
    if (this.darkMode) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMsg = null;
    this.successMsg = null;
    this.authService.login(this.loginForm.value).subscribe({
      next: (resp: any) => {
        this.loading = false;
        // Si el backend envía un mensaje, mostrarlo como success
        if (resp && resp.mensaje) {
          this.successMsg = resp.mensaje;
          setTimeout(() => {
            this.successMsg = null;
            this.router.navigate(['/user/dashboard']);
          }, 1500);
        } else {
          this.router.navigate(['/user/dashboard']);
        }
      },
      error: (err: any) => {
        this.loading = false;
        // Mostrar mensaje del backend si existe
        this.errorMsg = err?.error?.mensaje || err.message || 'Error de autenticación';
      }
    });
  }
}

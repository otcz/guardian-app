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
    this.errorMsg = null;
    this.successMsg = null;
    if (this.loginForm.invalid) {
      this.errorMsg = 'Por favor, completa todos los campos.';
      return;
    }
    this.loading = true;
    const { correo, password } = this.loginForm.value;
    this.authService.login({ correo, password }).subscribe({
      next: (resp) => {
        if (resp.token) {
          localStorage.setItem('token', resp.token);
          localStorage.setItem('usuario', correo);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMsg = 'Credenciales incorrectas.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = 'Error de autenticación.';
        this.loading = false;
      }
    });
  }
}

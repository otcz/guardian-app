import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  usuario: any = {};
  tiempoRestante: number = 0; // en segundos
  intervalId: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.obtenerDatosUsuario();
    this.iniciarCuentaRegresiva();
  }

  obtenerDatosUsuario() {
    // Suponiendo que el token está en localStorage y es JWT
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.usuario = {
        nombre: payload.nombre || payload.name || 'Usuario',
        correo: payload.email || payload.correo || payload.sub || '',
        rol: payload.rol || payload.role || '',
        ultimoAcceso: payload.iat ? new Date(payload.iat * 1000) : null,
        exp: payload.exp ? new Date(payload.exp * 1000) : null
      };
      if (payload.exp) {
        this.tiempoRestante = payload.exp - Math.floor(Date.now() / 1000);
      }
    }
  }

  iniciarCuentaRegresiva() {
    this.intervalId = setInterval(() => {
      if (this.tiempoRestante > 0) {
        this.tiempoRestante--;
        if (this.tiempoRestante === 0) {
          // Redirigir automáticamente al login al expirar la sesión
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1000);
        }
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  get tiempoRestanteFormateado(): string {
    if (this.tiempoRestante <= 0) return 'Sesión expirada';
    const min = Math.floor(this.tiempoRestante / 60);
    const seg = this.tiempoRestante % 60;
    return `${min}m ${seg < 10 ? '0' : ''}${seg}s`;
  }
}

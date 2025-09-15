import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  usuario: string = '';
  correo: string = '';
  usuarioInicial: string = '';

  constructor(private router: Router) {
    this.usuario = localStorage.getItem('usuario') || '';
    this.correo = localStorage.getItem('correo') || '';
    this.usuarioInicial = this.usuario ? this.usuario.charAt(0).toUpperCase() : '';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('correo');
    this.router.navigate(['/login']);
  }
}

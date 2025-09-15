import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  usuario: string = '';
  usuarioInicial: string = '';

  constructor(private router: Router) {
    this.usuario = localStorage.getItem('usuario') || '';
    this.usuarioInicial = this.usuario ? this.usuario.charAt(0).toUpperCase() : '';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}

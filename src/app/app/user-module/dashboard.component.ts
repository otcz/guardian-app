import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard-container">
      <h1>Bienvenido al Dashboard</h1>
      <p>Esta es la página principal del usuario.</p>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      text-align: center;
    }
    h1 {
      color: #0D3B66;
      margin-bottom: 1rem;
    }
  `]
})
export class DashboardComponent {}


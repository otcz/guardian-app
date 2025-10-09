import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-no-autorizado',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './no-autorizado.component.html',
  styleUrls: ['./no-autorizado.component.scss']
})
export class NoAutorizadoComponent {
  constructor(private router: Router) {}
  goHome() { this.router.navigate(['/']); }
}


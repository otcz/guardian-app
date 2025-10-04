import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrganizationStrategyComponent } from '../organizacion-strategy-component/organization-strategy.component';

@Component({
  selector: 'app-strategy-change-page',
  standalone: true,
  imports: [CommonModule, RouterModule, OrganizationStrategyComponent],
  templateUrl: './strategy-change-page.component.html',
  styleUrls: ['./strategy-change-page.component.scss']
})
export class StrategyChangePageComponent { }


import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-strategy-change-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './strategy-change-page.component.html',
  styleUrls: ['./strategy-change-page.component.scss']
})
export class StrategyChangePageComponent { }

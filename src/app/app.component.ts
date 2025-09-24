import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from './service/theme.service';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.css'],
  imports: [RouterModule]
})
export class AppComponent {
  title = 'guardian';
  constructor(private theme: ThemeService) {}
}

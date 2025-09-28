import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from './service/theme.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.css'],
  imports: [RouterModule, ToastModule],
  providers: [MessageService]
})
export class AppComponent {
  title = 'guardian';
  constructor(private theme: ThemeService) {}
}

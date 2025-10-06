import { Component } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-feedback-center',
  standalone: true,
  imports: [ConfirmDialogModule, ToastModule],
  templateUrl: './feedback-center.component.html',
  styleUrls: ['./feedback-center.component.scss']
})
export class FeedbackCenterComponent {}


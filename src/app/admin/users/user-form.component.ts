import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { UsersService, UserMinimal } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { SideNavComponent } from '../../shared/side-nav.component';
import { Subject, Subscription, debounceTime, switchMap } from 'rxjs';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, InputTextModule, ButtonModule, TooltipModule, SideNavComponent],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  isEdit = signal(false);
  id: number | null = null;
  newPassword = '';

  private usernameCheck$ = new Subject<string>();
  private sub?: Subscription;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private api: UsersService, private notify: NotificationService) {
    this.form = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: [''],
      documento: [''],
      username: ['', Validators.required],
      email: ['', Validators.email],
      password: ['', []]
    });
  }

  get usernameDuplicate(): boolean { return !!this.form.get('username')?.hasError('duplicate'); }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit.set(true);
      this.id = Number(idParam);
      this.api.getById(this.id).subscribe({ next: (u: UserMinimal) => this.fill(u), error: () => {} });
    } else {
      this.isEdit.set(false);
    }

    if (!this.isEdit()) {
      this.form.get('password')?.addValidators([Validators.required, Validators.minLength(8)]);
    }

    this.sub = this.usernameCheck$.pipe(
      debounceTime(400),
      switchMap((u) => this.api.list({ q: u, page: 0, size: 1 }))
    ).subscribe({
      next: (p) => {
        const exists = (p.items || []).some(x => (x.username || '').toLowerCase() === (this.form.get('username')?.value || '').toLowerCase() && (!this.isEdit() || x.id !== this.id));
        if (exists) this.form.get('username')?.setErrors({ duplicate: true });
      },
      error: () => {}
    });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  fill(u: UserMinimal) {
    this.form.patchValue({
      nombres: u.nombres,
      apellidos: u.apellidos || '',
      documento: u.documento || '',
      username: u.username,
      email: u.email || ''
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
  }

  checkUsername() { const u = (this.form.get('username')?.value || '').trim(); if (u) this.usernameCheck$.next(u); }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value as any;
    const orgId = Number(localStorage.getItem('orgId') ?? '0');
    if (this.isEdit() && this.id != null) {
      const dto: any = { nombres: v.nombres, apellidos: v.apellidos, documento: v.documento, username: v.username, email: v.email };
      this.api.update(this.id, dto).subscribe({
        next: () => { this.notify.success('Cambios guardados.'); this.router.navigate(['/admin/users']); },
        error: (e) => this.notify.fromApiError(e, 'No se pudo guardar.')
      });
    } else {
      const dto: any = { orgId, nombres: v.nombres, apellidos: v.apellidos, documento: v.documento, username: v.username, email: v.email, password: v.password };
      this.api.create(dto).subscribe({
        next: () => { this.notify.success('Usuario creado correctamente.'); this.router.navigate(['/admin/users']); },
        error: (e) => this.notify.fromApiError(e, 'No se pudo crear el usuario.')
      });
    }
  }

  changePassword() {
    if (!this.isEdit() || !this.id) return;
    const pwd = this.newPassword;
    if (!pwd || pwd.length < 8) return;
    this.api.update(this.id, { password: pwd }).subscribe({
      next: () => { this.notify.success('Contraseña actualizada.'); this.newPassword=''; },
      error: (e) => this.notify.fromApiError(e, 'No se pudo actualizar la contraseña.')
    });
  }

  back() { this.router.navigate(['/admin/users']); }
}

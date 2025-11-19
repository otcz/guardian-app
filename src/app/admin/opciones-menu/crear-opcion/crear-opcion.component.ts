import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { NotificationService } from '../../../service/notification.service';

@Component({
  selector: 'app-crear-opcion',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CardModule, ButtonModule, DropdownModule, InputTextModule],
  templateUrl: './crear-opcion.component.html',
  styleUrls: ['./crear-opcion.component.scss']
})
export class CrearOpcionComponent implements OnInit {
  tipos = [ { label: 'MENÚ', value: 'MENU' }, { label: 'ITEM', value: 'ITEM' } ];
  saving = false;
  submitted = false;
  form: any = { nombre: '', tipo: 'ITEM', icono: '', ruta: '', padreNombre: '' };

  constructor(private notify: NotificationService) {}

  ngOnInit(): void { console.log('[UI] CrearOpcionComponent cargado'); }

  reset() {
    this.form = { nombre: '', tipo: 'ITEM', icono: '', ruta: '', padreNombre: '' };
    this.submitted = false;
  }

  save() {
    this.submitted = true;

    // Validar campos requeridos
    if (!this.form.nombre || !this.form.tipo) {
      this.notify.warn('Validación', 'Por favor completa los campos obligatorios');
      return;
    }

    if (this.form.tipo === 'ITEM' && !this.form.ruta) {
      this.notify.warn('Validación', 'La ruta es obligatoria para los items de menú');
      return;
    }

    this.saving = true;
    setTimeout(() => {
      this.saving = false;
      this.notify.success('¡Éxito!', 'Opción creada correctamente');
      this.reset();
    }, 500);
  }
}

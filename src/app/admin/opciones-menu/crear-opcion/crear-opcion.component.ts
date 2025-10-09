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
  form: any = { nombre: '', tipo: 'ITEM', icono: '', ruta: '', padreNombre: '' };

  constructor(private notify: NotificationService) {}

  ngOnInit(): void { console.log('[UI] CrearOpcionComponent cargado'); }

  reset() { this.form = { nombre: '', tipo: 'ITEM', icono: '', ruta: '', padreNombre: '' }; }

  save() {
    this.saving = true;
    setTimeout(() => {
      this.saving = false;
      this.notify.success('Guardado', 'Opción creada (simulado)');
      this.reset();
    }, 500);
  }
}

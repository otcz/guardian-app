import { Component, OnInit } from '@angular/core';
import { VehiculosService } from '../../../service/vehiculos-service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-listar-vehiculos',
  templateUrl: './ver-vehiculos.component.html',
  styleUrls: ['./ver-vehiculos.component.css'],
  providers: [MessageService]
})
export class VerVehiculosComponent implements OnInit {
  vehiculos: any[] = [];
  vehiculosFiltrados: any[] = [];
  displayConfirm = false;
  selectedVehiculo: any = null;
  filtro: string = '';

  constructor(
    private vehiculosService: VehiculosService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.cargarVehiculos();
  }

  cargarVehiculos() {
    this.vehiculosService.getVehiculos().subscribe({
      next: (data) => {
        this.vehiculos = data;
        this.vehiculosFiltrados = [...data];
      },
      error: () => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los vehículos.'});
      }
    });
  }

  onGlobalFilterInput(event: Event, dt: any) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      dt.filterGlobal(value, 'contains');
    } else {
      dt.filterGlobal('', 'contains');
    }
  }

  crearVehiculo() {
    this.router.navigate(['/dashboard/vehiculos/crear']);
  }

  editarVehiculo(v: any) {
    this.router.navigate(['/dashboard/vehiculos/editar', v.id]);
  }

  confirmarEliminarVehiculo(v: any) {
    this.selectedVehiculo = v;
    this.displayConfirm = true;
  }

  onConfirmYes() {
    if (!this.selectedVehiculo) return;
    this.vehiculosService.eliminarVehiculo(this.selectedVehiculo.id).subscribe({
      next: () => {
        this.vehiculos = this.vehiculos.filter(x => x.id !== this.selectedVehiculo.id);
        this.vehiculosFiltrados = this.vehiculosFiltrados.filter(x => x.id !== this.selectedVehiculo.id);
        this.messageService.add({severity: 'success', summary: 'Eliminado', detail: 'Vehículo eliminado correctamente.'});
        this.displayConfirm = false;
        this.selectedVehiculo = null;
      },
      error: () => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el vehículo.'});
        this.displayConfirm = false;
        this.selectedVehiculo = null;
      }
    });
  }

  onConfirmNo() {
    this.displayConfirm = false;
    this.selectedVehiculo = null;
    this.messageService.add({severity: 'info', summary: 'Cancelado', detail: 'La eliminación fue cancelada.'});
  }

  onCancel() {
    this.displayConfirm = false;
    this.selectedVehiculo = null;
    this.messageService.add({severity: 'warn', summary: 'Cerrado', detail: 'Operación cancelada.'});
  }
}

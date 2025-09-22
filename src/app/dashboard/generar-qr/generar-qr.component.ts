import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { QrService } from '../../service/qr-service';
import { VehiculosService } from '../../service/vehiculos-service';

@Component({
  selector: 'app-generar-qr',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, ProgressSpinnerModule, InputTextModule, TooltipModule],
  templateUrl: './generar-qr.component.html',
  styleUrls: ['./generar-qr.component.css']
})
export class GenerarQrComponent implements OnInit {
  cargando = false;
  mensaje = '';
  usuario = '';
  vehiculo = '';
  qrBase64 = '';
  placa: string = '';
  vehiculos: any[] = [];

  constructor(private qrService: QrService, private vehiculosService: VehiculosService) {}

  ngOnInit() {
    this.vehiculosService.getMisVehiculos().subscribe({
      next: (data) => {
        this.vehiculos = data || [];
        if (this.vehiculos.length > 0) {
          this.placa = this.vehiculos[0].placa;
        }
      },
      error: () => {
        this.vehiculos = [];
      }
    });
  }

  generarQR() {
    this.cargando = true;
    this.mensaje = '';
    this.qrBase64 = '';
    this.usuario = '';
    this.vehiculo = '';
    const placaSeleccionada = this.placa || undefined;
    this.qrService.generarQr(placaSeleccionada).subscribe({
      next: (resp) => {
        // Si el usuario está INACTIVO, mostrar mensaje de error y no mostrar el QR
        if (resp.usuario && resp.usuario.toUpperCase() === 'INACTIVO') {
          this.usuario = 'INACTIVO';
          this.mensaje = 'No se puede generar el QR porque el usuario está INACTIVO.';
          this.qrBase64 = '';
          this.vehiculo = '';
        } else {
          this.mensaje = resp.mensaje || '';
          this.usuario = resp.usuario;
          this.vehiculo = resp.vehiculo;
          this.qrBase64 = resp.qrBase64;
        }
        this.cargando = false;
      },
      error: (err) => {
        // Si el backend responde con usuario INACTIVO como error, mostrar mensaje personalizado
        const usuarioInactivo = err.error?.usuario && typeof err.error.usuario === 'string' && err.error.usuario.toUpperCase() === 'INACTIVO';
        const mensajeInactivo = err.error?.mensaje && typeof err.error.mensaje === 'string' && err.error.mensaje.toUpperCase().includes('INACTIVO');
        if (usuarioInactivo || mensajeInactivo) {
          this.usuario = 'INACTIVO';
          this.mensaje = 'No se puede generar el QR porque el usuario está INACTIVO.';
          this.qrBase64 = '';
          this.vehiculo = '';
        } else {
          // Si el backend no envía mensaje, mostrar mensaje genérico más claro
          this.mensaje = err.error?.mensaje || 'No se puede generar el QR porque el usuario está INACTIVO.';
        }
        this.cargando = false;
      }
    });
  }
}

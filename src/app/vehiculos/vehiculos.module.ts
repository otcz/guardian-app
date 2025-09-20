import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehiculosRoutingModule } from './vehiculos-routing.module';
import { ListarVehiculosComponent } from './listar-vehiculos/listar-vehiculos.component';
import { CrearVehiculoComponent } from './crear-vehiculo/crear-vehiculo.component';
import { EditarVehiculoComponent } from './editar-vehiculo/editar-vehiculo.component';
import { EliminarVehiculoComponent } from './eliminar-vehiculo/eliminar-vehiculo.component';

@NgModule({
  declarations: [
    ListarVehiculosComponent,
    CrearVehiculoComponent,
    EditarVehiculoComponent,
    EliminarVehiculoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    VehiculosRoutingModule
  ]
})
export class VehiculosModule { }

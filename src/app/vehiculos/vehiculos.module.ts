import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehiculosRoutingModule } from './vehiculos-routing.module';
import { ListarVehiculosComponent } from './listar-vehiculos/listar-vehiculos.component';
import { CrearVehiculoComponent } from './crear-vehiculo/crear-vehiculo.component';
import { EditarVehiculoComponent } from './editar-vehiculo/editar-vehiculo.component';
import { EliminarVehiculoComponent } from './eliminar-vehiculo/eliminar-vehiculo.component';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { AutoCompleteModule } from 'primeng/autocomplete';

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
    VehiculosRoutingModule,
    DropdownModule,
    MultiSelectModule,
    AutoCompleteModule
  ]
})
export class VehiculosModule { }

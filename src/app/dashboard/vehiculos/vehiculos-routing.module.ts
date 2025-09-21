import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VerVehiculosComponent } from './ver-vehiculos/ver-vehiculos.component';
import { CrearVehiculoComponent } from './crear-vehiculo/crear-vehiculo.component';
import { EditarVehiculoComponent } from './editar-vehiculo/editar-vehiculo.component';
import { EliminarVehiculoComponent } from './eliminar-vehiculo/eliminar-vehiculo.component';

const routes: Routes = [
  { path: '', redirectTo: 'listar', pathMatch: 'full' },
  { path: 'listar', component: VerVehiculosComponent },
  { path: 'crear', component: CrearVehiculoComponent },
  { path: 'editar/:id', component: EditarVehiculoComponent },
  { path: 'editar', component: EditarVehiculoComponent },
  { path: 'eliminar', component: EliminarVehiculoComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VehiculosRoutingModule { }

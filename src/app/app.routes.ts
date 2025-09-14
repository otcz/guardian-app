import { Routes } from '@angular/router';
import { Login } from './app/auth-module/login/login';


export const routes: Routes = [
  {
    path: '',
    component: Login
  },
  // Puedes agregar otras rutas aquí, como el dashboard
];

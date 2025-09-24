import 'tslib';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app/app-routing.module';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/service/auth.interceptor';
import { providePrimeNG } from 'primeng/config';
import Nora from '@primeng/themes/nora';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimations(),
    providePrimeNG({ theme: { preset: Nora } })
  ]
})
  .catch(err => console.error(err));

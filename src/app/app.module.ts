import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [], // AppComponent eliminado porque es standalone
  imports: [BrowserModule, AppRoutingModule],
  bootstrap: [] // AppComponent eliminado
})
export class AppModule {}

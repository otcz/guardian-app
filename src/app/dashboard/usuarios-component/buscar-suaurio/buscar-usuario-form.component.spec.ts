import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuscarUsuarioFormComponent } from './buscar-usuario-form.component';

describe('BuscarUsuarioFormComponent', () => {
  let component: BuscarUsuarioFormComponent;
  let fixture: ComponentFixture<BuscarUsuarioFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuscarUsuarioFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuscarUsuarioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

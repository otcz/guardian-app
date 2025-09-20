import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarUsuarioFormComponent } from './editar-usuario-form.component';

describe('BuscarUsuarioFormComponent', () => {
  let component: EditarUsuarioFormComponent;
  let fixture: ComponentFixture<EditarUsuarioFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarUsuarioFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarUsuarioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

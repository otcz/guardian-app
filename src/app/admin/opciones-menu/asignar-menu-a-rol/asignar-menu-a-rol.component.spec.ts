import { TestBed } from '@angular/core/testing';
import { AsignarMenuARolComponent } from './asignar-menu-a-rol.component';
import { of } from 'rxjs';
import { RolesService } from '../../../service/roles.service';
import { OpcionesService } from '../../../service/opciones.service';
import { NotificationService } from '../../../service/notification.service';
import { OrgContextService } from '../../../service/org-context.service';
import { AuthService } from '../../../service/auth.service';
import { RolesGlobalStore } from '../../../service/roles-global.store';

class RolesServiceMock {}
class RolesGlobalStoreMock {
  private roles = [{ id: 'r1', nombre: 'ADMIN', orgId: 'o1', orgNombre: 'ORG1' } as any];
  loadOnce = jasmine.createSpy().and.returnValue(of(this.roles));
  filterLocal = jasmine.createSpy().and.callFake((_q: string) => of(this.roles));
}
class OpcionesServiceMock {
  ensureOrgOptions = jasmine.createSpy().and.returnValue(of([
    { id: 'opt1', nombre: 'Gestión', codigo: 'MENU_GESTION' },
    { id: 'opt2', nombre: 'Asignar', codigo: 'ITEM_ASIGNAR' }
  ]));
  listRoleOptions = jasmine.createSpy().and.returnValue(of([{ id: 'opt2', nombre: 'Asignar', codigo: 'ITEM_ASIGNAR' }]));
  assignOptionToRole = jasmine.createSpy().and.returnValue(of(void 0));
  unassignOptionFromRole = jasmine.createSpy().and.returnValue(of(void 0));
}
class NotificationServiceMock {
  show() {}
  success() {}
  info() {}
  warn() {}
  error() {}
}
class OrgContextServiceMock { get value() { return 'oX'; } }
class AuthServiceMock { hasRole = () => true; }

describe('AsignarMenuARolComponent (SYSADMIN)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsignarMenuARolComponent],
      providers: [
        { provide: RolesService, useClass: RolesServiceMock },
        { provide: RolesGlobalStore, useClass: RolesGlobalStoreMock },
        { provide: OpcionesService, useClass: OpcionesServiceMock },
        { provide: NotificationService, useClass: NotificationServiceMock },
        { provide: OrgContextService, useClass: OrgContextServiceMock },
        { provide: AuthService, useClass: AuthServiceMock }
      ]
    }).compileComponents();
  });

  it('carga roles globales, usa orgId del rol y aplica asignar/desasignar', async () => {
    const fixture = TestBed.createComponent(AsignarMenuARolComponent);
    const comp = fixture.componentInstance;
    const opciones = TestBed.inject(OpcionesService) as unknown as OpcionesServiceMock;

    // Init en modo SYSADMIN -> carga global
    comp.ngOnInit();
    fixture.detectChanges();

    // Seleccionar el único rol
    comp.rolId = 'r1';
    await comp.onRolChange();

    // Estado inicial: sólo 'opt2' asignada y seleccionada
    expect(comp.totalAssigned).toBe(1);
    expect(comp.selectedIds.has('opt2')).toBeTrue();

    // Seleccionar todas las filtradas -> agregará 'opt1'
    comp.filteredOptions = comp.allOptions.slice();
    comp.onToggleSelectAllFiltered(true);

    await comp.save();
    expect(opciones.assignOptionToRole).toHaveBeenCalledWith('o1', 'r1', 'opt1');

    // Ahora deseleccionar 'opt2' y guardar -> debe desasignar
    comp.toggleOne('opt2', false);
    await comp.save();
    expect(opciones.unassignOptionFromRole).toHaveBeenCalledWith('o1', 'r1', 'opt2');
  });
});

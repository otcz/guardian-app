import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RolesService } from './roles.service';

describe('RolesService.listGlobalPaged', () => {
  let svc: RolesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    svc = TestBed.inject(RolesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debe mapear ApiResponse con { total, items }', (done) => {
    svc.listGlobalPaged({ q: 'adm', page: 1, size: 10 }).subscribe(({ total, items }) => {
      expect(total).toBe(2);
      expect(items.length).toBe(2);
      expect(items[0].id).toBe('1');
      expect(items[0].nombre).toBe('ADMIN');
      expect(items[0].orgId).toBe('ORG1');
      expect(items[0].orgNombre).toBe('Org 1');
      done();
    });
    const req = http.expectOne(r => r.method === 'GET' && r.url === '/api/roles');
    expect(req.request.params.get('q')).toBe('adm');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ success: true, data: { total: 2, items: [ { id: 1, nombre: 'ADMIN', organizationId: 'ORG1', organizationName: 'Org 1' }, { id: 2, name: 'GUARDIA', orgId: 'ORG2', orgNombre: 'Org 2' } ] } });
  });

  it('debe mapear respuesta directa { total, items }', (done) => {
    svc.listGlobalPaged({}).subscribe(({ total, items }) => {
      expect(total).toBe(1);
      expect(items[0].nombre).toBe('SYSADMIN');
      done();
    });
    const req = http.expectOne(r => r.method === 'GET' && r.url === '/api/roles' && r.params.get('page') === '0' && r.params.get('size') === '20');
    req.flush({ total: 1, items: [ { id: 'sa', nombre: 'SYSADMIN' } ] });
  });

  it('debe aceptar array directo sin paginar', (done) => {
    svc.listGlobalPaged({}).subscribe(({ total, items }) => {
      expect(total).toBe(1);
      expect(items[0].nombre).toBe('ORGADMIN');
      done();
    });
    const req = http.expectOne(r => r.method === 'GET' && r.url === '/api/roles' && r.params.get('page') === '0' && r.params.get('size') === '20');
    req.flush([ { id: '3', nombre: 'ORGADMIN' } ]);
  });
});

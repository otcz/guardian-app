import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionEntity, SeccionService } from '../../service/seccion.service';
import { NotificationService } from '../../service/notification.service';
import { VehiculosService, VehicleEntity } from '../../service/vehiculos.service';
import { MultiSelectModule } from 'primeng/multiselect';
import { UsersService, UserEntity } from '../../service/users.service';
import { AuthService } from '../../service/auth.service';
import { TabViewModule } from 'primeng/tabview';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-vehiculos-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective, MultiSelectModule, TabViewModule, MessageModule],
  templateUrl: './vehiculos-crear.component.html',
  styleUrls: ['./vehiculos-crear.component.scss']
})
export class VehiculosCrearComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;

  secciones: SeccionEntity[] = [];
  usuarios: UserEntity[] = [];
  isAdmin = false;
  model: { placa: string; marca?: string | null; modelo?: string | null; linea?: string | null; anio?: number | null; color?: string | null; usuarioIds?: string[]; seccionId?: string | null } = { placa: '', marca: null, modelo: null, linea: null, anio: null, color: null, usuarioIds: [], seccionId: null };

  // Usuario actual
  currentUsername: string | null = null;
  currentUserId: string | null = null;

  // Nuevo: búsqueda por placa y asociación a existente
  buscando = false;
  existente: { status: 'idle' | 'found' | 'notfound' | 'error'; vehiculo?: VehicleEntity | null; message?: string | null } = { status: 'idle', vehiculo: null };
  usuariosParaExistente: string[] = [];
  asignando = false;

  constructor(
    private orgCtx: OrgContextService,
    private seccionService: SeccionService,
    private vehiculos: VehiculosService,
    private notify: NotificationService,
    private router: Router,
    private users: UsersService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    this.currentUsername = this.readUsername();
    // Determinar si el usuario posee rol de admin (tolerante a variantes de nombre)
    this.isAdmin = this.auth.hasAnyRole('SYSADMIN', 'ORGADMIN', 'ORG_ADMIN', 'ADMIN_ORG', 'ADMIN');

    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }

    // ���� MEJORADO: Intentar obtener userId ANTES de cargar secciones
    this.currentUserId = this.obtenerUserIdActual();
    console.log('[VehiculosCrear] 👤 Usuario actual:', this.currentUserId);

    // ✅ CRÍTICO: Obtener sección desde loginSeccionImmutable (NO llamar al backend todavía)
    let seccionDelUsuario: string | null = null;

    // ✅ Fuente 0 (PRIORIDAD ABSOLUTA): loginSeccionImmutable (sección inmutable del login)
    try {
      const seccionImmutable = localStorage.getItem('loginSeccionImmutable');
      if (seccionImmutable) {
        seccionDelUsuario = seccionImmutable;
        this.model.seccionId = seccionImmutable;
        console.log('[VehiculosCrear] ✅ Sección desde loginSeccionImmutable:', seccionImmutable);
        console.log('[VehiculosCrear] 🔄 Cargando nombre de sección desde backend...');

        // ✅ CRÍTICO: Cargar secciones desde backend para obtener el nombre real
        // pero solo mostrar la sección inmutable del usuario
        this.loading = true;
        this.seccionService.list(this.orgId).subscribe({
          next: (list) => {
            // Filtrar solo la sección del usuario
            const seccionUsuario = list.find(s => s.id === seccionImmutable);

            if (seccionUsuario) {
              this.secciones = [seccionUsuario];
              console.log('[VehiculosCrear] ✅ Sección encontrada:', seccionUsuario.nombre);
            } else {
              // Si no se encuentra (caso excepcional), usar nombre genérico
              this.secciones = [{
                id: seccionImmutable,
                nombre: 'Mi Sección',
                organizacionId: this.orgId,
                activo: true
              } as SeccionEntity];
              console.warn('[VehiculosCrear] ⚠️ Sección no encontrada en lista, usando nombre genérico');
            }

            this.loading = false;

            // ✅ CRÍTICO: Solo cargar usuarios si ES ADMIN
            // Los usuarios regulares ya tienen su userId auto-seleccionado
            if (this.isAdmin && this.model.seccionId) {
              this.loadUsuarios();
              console.log('[VehiculosCrear] 📋 Cargando usuarios para sección:', this.model.seccionId);
            } else if (!this.isAdmin) {
              console.log('[VehiculosCrear] ⏭️ Usuario regular: saltando carga de usuarios (ya auto-seleccionado)');
            }
          },
          error: (e) => {
            this.loading = false;
            console.error('[VehiculosCrear] ❌ Error al cargar nombre de sección:', e);
            // Usar nombre genérico en caso de error
            this.secciones = [{
              id: seccionImmutable,
              nombre: 'Mi Sección',
              organizacionId: this.orgId,
              activo: true
            } as SeccionEntity];

            // Continuar con la carga de usuarios si es admin
            if (this.isAdmin && this.model.seccionId) {
              this.loadUsuarios();
            }
          }
        });

        // ✅ CRÍTICO: Si NO es admin, auto-seleccionar usuario actual SIN cargar lista
        if (!this.isAdmin && this.currentUserId) {
          this.model.usuarioIds = [this.currentUserId];
          console.log('[VehiculosCrear] ✅ Usuario regular auto-seleccionado:', this.currentUserId);
        }

        // Salir del ngOnInit después de configurar el flujo de sección inmutable
        return;
      }
    } catch {}

    // Fuente 1: OrgContext (scope SECCION) - SOLO si no hay loginSeccionImmutable
    if (!seccionDelUsuario) {
      const scope = String(this.orgCtx.scope || '').toUpperCase();
      if (scope === 'SECCION' && this.orgCtx.seccion) {
        seccionDelUsuario = this.orgCtx.seccion;
      }
    }

    // Fuente 2: localStorage directo (seccionPrincipalId) - SOLO si no hay loginSeccionImmutable
    if (!seccionDelUsuario) {
      try {
        const seccionLS = localStorage.getItem('seccionPrincipalId');
        if (seccionLS) seccionDelUsuario = seccionLS;
      } catch {}
    }

    // Fuente 3: localStorage (seccionId) - SOLO si no hay loginSeccionImmutable
    if (!seccionDelUsuario) {
      try {
        const seccionLS = localStorage.getItem('seccionId');
        if (seccionLS) seccionDelUsuario = seccionLS;
      } catch {}
    }

    // Asignar sección encontrada si no se asignó desde loginSeccionImmutable
    if (seccionDelUsuario && !this.model.seccionId) {
      this.model.seccionId = seccionDelUsuario;
      console.log('[VehiculosCrear] ✅ Sección auto-seleccionada:', seccionDelUsuario);
    }

    // ✅ CRÍTICO: Si NO es admin, auto-seleccionar usuario actual SIN cargar lista
    if (!this.isAdmin && this.currentUserId) {
      this.model.usuarioIds = [this.currentUserId];
      console.log('[VehiculosCrear] ✅ Usuario regular auto-seleccionado:', this.currentUserId);
    }

    // ✅ CRÍTICO: SOLO cargar secciones desde backend si:
    // 1. NO hay loginSeccionImmutable (es SYSADMIN o ORGADMIN global)
    // 2. ES ADMIN de nivel superior
    const haySeccionInmutable = !!localStorage.getItem('loginSeccionImmutable');

    if (!haySeccionInmutable && this.isAdmin) {
      console.log('[VehiculosCrear] 📋 Cargando secciones desde backend (usuario sin sección inmutable)');
      this.loadSecciones();
    } else {
      console.log('[VehiculosCrear] ⏭️ NO se cargan secciones desde backend');
      console.log('[VehiculosCrear] ✅ Usando sección de localStorage:', this.model.seccionId);

      // ✅ CRÍTICO: Cargar usuarios de la sección SOLO si es admin
      // Usuario regular ya está auto-seleccionado arriba
      if (this.isAdmin && this.model.seccionId) {
        console.log('[VehiculosCrear] 📋 Cargando usuarios para sección:', this.model.seccionId);
        this.loadUsuarios();
      } else if (!this.isAdmin) {
        console.log('[VehiculosCrear] ⏭️ Usuario regular: NO se cargan usuarios (ya auto-seleccionado)');
      }
    }
  }

  /**
   * ✅ NUEVO: Obtener userId del usuario actual desde localStorage
   */
  private obtenerUserIdActual(): string | null {
    try {
      // Intentar desde diferentes fuentes
      const userId = localStorage.getItem('userId')
        || localStorage.getItem('currentUserId')
        || localStorage.getItem('loginUserId');

      if (userId) {
        console.log('[VehiculosCrear] ✅ userId encontrado en localStorage:', userId);
        return userId;
      }
    } catch {}

    console.warn('[VehiculosCrear] ⚠️ No se pudo obtener userId del localStorage');
    return null;
  }

  private readUsername(): string | null {
    try { const u = localStorage.getItem('username'); return u ? String(u) : null; } catch { return null; }
  }

  /**
   * ✅ Cargar secciones disponibles según el rol del usuario
   *
   * Reglas de visualización:
   * - SYSADMIN/ORGADMIN: Todas las secciones de la organización
   * - ADMIN (Sección): Solo las secciones que administra
   * - USUARIO: Solo su sección (si la tiene)
   */
  loadSecciones() {
    if (!this.orgId) return;
    this.loading = true;

    const scope = String(this.orgCtx.scope || '').toUpperCase();
    const userRole = this.auth.hasRole('SYSADMIN') ? 'SYSADMIN'
      : this.auth.hasRole('ORGADMIN') ? 'ORGADMIN'
      : this.auth.hasRole('ADMIN') ? 'ADMIN'
      : 'USUARIO';

    // ✅ Guardar la sección pre-seleccionada ANTES de filtrar
    const seccionPreSeleccionada = this.model.seccionId;

    this.seccionService.list(this.orgId).subscribe({
      next: (list) => {
        // ✅ Filtrar secciones según el rol
        if (userRole === 'SYSADMIN' || userRole === 'ORGADMIN') {
          // Ver todas las secciones de la organización
          this.secciones = list;
          console.log('[VehiculosCrear] 📋 ORGADMIN: Cargadas', list.length, 'secciones de la organización');
        } else if (userRole === 'ADMIN' && scope === 'SECCION') {
          // Ver solo la sección que administra
          const seccionId = this.orgCtx.seccion;
          this.secciones = list.filter(s => s.id === seccionId);
        } else if (userRole === 'USUARIO' && scope === 'SECCION') {
          // Usuario regular: solo su sección
          const seccionId = this.orgCtx.seccion;
          this.secciones = list.filter(s => s.id === seccionId);
        } else {
          this.secciones = list;
        }

        // ✅ MANTENER la sección pre-seleccionada si existe en la lista filtrada
        if (seccionPreSeleccionada) {
          const existeEnLista = this.secciones.some(s => s.id === seccionPreSeleccionada);
          if (existeEnLista) {
            this.model.seccionId = seccionPreSeleccionada;
            console.log('[VehiculosCrear] ��� Sección mantenida después de filtrar:', seccionPreSeleccionada);
          } else {
            console.warn('[VehiculosCrear] ⚠️ Sección pre-seleccionada no está en lista filtrada');
            // Si solo hay 1 sección en la lista, auto-seleccionarla
            if (this.secciones.length === 1) {
              this.model.seccionId = this.secciones[0].id;
              console.log('[VehiculosCrear] ✅ Auto-seleccionada única sección disponible:', this.secciones[0].id);
            }
          }
        } else if (this.secciones.length === 1) {
          // Si no había sección pre-seleccionada pero solo hay 1 disponible, auto-seleccionarla
          this.model.seccionId = this.secciones[0].id;
          console.log('[VehiculosCrear] ✅ Auto-seleccionada única sección disponible:', this.secciones[0].id);
        }

        this.loading = false;

        // ✅ MEJORADO: Cargar usuarios automáticamente si hay una sección seleccionada
        // Esto cubre el caso cuando es ORGADMIN y se auto-selecciona o mantiene una sección
        if (this.isAdmin && this.model.seccionId) {
          console.log('[VehiculosCrear] 📋 Cargando usuarios para sección:', this.model.seccionId);
          this.loadUsuarios();
        } else if (this.isAdmin && !this.model.seccionId) {
          console.log('[VehiculosCrear] ⚠️ Admin sin sección seleccionada, esperando selección manual');
        } else if (!this.isAdmin) {
          console.log('[VehiculosCrear] ⏭️ Usuario regular: saltando carga de usuarios (ya auto-seleccionado)');
        }
      },
      error: (e) => {
        this.loading = false;
        this.notify.error('Error', e?.error?.message || 'No se pudieron cargar secciones');
      }
    });
  }

  /**
   * ✅ Cargar usuarios de la sección seleccionada
   * Solo muestra usuarios de la misma sección que el vehículo
   */
  private loadUsuarios() {
    if (!this.orgId) return;

    // ✅ Si ya hay una sección seleccionada, filtrar por ella
    const seccionIdSeleccionada = this.model.seccionId;
    const params: any = {};
    if (seccionIdSeleccionada) {
      params.seccionId = seccionIdSeleccionada;
    }

    console.log('[VehiculosCrear] 🔄 Solicitando usuarios, seccionId:', seccionIdSeleccionada);

    this.users.list(this.orgId, params).subscribe({
      next: (arr) => {
        console.log('[VehiculosCrear] 📦 Usuarios recibidos del backend:', arr.length);

        // ✅ CRÍTICO: Filtrar usuarios en el frontend por seccionId
        // El backend puede ignorar el parámetro si eres ORGADMIN, así que filtramos aquí
        if (seccionIdSeleccionada && arr.length > 0) {
          const usuariosFiltrados = arr.filter(u => {
            const userSeccionId = (u as any).seccionId || (u as any).seccionPrincipalId;
            const perteneceASeccion = userSeccionId === seccionIdSeleccionada;
            if (!perteneceASeccion) {
              console.log('[VehiculosCrear] 🚫 Usuario filtrado:', u.username, 'seccionId:', userSeccionId, '!==', seccionIdSeleccionada);
            }
            return perteneceASeccion;
          });

          this.usuarios = usuariosFiltrados;
          console.log('[VehiculosCrear] ✅ Usuarios filtrados por sección:', usuariosFiltrados.length, 'de', arr.length);
        } else {
          this.usuarios = arr;
          console.log('[VehiculosCrear] ℹ️ Sin filtrado de sección (mostrando todos)');
        }

        // Intentar resolver currentUserId por username
        if (!this.currentUserId && this.currentUsername) {
          const me = this.usuarios.find(u => (u.username || '').toLowerCase() === this.currentUsername!.toLowerCase());
          if (me) this.currentUserId = me.id;
        }
      },
      error: (e) => {
        // ✅ Si es error 403 (sin permisos), manejarlo completamente en silencio
        // El usuario puede no tener permisos para listar usuarios pero sí para crear vehículos
        if (e?.status === 403) {
          // Solo log en modo debug, sin console.warn
          if (localStorage.getItem('debugMode') === 'true') {
            console.log('[VehiculosCrear] Usuario sin permisos para listar usuarios de la sección (esperado para usuarios regulares)');
          }
          this.usuarios = [];
          // Si no es admin, intentar auto-seleccionarse usando datos del localStorage
          if (!this.isAdmin) {
            this.autoSelectCurrentUser();
          }
        } else {
          // Solo mostrar notificación para otros errores (no 403)
          console.error('[VehiculosCrear] Error al cargar usuarios:', e);
          this.notify.warn('Usuarios', e?.error?.message || 'No se pudieron cargar usuarios');
        }
      }
    });
  }

  /**
   * ��� Intenta auto-seleccionar al usuario actual cuando no hay permisos para listar usuarios
   */
  private autoSelectCurrentUser() {
    // Intentar obtener el ID del usuario actual desde diferentes fuentes
    if (this.currentUserId) {
      this.model.usuarioIds = [this.currentUserId];
      console.log('[VehiculosCrear] ✅ Auto-seleccionado usuario actual:', this.currentUserId);
      return;
    }

    // Intentar desde localStorage
    try {
      const userId = localStorage.getItem('userId') || localStorage.getItem('currentUserId');
      if (userId) {
        this.currentUserId = userId;
        this.model.usuarioIds = [userId];
        console.log('[VehiculosCrear] ✅ Auto-seleccionado usuario desde localStorage:', userId);
        return;
      }
    } catch {}

    // ✅ FALLBACK: Intentar buscar al usuario por username directamente con el backend
    // Esto funciona incluso cuando el usuario no tiene permisos para listar todos los usuarios
    if (this.currentUsername && this.orgId) {
      console.log('[VehiculosCrear] 🔄 Intentando buscar usuario por username:', this.currentUsername);

      // Hacer una petición al backend para buscar el usuario actual
      this.users.list(this.orgId, {}).subscribe({
        next: (arr) => {
          const me = arr.find(u => (u.username || '').toLowerCase() === this.currentUsername!.toLowerCase());
          if (me) {
            this.currentUserId = me.id;
            this.model.usuarioIds = [me.id];
            // Guardar en localStorage para futuras ocasiones
            try {
              localStorage.setItem('userId', me.id);
              localStorage.setItem('currentUserId', me.id);
            } catch {}
            console.log('[VehiculosCrear] ✅ Usuario encontrado y auto-seleccionado:', me.id);
          } else {
            console.warn('[VehiculosCrear] ⚠️ Usuario no encontrado en la lista del backend');
          }
        },
        error: (err) => {
          console.warn('[VehiculosCrear] ⚠️ No se pudo buscar usuario por username:', err);
        }
      });
      return;
    }

    console.warn('[VehiculosCrear] ⚠️ No se pudo auto-seleccionar usuario actual');
  }

  /**
   * ✅ Cuando cambia la sección, recargar usuarios de esa sección
   */
  onSeccionChange() {
    console.log('[VehiculosCrear] 🔄 Cambio de sección detectado:', this.model.seccionId);

    if (this.model.seccionId) {
      // Limpiar usuarios seleccionados al cambiar de sección
      this.model.usuarioIds = [];
      console.log('[VehiculosCrear] 🧹 Usuarios limpiados, cargando usuarios de la sección:', this.model.seccionId);

      // Recargar usuarios de la nueva sección
      this.loadUsuarios();
    } else {
      console.log('[VehiculosCrear] ⚠️ No hay sección seleccionada, limpiando usuarios');
      this.usuarios = [];
      this.model.usuarioIds = [];
    }
  }

  validate(): string | null {
    const placa = (this.model.placa || '').trim();
    if (!placa) return 'La placa es requerida';
    if (placa.length < 5) return 'La placa debe tener al menos 5 caracteres';
    if (this.model.anio != null) {
      const year = Number(this.model.anio);
      const now = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > now + 1) return `El año debe estar entre 1900 y ${now + 1}`;
    }

    // ✅ VALIDACIÓN CRÍTICA: seccionId es REQUERIDO
    if (!this.model.seccionId) {
      return 'Debe seleccionar una sección para el vehículo';
    }

    // ✅ Validación de usuarios: requerido al menos 1
    const ids = this.model.usuarioIds || [];
    if (!ids.length) {
      // Si es admin, es obligatorio seleccionar usuarios
      if (this.isAdmin) {
        return 'Debe seleccionar al menos un usuario';
      }
      // Si no es admin y no pudo auto-seleccionarse, mostrar mensaje informativo
      return 'No se pudo identificar tu usuario. Por favor, contacta al administrador para crear el vehículo.';
    }

    // ✅ Validar que todos los usuarios sean de la misma sección (solo si es admin y hay usuarios cargados)
    if (this.isAdmin && this.usuarios.length > 0) {
      const usuariosSeleccionados = this.usuarios.filter(u => ids.includes(u.id));
      const todosMismaSeccion = usuariosSeleccionados.every(u => {
        const secId = (u as any).seccionId;
        return secId === this.model.seccionId;
      });

      if (!todosMismaSeccion) {
        return 'Todos los usuarios deben pertenecer a la misma sección que el vehículo';
      }
    }
    return null;
  }

  onSubmit() {
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId) return;

    this.saving = true;
    const placa = this.model.placa.trim().toUpperCase();

    // ✅ Construir body según especificación del backend
    const body: any = {
      placa,
      seccionId: this.model.seccionId, // ✅ REQUERIDO por el backend
      usuarioIds: this.model.usuarioIds || [] // ✅ REQUERIDO: al menos 1 usuario
    };

    // Incluir opcionales solo si tienen valor
    const marca = (this.model.marca || '').trim();
    const modelo = (this.model.modelo || '').trim();
    const linea = (this.model.linea || '').trim();
    const color = (this.model.color || '').trim();
    const anio = this.model.anio != null ? Number(this.model.anio) : undefined;

    if (marca) body.marca = marca;
    if (modelo) body.modelo = modelo;
    if (linea) body.linea = linea;
    if (!isNaN(anio as any) && anio != null) body.anio = anio;
    if (color) body.color = color;

    console.log('[VehiculosCrearComponent] 📡 POST body:', body);

    this.vehiculos.create(this.orgId, body).subscribe({
      next: (res) => {
        console.log('[VehiculosCrearComponent] ✅ POST /vehiculos respuesta:', res);
        this.saving = false;
        this.notify.success('Éxito', res?.message || 'Vehículo creado correctamente');
        this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
      },
      error: (e) => {
        console.error('[VehiculosCrearComponent] ❌ POST /vehiculos error:', e?.status, e?.error || e);
        this.saving = false;

        // ✅ Manejo de errores según especificación del backend
        const status = e?.status;
        let errorMsg = 'No se pudo crear el vehículo';

        switch (status) {
          case 400:
            const msg = e?.error?.message || '';
            if (msg.includes('SECTION_NOT_FOUND')) {
              errorMsg = 'La sección seleccionada no existe';
            } else if (msg.includes('SECTION_PARENT_INVALID_ORG')) {
              errorMsg = 'La sección no pertenece a esta organización';
            } else if (msg.includes('VEHICLE_USERS_REQUIRED')) {
              errorMsg = 'Debe asignar al menos 1 usuario';
            } else if (msg.includes('VEHICLE_USER_FOREIGN_ORG')) {
              errorMsg = 'Usuario de otra organización';
            } else {
              errorMsg = msg || errorMsg;
            }
            this.notify.warn('Validación', errorMsg);
            break;
          case 403:
            this.notify.error('Sin permisos', 'No tiene permisos para crear vehículos');
            break;
          case 404:
            this.notify.warn('No encontrado', 'Organización o sección no encontrada');
            break;
          case 409:
            this.notify.warn('Duplicado', 'Ya existe un vehículo con esta placa');
            break;
          default:
            this.notify.error('Error', e?.error?.message || e?.message || errorMsg);
        }
      }
    });
  }

  cancelar() {
    this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
  }

  // ==== NUEVO: Buscar por placa y asociar/asignar ====
  buscarPorPlaca() {
    const placa = (this.model.placa || '').trim().toUpperCase();
    if (!placa) { this.notify.warn('Búsqueda', 'Ingrese una placa para buscar'); return; }
    if (!this.orgId) return;

    this.buscando = true;
    this.existente = { status: 'idle', vehiculo: null };

    this.vehiculos.buscarPorPlaca(this.orgId, placa).subscribe({
      next: (v) => {
        if (v == null) {
          this.existente = { status: 'notfound', vehiculo: null, message: 'No se encontró un vehículo con esa placa en la organización' };
        } else {
          this.existente = { status: 'found', vehiculo: v };
          this.fillFromVehiculo(v);
        }
        this.buscando = false;
      },
      error: (e) => {
        this.buscando = false;
        const st = e?.status;
        const msg = e?.error?.message || e?.message || (st === 403 ? 'PROHIBIDO' : 'Error buscando vehículo');
        this.existente = { status: 'error', vehiculo: null, message: msg } as any;
        if (st === 403) this.notify.warn('Sin permisos', msg); else this.notify.error('Error', msg);
      }
    });
  }

  private fillFromVehiculo(v: VehicleEntity) {
    this.model.marca = v.marca ?? null;
    this.model.modelo = v.modelo ?? null;
    this.model.linea = v.linea ?? null;
    this.model.anio = v.anio ?? null;
    this.model.color = v.color ?? null;
  }

  asignarPorPlaca() {
    if (!this.orgId) return;
    const placa = (this.model.placa || '').trim().toUpperCase();
    if (!placa) { this.notify.warn('Asignación', 'Ingrese una placa válida'); return; }
    this.asignando = true;
    this.vehiculos.asignarPorPlaca(this.orgId, placa).subscribe({
      next: (res) => {
        this.asignando = false;
        this.notify.success('Listo', res?.message || 'Vehículo asignado a tu usuario');
        this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
      },
      error: (e) => {
        this.asignando = false;
        const st = e?.status;
        const msg = e?.error?.message || e?.message || 'No se pudo asignar el vehículo';
        if (st === 404) this.notify.warn('No encontrado', msg);
        else if (st === 403) this.notify.warn('Sin permisos', msg);
        else this.notify.error('Error', msg);
      }
    });
  }

  asociarAExistente() {
    if (!this.orgId) return;
    const v = this.existenteVehiculo();
    if (!v) { this.notify.warn('Asociar', 'Primero busque y seleccione un vehículo existente'); return; }
    const usuarios = this.usuariosParaExistente || [];
    if (!usuarios.length) { this.notify.warn('Validación', 'Seleccione al menos un usuario para asociar'); return; }

    this.asignando = true;
    this.vehiculos.assignUsers(this.orgId, v.id, usuarios).subscribe({
      next: (res) => {
        this.asignando = false;
        this.notify.success('Listo', res.message || 'Usuarios asociados al vehículo');
        this.router.navigate(['/gestion-de-vehiculos/mis-vehiculos']);
      },
      error: (e) => {
        this.asignando = false;
        if (e?.status === 403) {
          this.notify.warn('Sin permisos', e?.error?.message || 'No tiene permisos para asociar usuarios a este vehículo');
        } else if (e?.status === 400) {
          this.notify.warn('Validación', e?.error?.message || 'Solicitud inválida');
        } else {
          this.notify.error('Error', e?.error?.message || 'No se pudo asociar el/los usuario(s)');
        }
      }
    });
  }

  // Helpers: Agregarme a mí
  addMeToCreateUsers() {
    if (!this.isAdmin) { this.notify.warn('Sin permisos', 'Solo administradores pueden asignar usuarios en creación'); return; }
    if (!this.currentUserId) { this.notify.warn('Usuario', 'No se pudo identificar el usuario actual'); return; }
    this.model.usuarioIds = this.model.usuarioIds || [];
    if (!this.model.usuarioIds.includes(this.currentUserId)) {
      this.model.usuarioIds.push(this.currentUserId);
      this.notify.success('Listo', 'Te agregaste como usuario del vehículo a crear');
    }
  }

  addMeToExistingUsers() {
    if (!this.currentUserId) { this.notify.warn('Usuario', 'No se pudo identificar el usuario actual'); return; }
    if (!this.existenteVehiculo()) { this.notify.warn('Asociar', 'Primero busca un vehículo existente'); return; }
    if (!this.usuariosParaExistente.includes(this.currentUserId)) {
      this.usuariosParaExistente.push(this.currentUserId);
      this.notify.success('Listo', 'Te agregaste para asociarte a este vehículo');
    }
  }

  // Acción rápida: Asignarme directo al vehículo encontrado
  asignarmeAExistente() {
    if (!this.currentUserId) { this.notify.warn('Usuario', 'No se pudo identificar el usuario actual'); return; }
    const v = this.existenteVehiculo();
    if (!v) { this.notify.warn('Asociar', 'Primero busca un vehículo existente'); return; }
    if (!this.usuariosParaExistente.includes(this.currentUserId)) {
      this.usuariosParaExistente.push(this.currentUserId);
    }
    this.asociarAExistente();
  }

  // Mostrar nombre de sección (sin UUID)
  seccionNombreVehiculo(v: VehicleEntity): string {
    const nombreDirecto = (v as any)?.seccionNombre as string | undefined;
    if (nombreDirecto) return nombreDirecto;
    const id = (v as any)?.seccionAsignadaId || (v as any)?.seccionId || null;
    if (!id) return '-';
    const sec = this.secciones.find(s => s.id === id);
    return sec?.nombre || '-';
  }

  private existenteVehiculo(): VehicleEntity | null {
    return (this.existente.status === 'found' && this.existente.vehiculo) ? this.existente.vehiculo : null;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabViewModule } from 'primeng/tabview';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';

import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { GuardiaService } from '../../service/guardia.service';
import { GuardiaUsuarioService } from '../../service/guardia-usuario.service';
import { GuardiaUsuarioConsultaService, GuardiaUsuarioRelacion } from '../../service/guardia-usuario-consulta.service';
import { GuardiasReporteService } from '../../service/guardias-reporte.service';
import {
  Guardia,
  Usuario,
  GuardiaConEstado,
  EstadoGuardia,
  RestringirGuardiaDTO,
  ActualizarGuardiaDTO
} from '../../models/guardia.models';

/**
 * Componente para administrar guardias por usuario
 * Permite asignar, restringir y revocar guardias (puntos de control) a usuarios de una sección
 *
 * IMPORTANTE:
 * - Guardia = Punto de control físico (garita, puerta, checkpoint)
 * - Usuario con rol USUARIO = Persona que puede usar los puntos de control
 * - GuardiaUsuario = Relación entre punto de control y usuario (permisos de acceso)
 */
@Component({
  selector: 'app-administrar-guardias-por-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    ChipModule,
    DialogModule,
    InputTextModule,
    AutoCompleteModule,
    MultiSelectModule,
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule,
    TagModule,
    BadgeModule,
    MessageModule,
    ConfirmDialogModule,
    TabViewModule,
    DropdownModule,
    InputTextareaModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './administrar-guardias-por-usuario.component.html',
  styleUrls: ['./administrar-guardias-por-usuario.component.scss']
})
export class AdministrarGuardiasPorUsuarioComponent implements OnInit {
  // Estado del componente
  usuarios: Usuario[] = [];
  guardias: Guardia[] = [];
  guardiasConEstado: GuardiaConEstado[] = [];
  usuarioSeleccionado: Usuario | null = null;
  loading = false;
  error: string | null = null;

  // NUEVA FUNCIONALIDAD: Selección múltiple
  usuariosSeleccionados: Usuario[] = [];
  guardiasSeleccionadas: Guardia[] = [];
  modoSeleccionMultiple = true; // Por defecto en modo múltiple
  todosUsuariosSeleccionados = false;
  todasGuardiasSeleccionadas = false;

  // Cambios locales pendientes de guardar
  cambiosLocales = new Map<string, GuardiaConEstado>();

  // Contexto de organización y sección
  seccionId: string | null = null;
  organizacionId: string | null = null;
  nombreSeccion: string | null = null;
  nombreOrganizacion: string | null = null;
  contextoBloqueo = false;

  // Filtro de búsqueda
  filtroUsuario = '';
  filtroGuardia = '';
  usuariosFiltrados: Usuario[] = [];

  // Modal de restricción
  mostrarModalRestriccion = false;
  guardiaParaRestringir: GuardiaConEstado | null = null;
  motivoRestriccionInput = '';

  // Enum para usar en el template
  EstadoGuardia = EstadoGuardia;

  // ============================================
  // NUEVAS PROPIEDADES: Vista mejorada con pestañas
  // ============================================

  // Tab activa (0: Usuarios→Guardias, 1: Guardias→Usuarios, 2: Restricciones)
  activeTabIndex = 0;

  // Vista Usuarios → Guardias
  usuarioSeleccionadoDetalle: Usuario | null = null;
  guardiasDelUsuario: GuardiaUsuarioRelacion[] = [];
  loadingGuardiasUsuario = false;

  // Vista Guardias → Usuarios
  guardiaSeleccionadaDetalle: Guardia | null = null;
  usuariosDeLaGuardia: GuardiaUsuarioRelacion[] = [];
  loadingUsuariosGuardia = false;

  // Vista de todas las relaciones
  todasLasRelaciones: GuardiaUsuarioRelacion[] = [];
  loadingTodasRelaciones = false;

  // Selecciones para asignar
  guardiasSeleccionadasParaAsignar: Guardia[] = [];
  usuariosSeleccionadosParaAsignar: Usuario[] = [];

  // Relación temporal para restricción
  relacionParaRestringir: GuardiaUsuarioRelacion | null = null;

  // Estado de descarga de reportes
  descargandoReporteUsuario = false;
  descargandoReporteGuardia = false;

  // Configuración de Guardia
  mostrarModalConfigGuardia = false;
  guardiaParaConfigurar: Guardia | null = null;
  guardiaEditando: Guardia | null = null;
  guardandoGuardia = false;
  eliminandoGuardia = false;

  // Gestión de Usuario Administrador
  usuariosDisponiblesAdmin: UserEntity[] = [];
  usuarioAdminSeleccionado: UserEntity | null = null;
  cargandoUsuariosAdmin = false;

  // Sistema de cambios pendientes para guardia
  cambiosPendientesGuardia: {
    adminAnterior: string | null;
    adminNuevo: string | null;
    permiteEntrada: boolean | null;
    permiteSalida: boolean | null;
    datosBasicos: ActualizarGuardiaDTO | null;
  } = {
    adminAnterior: null,
    adminNuevo: null,
    permiteEntrada: null,
    permiteSalida: null,
    datosBasicos: null
  };

  constructor(
    private orgContext: OrgContextService,
    private usersService: UsersService,
    private guardiaService: GuardiaService,
    private guardiaUsuarioService: GuardiaUsuarioService,
    private guardiaUsuarioConsulta: GuardiaUsuarioConsultaService,
    private guardiasReporteService: GuardiasReporteService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    // Obtener contexto de organización
    this.organizacionId = this.orgContext.value;

    this.seccionId =
      this.orgContext.seccion ||
      localStorage.getItem('loginSeccionImmutable') ||
      localStorage.getItem('seccionPrincipalId') ||
      null;

    // ✅ Detectar si el contexto está bloqueado
    this.contextoBloqueo = this.orgContext.isLocked;

    // ✅ Obtener nombres desde localStorage
    this.nombreSeccion = localStorage.getItem('currentSectionName') || null;
    this.nombreOrganizacion = localStorage.getItem('currentOrgName') || null;


    if (!this.organizacionId) {
      this.mostrarError('⚠️ No se pudo determinar la organización actual. Por favor, vuelva a iniciar sesión.');
      return;
    }

    if (!this.seccionId) {
      const username = localStorage.getItem('username') || 'actual';
      this.mostrarError(
        `⚠️ El usuario "${username}" NO tiene asignada una sección (seccionId: null). ` +
        'Para usar este módulo, un administrador debe asignar una sección a este usuario en "Gestión de Usuarios". ' +
        'Después de asignar la sección, debe cerrar sesión y volver a iniciar sesión.'
      );
      return;
    }
    this.cargarUsuarios();
    this.cargarGuardias();
  }

  /**
   * Buscar usuarios (para autocompletado)
   */
  buscarUsuarios(event: any): void {
    const query = event.query.toLowerCase();
    this.usuariosFiltrados = this.filtrarUsuarios(query);
  }

  /**
   * Cargar usuarios de la sección (rol: USUARIO)
   */
  cargarUsuarios(): void {
    if (!this.seccionId || !this.organizacionId) {
      return;
    }

    this.loading = true;

    this.usersService.list(this.organizacionId, { seccionId: this.seccionId }).subscribe({
      next: (usuariosBackend: UserEntity[]) => {
        const usuariosFiltrados = usuariosBackend.filter(u => {
          const rolesStr = (u.rolNombres || []).join(',').toUpperCase();
          return rolesStr.includes('USUARIO') || u.rolNombre?.toUpperCase() === 'USUARIO';
        });

        this.usuarios = usuariosFiltrados.map(u => this.mapearUsuario(u));
        this.loading = false;
      },
      error: (err: any) => {
        this.mostrarError('Error al cargar usuarios: ' + (err?.error?.message || 'Error desconocido'));
        this.loading = false;
      },
    });
  }

  /**
   * Cargar guardias de la sección (puntos de control físicos)
   */
  cargarGuardias(): void {
    if (!this.seccionId || !this.organizacionId) return;

    this.loading = true;

    this.guardiaService.listarPorSeccion(this.seccionId).subscribe({
      next: (guardias: Guardia[]) => {
        this.guardias = guardias;
        this.loading = false;

        // Cargar usuarios gestores para todas las guardias
        this.cargarUsuariosGestores(guardias);

        // Si hay usuario seleccionado, recargar su estado
        if (this.usuarioSeleccionado) {
          this.cargarEstadoGuardias();
        }
      },
      error: (err: any) => {
        this.mostrarError('Error al cargar puntos de control: ' + (err?.error?.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  /**
   * Cargar usuarios gestores para todas las guardias
   */
  /**
   * Cargar usuarios gestores para todas las guardias
   * NOTA: Ya no es necesario cargar por separado porque el backend envía
   * usuarioGestorNombre y usuarioGestorUsername directamente
   */
  private cargarUsuariosGestores(guardias: Guardia[]): void {
    // El backend ahora envía usuarioGestorNombre y usuarioGestorUsername directamente
    // Por lo tanto, ya no necesitamos hacer llamadas adicionales al API
    const guardiasConGestor = guardias.filter(g => g.usuarioGestorId);

    console.log('👥 Guardias con gestor asignado:', guardiasConGestor.length);
    if (guardiasConGestor.length > 0) {
      guardiasConGestor.forEach(g => {
        console.log(`  ✅ ${g.nombre}: ${g.usuarioGestorNombre} (@${g.usuarioGestorUsername})`);
      });
    }
  }

  /**
   * Cargar estado de guardias para el usuario seleccionado
   */
  cargarEstadoGuardias(): void {
    if (!this.usuarioSeleccionado) return;

    this.loading = true;

    // Cargar guardias disponibles y restringidas en paralelo
    forkJoin({
      disponibles: this.guardiaUsuarioService.listarDisponiblesPorUsuario(this.usuarioSeleccionado.id),
      restringidas: this.guardiaUsuarioService.listarRestringidasPorUsuario(this.usuarioSeleccionado.id)
    }).subscribe({
      next: ({ disponibles, restringidas }) => {
        // Mapear guardias con su estado actual
        this.guardiasConEstado = this.guardias.map(guardia => {
          // Buscar si está asignada
          const asignada = disponibles.find(d => d.guardiaId === guardia.id);
          if (asignada) {
            return {
              ...guardia,
              estado: EstadoGuardia.ASIGNADA,
              relacionId: asignada.id
            };
          }

          // Buscar si está restringida
          const restringida = restringidas.find(r => r.guardiaId === guardia.id);
          if (restringida) {
            return {
              ...guardia,
              estado: EstadoGuardia.RESTRINGIDA,
              motivoRestriccion: restringida.motivoRestriccion,
              relacionId: restringida.id
            };
          }

          // Sin asignar
          return {
            ...guardia,
            estado: EstadoGuardia.SIN_ASIGNAR
          };
        });

        this.loading = false;
      },
      error: (err) => {
        this.mostrarError('Error al cargar estado de guardias: ' + (err?.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  /**
   * Manejar selección de usuario
   */
  onUsuarioSeleccionado(event: any): void {
    this.usuarioSeleccionado = event.value || event;
    this.cambiosLocales.clear();
    this.cargarEstadoGuardias();
  }

  /**
   * Toggle selección de usuario (modo múltiple)
   */
  toggleUsuario(usuario: Usuario, event: any): void {
    if (event.checked) {
      if (!this.usuariosSeleccionados.find(u => u.id === usuario.id)) {
        this.usuariosSeleccionados.push(usuario);
      }
    } else {
      this.usuariosSeleccionados = this.usuariosSeleccionados.filter(u => u.id !== usuario.id);
    }
  }

  /**
   * Verificar si un usuario está seleccionado
   */
  isUsuarioSeleccionado(usuario: Usuario): boolean {
    return this.usuariosSeleccionados.some(u => u.id === usuario.id);
  }

  /**
   * Seleccionar/deseleccionar todos los usuarios
   */
  toggleTodosUsuarios(event: any): void {
    if (event.checked) {
      this.usuariosSeleccionados = [...this.usuariosFiltradosActuales];
    } else {
      this.usuariosSeleccionados = [];
    }
  }

  /**
   * Toggle selección de guardia (modo múltiple)
   */
  toggleGuardia(guardia: Guardia, event: any): void {
    if (event.checked) {
      if (!this.guardiasSeleccionadas.find(g => g.id === guardia.id)) {
        this.guardiasSeleccionadas.push(guardia);
      }
    } else {
      this.guardiasSeleccionadas = this.guardiasSeleccionadas.filter(g => g.id !== guardia.id);
    }
  }

  /**
   * Verificar si una guardia está seleccionada
   */
  isGuardiaSeleccionada(guardia: Guardia): boolean {
    return this.guardiasSeleccionadas.some(g => g.id === guardia.id);
  }

  /**
   * Seleccionar/deseleccionar todas las guardias
   */
  toggleTodasGuardias(event: any): void {
    if (event.checked) {
      this.guardiasSeleccionadas = [...this.guardiasFiltradas];
    } else {
      this.guardiasSeleccionadas = [];
    }
  }

  /**
   * Limpiar todas las selecciones
   */
  limpiarSelecciones(): void {
    this.usuariosSeleccionados = [];
    this.guardiasSeleccionadas = [];
  }

  // ============================================
  // MÉTODOS PÚBLICOS - Operaciones masivas
  // ============================================

  /**
   * Asignar guardias seleccionadas a usuarios seleccionados (modo masivo)
   */
  async asignarGuardiasAUsuarios(): Promise<void> {
    if (this.usuariosSeleccionados.length === 0) {
      this.mostrarError('Debe seleccionar al menos un usuario');
      return;
    }

    if (this.guardiasSeleccionadas.length === 0) {
      this.mostrarError('Debe seleccionar al menos una guardia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Desea asignar <strong>${this.guardiasSeleccionadas.length} guardia(s)</strong> a <strong>${this.usuariosSeleccionados.length} usuario(s)</strong>?`,
      header: 'Confirmar Asignación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, asignar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        await this.ejecutarAsignacion();
      }
    });
  }

  private async ejecutarAsignacion(): Promise<void> {
    this.loading = true;
    let exitosas = 0;
    let fallidas = 0;

    try {
      for (const usuario of this.usuariosSeleccionados) {
        for (const guardia of this.guardiasSeleccionadas) {
          try {
            await this.guardiaUsuarioService.asignar(guardia.id, usuario.id).toPromise();
            exitosas++;
          } catch (err) {
            console.error(`Error asignando guardia ${guardia.nombre} a ${usuario.username}:`, err);
            fallidas++;
          }
        }
      }

      if (exitosas > 0) {
        this.mostrarExito(`✅ ${exitosas} asignación(es) exitosa(s)${fallidas > 0 ? `, ${fallidas} fallida(s)` : ''}`);
        this.limpiarSelecciones();
      } else {
        this.mostrarError('No se pudo realizar ninguna asignación');
      }
    } catch (err: any) {
      this.mostrarError('Error durante la asignación masiva: ' + (err?.message || 'Error desconocido'));
    } finally {
      this.loading = false;
    }
  }

  /**
   * Restringir guardias seleccionadas para usuarios seleccionados
   */
  async restringirGuardiasAUsuarios(): Promise<void> {
    if (this.usuariosSeleccionados.length === 0) {
      this.mostrarError('Debe seleccionar al menos un usuario');
      return;
    }

    if (this.guardiasSeleccionadas.length === 0) {
      this.mostrarError('Debe seleccionar al menos una guardia');
      return;
    }

    const motivo = prompt('Ingrese el motivo de la restricción:');
    if (!motivo || !motivo.trim()) {
      this.mostrarInfo('Operación cancelada');
      return;
    }

    this.loading = true;
    let exitosas = 0;
    let fallidas = 0;

    try {
      for (const usuario of this.usuariosSeleccionados) {
        for (const guardia of this.guardiasSeleccionadas) {
          try {
            await this.guardiaUsuarioService.restringir(
              guardia.id,
              usuario.id,
              { motivoRestriccion: motivo.trim() }
            ).toPromise();
            exitosas++;
          } catch (err) {
            console.error(`Error restringiendo guardia ${guardia.nombre} a ${usuario.username}:`, err);
            fallidas++;
          }
        }
      }

      if (exitosas > 0) {
        this.mostrarExito(`✅ ${exitosas} restricción(es) exitosa(s)${fallidas > 0 ? `, ${fallidas} fallida(s)` : ''}`);
        this.limpiarSelecciones();
      } else {
        this.mostrarError('No se pudo realizar ninguna restricción');
      }
    } catch (err: any) {
      this.mostrarError('Error durante la restricción masiva: ' + (err?.message || 'Error desconocido'));
    } finally {
      this.loading = false;
    }
  }

  /**
   * Revocar asignaciones de guardias seleccionadas para usuarios seleccionados
   */
  async revocarGuardiasAUsuarios(): Promise<void> {
    if (this.usuariosSeleccionados.length === 0) {
      this.mostrarError('Debe seleccionar al menos un usuario');
      return;
    }

    if (this.guardiasSeleccionadas.length === 0) {
      this.mostrarError('Debe seleccionar al menos una guardia');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Desea revocar <strong>${this.guardiasSeleccionadas.length} guardia(s)</strong> de <strong>${this.usuariosSeleccionados.length} usuario(s)</strong>?`,
      header: 'Confirmar Revocación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, revocar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        await this.ejecutarRevocacion();
      }
    });
  }

  private async ejecutarRevocacion(): Promise<void> {
    this.loading = true;
    let exitosas = 0;
    let fallidas = 0;

    try {
      for (const usuario of this.usuariosSeleccionados) {
        for (const guardia of this.guardiasSeleccionadas) {
          try {
            await this.guardiaUsuarioService.revocar(guardia.id, usuario.id).toPromise();
            exitosas++;
          } catch (err) {
            console.error(`Error revocando guardia ${guardia.nombre} de ${usuario.username}:`, err);
            fallidas++;
          }
        }
      }

      if (exitosas > 0) {
        this.mostrarExito(`✅ ${exitosas} revocación(es) exitosa(s)${fallidas > 0 ? `, ${fallidas} fallida(s)` : ''}`);
        this.limpiarSelecciones();
      } else {
        this.mostrarError('No se pudo realizar ninguna revocación');
      }
    } catch (err: any) {
      this.mostrarError('Error durante la revocación masiva: ' + (err?.message || 'Error desconocido'));
    } finally {
      this.loading = false;
    }
  }

  // ============================================
  // MÉTODOS PÚBLICOS - Gestión individual
  // ============================================

  /**
   * Toggle estado de asignación de guardia
   */
  toggleAsignar(guardia: GuardiaConEstado): void {
    const nuevoCambio = { ...guardia };

    if (guardia.estado === EstadoGuardia.ASIGNADA) {
      // Desasignar
      nuevoCambio.estado = EstadoGuardia.SIN_ASIGNAR;
      nuevoCambio.motivoRestriccion = undefined;
    } else if (guardia.estado === EstadoGuardia.RESTRINGIDA) {
      // Cambiar a asignada (quitar restricción)
      nuevoCambio.estado = EstadoGuardia.ASIGNADA;
      nuevoCambio.motivoRestriccion = undefined;
    } else {
      // Asignar
      nuevoCambio.estado = EstadoGuardia.ASIGNADA;
    }

    this.cambiosLocales.set(guardia.id, nuevoCambio);
  }

  /**
   * Toggle estado de restricción de guardia
   */
  toggleRestringir(guardia: GuardiaConEstado): void {
    if (guardia.estado === EstadoGuardia.RESTRINGIDA) {
      // Quitar restricción
      const nuevoCambio = { ...guardia };
      nuevoCambio.estado = EstadoGuardia.SIN_ASIGNAR;
      nuevoCambio.motivoRestriccion = undefined;
      this.cambiosLocales.set(guardia.id, nuevoCambio);
    } else {
      // Abrir modal para pedir motivo
      this.abrirModalRestriccion(guardia);
    }
  }

  /**
   * Abrir modal para ingresar motivo de restricción
   */
  abrirModalRestriccion(guardia: GuardiaConEstado): void {
    this.guardiaParaRestringir = guardia;
    this.motivoRestriccionInput = guardia.motivoRestriccion || '';
    this.mostrarModalRestriccion = true;
  }

  /**
   * Confirmar restricción desde el modal
   */
  confirmarRestriccion(): void {
    if (this.guardiaParaRestringir && this.motivoRestriccionInput.trim()) {
      const nuevoCambio = { ...this.guardiaParaRestringir };
      nuevoCambio.estado = EstadoGuardia.RESTRINGIDA;
      nuevoCambio.motivoRestriccion = this.motivoRestriccionInput.trim();
      this.cambiosLocales.set(this.guardiaParaRestringir.id, nuevoCambio);

      this.cerrarModalRestriccion();
    }
  }

  /**
   * Cerrar modal de restricción
   */
  cerrarModalRestriccion(): void {
    this.mostrarModalRestriccion = false;
    this.guardiaParaRestringir = null;
    this.motivoRestriccionInput = '';
  }

  /**
   * Guardar todos los cambios
   */
  async guardarCambios(): Promise<void> {
    if (!this.usuarioSeleccionado) {
      this.mostrarError('Debe seleccionar un usuario');
      return;
    }

    // Detectar cambios
    const cambios = Array.from(this.cambiosLocales.values())
      .filter(guardiaModificada => {
        const original = this.guardiasConEstado.find(g => g.id === guardiaModificada.id);
        return original && original.estado !== guardiaModificada.estado;
      })
      .map(guardiaModificada => {
        const original = this.guardiasConEstado.find(g => g.id === guardiaModificada.id)!;
        return {
          guardiaId: guardiaModificada.id,
          guardiaNombre: guardiaModificada.nombre,
          nuevoEstado: guardiaModificada.estado,
          estadoAnterior: original.estado,
          motivoRestriccion: guardiaModificada.motivoRestriccion
        };
      });

    if (cambios.length === 0) {
      this.mostrarInfo('No hay cambios para guardar');
      return;
    }

    this.loading = true;

    try {
      // Procesar cada cambio secuencialmente
      for (const cambio of cambios) {
        await this.procesarCambio(cambio);
      }

      this.mostrarExito(`✅ ${cambios.length} cambio(s) guardado(s) exitosamente`);
      this.cambiosLocales.clear();

      // Recargar estado después de guardar
      this.cargarEstadoGuardias();
    } catch (err: any) {
      this.mostrarError('Error al guardar cambios: ' + (err?.message || 'Error desconocido'));
      this.loading = false;
    }
  }

  /**
   * Procesar un cambio individual
   */
  private async procesarCambio(cambio: any): Promise<void> {
    const { guardiaId, nuevoEstado, estadoAnterior, motivoRestriccion } = cambio;
    const usuarioId = this.usuarioSeleccionado!.id;

    // De SIN_ASIGNAR a ASIGNADA
    if (estadoAnterior === EstadoGuardia.SIN_ASIGNAR && nuevoEstado === EstadoGuardia.ASIGNADA) {
      await this.guardiaUsuarioService.asignar(guardiaId, usuarioId).toPromise();
    }
    // De SIN_ASIGNAR a RESTRINGIDA
    else if (estadoAnterior === EstadoGuardia.SIN_ASIGNAR && nuevoEstado === EstadoGuardia.RESTRINGIDA) {
      await this.guardiaUsuarioService.restringir(
        guardiaId,
        usuarioId,
        { motivoRestriccion: motivoRestriccion || 'Sin motivo especificado' }
      ).toPromise();
    }
    // De ASIGNADA a RESTRINGIDA
    else if (estadoAnterior === EstadoGuardia.ASIGNADA && nuevoEstado === EstadoGuardia.RESTRINGIDA) {
      await this.guardiaUsuarioService.restringir(
        guardiaId,
        usuarioId,
        { motivoRestriccion: motivoRestriccion || 'Sin motivo especificado' }
      ).toPromise();
    }
    // De RESTRINGIDA a ASIGNADA
    else if (estadoAnterior === EstadoGuardia.RESTRINGIDA && nuevoEstado === EstadoGuardia.ASIGNADA) {
      await this.guardiaUsuarioService.quitarRestriccion(guardiaId, usuarioId).toPromise();
    }
    // De ASIGNADA/RESTRINGIDA a SIN_ASIGNAR
    else if (
      (estadoAnterior === EstadoGuardia.ASIGNADA || estadoAnterior === EstadoGuardia.RESTRINGIDA) &&
      nuevoEstado === EstadoGuardia.SIN_ASIGNAR
    ) {
      await this.guardiaUsuarioService.revocar(guardiaId, usuarioId).toPromise();
    }
  }

  /**
   * Cancelar cambios
   */
  cancelarCambios(): void {
    this.cambiosLocales.clear();
  }

  /**
   * Obtener clase CSS para el estado
   */
  getEstadoClass(estado: EstadoGuardia): string {
    switch (estado) {
      case EstadoGuardia.ASIGNADA:
        return 'estado-asignada';
      case EstadoGuardia.RESTRINGIDA:
        return 'estado-restringida';
      case EstadoGuardia.SIN_ASIGNAR:
      default:
        return 'estado-sin-asignar';
    }
  }

  // ============================================
  // GETTERS - Propiedades computadas
  // ============================================

  /**
   * Obtener usuarios filtrados
   */
  get usuariosFiltradosActuales(): Usuario[] {
    if (!this.filtroUsuario) return this.usuarios;
    return this.filtrarUsuarios(this.filtroUsuario);
  }

  /**
   * Obtener guardias filtradas
   */
  get guardiasFiltradas(): Guardia[] {
    if (!this.filtroGuardia) return this.guardias;
    const filtroLower = this.filtroGuardia.toLowerCase();
    return this.guardias.filter(g =>
      g.nombre.toLowerCase().includes(filtroLower) ||
      g.codigo.toLowerCase().includes(filtroLower) ||
      g.ubicacion?.toLowerCase().includes(filtroLower)
    );
  }

  /**
   * Obtener guardias con cambios aplicados
   */
  get guardiasConCambios(): GuardiaConEstado[] {
    return this.guardiasConEstado.map(guardia => {
      const cambio = this.cambiosLocales.get(guardia.id);
      return cambio || guardia;
    });
  }

  /**
   * Contar guardias asignadas
   */
  get contadorAsignadas(): number {
    return this.guardiasConCambios.filter(g => g.estado === EstadoGuardia.ASIGNADA).length;
  }

  /**
   * Contar guardias restringidas
   */
  get contadorRestringidas(): number {
    return this.guardiasConCambios.filter(g => g.estado === EstadoGuardia.RESTRINGIDA).length;
  }

  /**
   * Verificar si hay cambios pendientes
   */
  get hayCambiosPendientes(): boolean {
    return this.cambiosLocales.size > 0;
  }

  /**
   * Verificar si hay cambios pendientes en la guardia
   */
  get hayCambiosPendientesGuardia(): boolean {
    if (!this.guardiaEditando || !this.guardiaParaConfigurar) return false;

    // 1. Cambio en nombre
    const nombreCambio = this.guardiaEditando.nombre !== this.guardiaParaConfigurar.nombre;

    // 2. Cambio en descripción
    const descripcionCambio = (this.guardiaEditando.descripcion || '') !== (this.guardiaParaConfigurar.descripcion || '');

    // 3. Cambio en ubicación
    const ubicacionCambio = (this.guardiaEditando.ubicacion || '') !== (this.guardiaParaConfigurar.ubicacion || '');

    // 4. Cambio en usuario administrador
    // IMPORTANTE: Solo se considera cambio si hay un NUEVO administrador seleccionado
    // Si solo se quita el admin (sin seleccionar nuevo), NO se habilita el botón
    const adminActualId = this.guardiaParaConfigurar.usuarioGestorId;
    const adminNuevoId = this.usuarioAdminSeleccionado?.id || null;
    const adminCambio = adminNuevoId !== null && adminActualId !== adminNuevoId;

    // 5. Cambio en permiteEntrada (si fue toggleado)
    const entradaCambio = this.cambiosPendientesGuardia.permiteEntrada !== null;

    // 6. Cambio en permiteSalida (si fue toggleado)
    const salidaCambio = this.cambiosPendientesGuardia.permiteSalida !== null;

    // Retornar true si HAY AL MENOS UN CAMBIO
    return nombreCambio || descripcionCambio || ubicacionCambio || adminCambio || entradaCambio || salidaCambio;
  }

  // ============================================
  // MÉTODOS PRIVADOS - Helpers
  // ============================================

  /**
   * Filtrar usuarios por nombre, username o documento
   */
  private filtrarUsuarios(filtro: string): Usuario[] {
    if (!filtro) return this.usuarios;

    const filtroLower = filtro.toLowerCase();
    return this.usuarios.filter(u =>
      u.nombreCompleto?.toLowerCase().includes(filtroLower) ||
      u.username.toLowerCase().includes(filtroLower) ||
      u.documento?.toLowerCase().includes(filtroLower)
    );
  }

  /**
   * Mapear UserEntity a Usuario
   */
  private mapearUsuario(userEntity: UserEntity): Usuario {
    return {
      id: userEntity.id,
      username: userEntity.username,
      email: userEntity.email || '',
      nombreCompleto: userEntity.nombreCompleto || undefined,
      documento: undefined, // No disponible en UserEntity
      activo: userEntity.activo
    };
  }

  // ============================================
  // MÉTODOS NUEVOS: Vista con Pestañas
  // ============================================

  /**
   * Seleccionar un usuario para ver sus guardias
   */
  onSeleccionarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionadoDetalle = usuario;
    this.cargarGuardiasDelUsuario(usuario.id);
  }

  /**
   * Cargar todas las guardias de un usuario (disponibles + restringidas)
   */
  private cargarGuardiasDelUsuario(usuarioId: string): void {
    this.loadingGuardiasUsuario = true;
    this.guardiasDelUsuario = [];

    this.guardiaUsuarioConsulta.getTodasGuardiasPorUsuario(usuarioId).subscribe({
      next: (relaciones) => {
        this.guardiasDelUsuario = relaciones;
        this.loadingGuardiasUsuario = false;
      },
      error: (err) => {
        console.error('Error al cargar guardias del usuario:', err);
        this.mostrarError('Error al cargar las guardias del usuario');
        this.loadingGuardiasUsuario = false;
      }
    });
  }

  /**
   * Seleccionar una guardia para ver sus usuarios
   */
  onSeleccionarGuardia(guardia: Guardia): void {
    this.guardiaSeleccionadaDetalle = guardia;
    this.cargarUsuariosDeLaGuardia(guardia.id);
  }

  /**
   * Cargar todos los usuarios de una guardia
   */
  private cargarUsuariosDeLaGuardia(guardiaId: string): void {
    this.loadingUsuariosGuardia = true;
    this.usuariosDeLaGuardia = [];

    this.guardiaUsuarioConsulta.getUsuariosPorGuardia(guardiaId).subscribe({
      next: (relaciones) => {
        this.usuariosDeLaGuardia = relaciones;
        this.loadingUsuariosGuardia = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios de la guardia:', err);
        this.mostrarError('Error al cargar los usuarios de la guardia');
        this.loadingUsuariosGuardia = false;
      }
    });
  }

  /**
   * Obtener guardias disponibles (asignadas y no restringidas) del usuario actual
   */
  getGuardiasDisponibles(): GuardiaUsuarioRelacion[] {
    return this.guardiasDelUsuario.filter(r => r.asignada && !r.restringida);
  }

  /**
   * Obtener guardias restringidas del usuario actual
   */
  getGuardiasRestringidas(): GuardiaUsuarioRelacion[] {
    return this.guardiasDelUsuario.filter(r => r.restringida);
  }

  /**
   * Obtener usuarios con acceso a la guardia actual
   */
  getUsuariosConAcceso(): GuardiaUsuarioRelacion[] {
    return this.usuariosDeLaGuardia.filter(r => r.asignada && !r.restringida);
  }

  /**
   * Obtener usuarios restringidos de la guardia actual
   */
  getUsuariosRestringidos(): GuardiaUsuarioRelacion[] {
    return this.usuariosDeLaGuardia.filter(r => r.restringida);
  }

  /**
   * Obtener guardias no asignadas al usuario actual
   */
  getGuardiasNoAsignadas(): Guardia[] {
    const guardiasAsignadasIds = this.guardiasDelUsuario.map(r => r.guardiaId);
    return this.guardias.filter(g => !guardiasAsignadasIds.includes(g.id));
  }

  /**
   * Obtener usuarios no asignados a la guardia actual
   */
  getUsuariosNoAsignados(): Usuario[] {
    const usuariosAsignadosIds = this.usuariosDeLaGuardia.map(r => r.usuarioId);
    return this.usuarios.filter(u => !usuariosAsignadosIds.includes(u.id));
  }

  /**
   * Restringir guardia para usuario
   */
  onRestringirGuardiaParaUsuario(relacion: GuardiaUsuarioRelacion): void {
    this.relacionParaRestringir = relacion;
    this.motivoRestriccionInput = '';
    this.mostrarModalRestriccion = true;
  }

  /**
   * Restringir usuario en guardia
   */
  onRestringirUsuarioEnGuardia(relacion: GuardiaUsuarioRelacion): void {
    this.relacionParaRestringir = relacion;
    this.motivoRestriccionInput = '';
    this.mostrarModalRestriccion = true;
  }

  /**
   * Confirmar restricción
   */
  confirmarRestriccionNuevo(): void {
    if (!this.relacionParaRestringir || !this.motivoRestriccionInput) return;

    const dto: RestringirGuardiaDTO = {
      motivoRestriccion: this.motivoRestriccionInput.trim()
    };

    this.guardiaUsuarioService.restringir(
      this.relacionParaRestringir.guardiaId,
      this.relacionParaRestringir.usuarioId,
      dto
    ).subscribe({
      next: () => {
        this.mostrarExito('✅ Restricción aplicada exitosamente');
        this.mostrarModalRestriccion = false;

        // Recargar según la vista activa
        if (this.usuarioSeleccionadoDetalle) {
          this.cargarGuardiasDelUsuario(this.usuarioSeleccionadoDetalle.id);
        }
        if (this.guardiaSeleccionadaDetalle) {
          this.cargarUsuariosDeLaGuardia(this.guardiaSeleccionadaDetalle.id);
        }
        if (this.activeTabIndex === 2) {
          this.cargarTodasLasRelaciones();
        }
      },
      error: (err) => {
        console.error('Error al restringir:', err);
        this.mostrarError('Error al aplicar la restricción');
      }
    });
  }

  /**
   * Quitar restricción (usuario)
   */
  onQuitarRestriccionUsuario(relacion: GuardiaUsuarioRelacion): void {
    this.confirmationService.confirm({
      message: `¿Desea quitar la restricción de <strong>${relacion.guardiaNombre}</strong> para este usuario?`,
      header: 'Confirmar Acción',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, quitar restricción',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.guardiaUsuarioService.asignar(relacion.guardiaId, relacion.usuarioId).subscribe({
          next: () => {
            this.mostrarExito('✅ Restricción eliminada. Usuario tiene acceso nuevamente');
            if (this.usuarioSeleccionadoDetalle) {
              this.cargarGuardiasDelUsuario(this.usuarioSeleccionadoDetalle.id);
            }
          },
          error: (err) => {
            console.error('Error al quitar restricción:', err);
            this.mostrarError('Error al quitar la restricción');
          }
        });
      }
    });
  }

  /**
   * Quitar restricción (guardia)
   */
  onQuitarRestriccionGuardia(relacion: GuardiaUsuarioRelacion): void {
    this.confirmationService.confirm({
      message: `¿Desea quitar la restricción de <strong>${relacion.usuarioNombre}</strong> en esta guardia?`,
      header: 'Confirmar Acción',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, quitar restricción',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.guardiaUsuarioService.asignar(relacion.guardiaId, relacion.usuarioId).subscribe({
          next: () => {
            this.mostrarExito('✅ Restricción eliminada. Usuario tiene acceso nuevamente');
            if (this.guardiaSeleccionadaDetalle) {
              this.cargarUsuariosDeLaGuardia(this.guardiaSeleccionadaDetalle.id);
            }
          },
          error: (err) => {
            console.error('Error al quitar restricción:', err);
            this.mostrarError('Error al quitar la restricción');
          }
        });
      }
    });
  }

  /**
   * Revocar guardia de usuario
   */
  onRevocarGuardiaDeUsuario(relacion: GuardiaUsuarioRelacion): void {
    this.confirmationService.confirm({
      message: `¿Desea revocar el acceso de este usuario a <strong>${relacion.guardiaNombre}</strong>?<br>Esta acción eliminará completamente la asignación.`,
      header: 'Confirmar Revocación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, revocar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.guardiaUsuarioService.revocar(relacion.guardiaId, relacion.usuarioId).subscribe({
          next: () => {
            this.mostrarExito('✅ Asignación revocada exitosamente');
            if (this.usuarioSeleccionadoDetalle) {
              this.cargarGuardiasDelUsuario(this.usuarioSeleccionadoDetalle.id);
            }
          },
          error: (err) => {
            console.error('Error al revocar:', err);
            this.mostrarError('Error al revocar la asignación');
          }
        });
      }
    });
  }

  /**
   * Revocar usuario de guardia
   */
  onRevocarUsuarioDeGuardia(relacion: GuardiaUsuarioRelacion): void {
    this.confirmationService.confirm({
      message: `¿Desea revocar el acceso de <strong>${relacion.usuarioNombre}</strong> a esta guardia?<br>Esta acción eliminará completamente la asignación.`,
      header: 'Confirmar Revocación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, revocar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.guardiaUsuarioService.revocar(relacion.guardiaId, relacion.usuarioId).subscribe({
          next: () => {
            this.mostrarExito('✅ Asignación revocada exitosamente');
            if (this.guardiaSeleccionadaDetalle) {
              this.cargarUsuariosDeLaGuardia(this.guardiaSeleccionadaDetalle.id);
            }
          },
          error: (err) => {
            console.error('Error al revocar:', err);
            this.mostrarError('Error al revocar la asignación');
          }
        });
      }
    });
  }

  /**
   * Asignar guardias seleccionadas al usuario
   */
  onAsignarGuardiasAUsuario(): void {
    if (!this.usuarioSeleccionadoDetalle || !this.guardiasSeleccionadasParaAsignar.length) return;

    this.confirmationService.confirm({
      message: `¿Desea asignar <strong>${this.guardiasSeleccionadasParaAsignar.length} guardia(s)</strong> a <strong>${this.usuarioSeleccionadoDetalle.nombreCompleto}</strong>?`,
      header: 'Confirmar Asignación',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, asignar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        let exitosas = 0;
        let fallidas = 0;

        for (const guardia of this.guardiasSeleccionadasParaAsignar) {
          try {
            await this.guardiaUsuarioService.asignar(guardia.id, this.usuarioSeleccionadoDetalle!.id).toPromise();
            exitosas++;
          } catch (err) {
            console.error(`Error asignando guardia ${guardia.nombre}:`, err);
            fallidas++;
          }
        }

        if (exitosas > 0) {
          this.mostrarExito(`✅ ${exitosas} guardia(s) asignada(s) exitosamente${fallidas > 0 ? `, ${fallidas} fallida(s)` : ''}`);
          this.guardiasSeleccionadasParaAsignar = [];
          this.cargarGuardiasDelUsuario(this.usuarioSeleccionadoDetalle!.id);
        } else {
          this.mostrarError('No se pudo asignar ninguna guardia');
        }
      }
    });
  }

  /**
   * Asignar usuarios seleccionados a la guardia
   */
  onAsignarUsuariosAGuardia(): void {
    if (!this.guardiaSeleccionadaDetalle || !this.usuariosSeleccionadosParaAsignar.length) return;

    this.confirmationService.confirm({
      message: `¿Desea asignar <strong>${this.usuariosSeleccionadosParaAsignar.length} usuario(s)</strong> a <strong>${this.guardiaSeleccionadaDetalle.nombre}</strong>?`,
      header: 'Confirmar Asignación',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, asignar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        let exitosas = 0;
        let fallidas = 0;

        for (const usuario of this.usuariosSeleccionadosParaAsignar) {
          try {
            await this.guardiaUsuarioService.asignar(this.guardiaSeleccionadaDetalle!.id, usuario.id).toPromise();
            exitosas++;
          } catch (err) {
            console.error(`Error asignando usuario ${usuario.username}:`, err);
            fallidas++;
          }
        }

        if (exitosas > 0) {
          this.mostrarExito(`✅ ${exitosas} usuario(s) asignado(s) exitosamente${fallidas > 0 ? `, ${fallidas} fallida(s)` : ''}`);
          this.usuariosSeleccionadosParaAsignar = [];
          this.cargarUsuariosDeLaGuardia(this.guardiaSeleccionadaDetalle!.id);
        } else {
          this.mostrarError('No se pudo asignar ningún usuario');
        }
      }
    });
  }

  /**
   * Cargar todas las relaciones de la sección
   */
  cargarTodasLasRelaciones(): void {
    if (!this.seccionId) return;

    this.loadingTodasRelaciones = true;
    this.todasLasRelaciones = [];

    this.guardiaUsuarioConsulta.getRelacionesPorSeccion(this.seccionId).subscribe({
      next: (relaciones) => {
        this.todasLasRelaciones = relaciones;
        this.loadingTodasRelaciones = false;
      },
      error: (err) => {
        console.error('Error al cargar relaciones:', err);
        this.mostrarError('Error al cargar las relaciones de la sección');
        this.loadingTodasRelaciones = false;
      }
    });
  }

  /**
   * Mostrar mensaje de error
   */
  private mostrarError(mensaje: string): void {
    this.error = mensaje;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: mensaje,
      life: 5000
    });
  }

  /**
   * Mostrar mensaje de información
   */
  private mostrarInfo(mensaje: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Información',
      detail: mensaje,
      life: 3000
    });
  }

  /**
   * Mostrar mensaje de éxito
   */
  private mostrarExito(mensaje: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: mensaje,
      life: 3000
    });
  }

  /**
   * ============================================
   * EXPORTACIÓN A EXCEL (BACKEND)
   * ============================================
   */

  /**
   * Exportar guardias de un usuario a Excel
   * Consume el endpoint del backend que genera el informe con estilos profesionales
   */
  exportarGuardiasUsuarioAExcel(): void {
    // Validación: debe haber un usuario seleccionado
    if (!this.usuarioSeleccionadoDetalle) {
      this.mostrarError('No hay usuario seleccionado');
      return;
    }

    // Validación: deben existir los contextos necesarios
    if (!this.seccionId || !this.organizacionId) {
      this.mostrarError('Contexto de sección u organización no disponible');
      return;
    }

    // Activar estado de carga
    this.descargandoReporteUsuario = true;

    // Mostrar feedback inmediato
    this.mostrarInfo('⏳ Generando reporte Excel... Por favor espera');

    // Llamar al servicio backend
    this.guardiasReporteService.exportarGuardiasUsuario(
      this.usuarioSeleccionadoDetalle.id,
      this.usuarioSeleccionadoDetalle.username,
      this.seccionId,
      this.organizacionId
    ).subscribe({
      next: (blob) => {
        this.descargandoReporteUsuario = false;

        // Validar tamaño del archivo
        const tamano = this.guardiasReporteService.obtenerTamanoLegible(blob);

        // Alerta si el archivo es muy grande
        if (!this.guardiasReporteService.validarTamanoArchivo(blob, 10)) {
          this.mostrarInfo(`⚠️ Archivo grande (${tamano}). La descarga puede tardar un momento.`);
        }

        // Mensaje de éxito
        this.mostrarExito(`✅ Reporte descargado exitosamente (${tamano})`);

        // Log para debugging
        console.log('Reporte de guardias descargado:', {
          usuario: this.usuarioSeleccionadoDetalle?.username,
          tamano: tamano,
          tipo: blob.type
        });
      },
      error: (error) => {
        this.descargandoReporteUsuario = false;

        console.error('Error al descargar reporte de guardias:', error);

        // Manejo de errores específicos según código HTTP
        let mensajeError = 'Error al generar el reporte Excel';

        if (error.status === 403) {
          mensajeError = '🔒 No tienes permisos para generar este reporte';
        } else if (error.status === 404) {
          mensajeError = '🔍 Usuario no encontrado o sin datos';
        } else if (error.status === 400) {
          mensajeError = '⚠️ Parámetros inválidos. Por favor, intenta nuevamente';
        } else if (error.status === 500) {
          mensajeError = '⚙️ Error del servidor. Por favor, contacta al administrador';
        } else if (error.status === 0) {
          mensajeError = '📡 Error de conexión. Verifica tu red e intenta nuevamente';
        }

        this.mostrarError(mensajeError);
      }
    });
  }

  /**
   * Exportar usuarios de una guardia a Excel
   * Consume el endpoint del backend que genera el informe con estilos profesionales
   */
  exportarUsuariosGuardiaAExcel(): void {
    // Validación: debe haber una guardia seleccionada
    if (!this.guardiaSeleccionadaDetalle) {
      this.mostrarError('No hay guardia seleccionada');
      return;
    }

    // Validación: deben existir los contextos necesarios
    if (!this.seccionId || !this.organizacionId) {
      this.mostrarError('Contexto de sección u organización no disponible');
      return;
    }

    // Activar estado de carga
    this.descargandoReporteGuardia = true;

    // Mostrar feedback inmediato
    this.mostrarInfo('⏳ Generando reporte Excel... Por favor espera');

    // Llamar al servicio backend
    this.guardiasReporteService.exportarUsuariosGuardia(
      this.guardiaSeleccionadaDetalle.id,
      this.guardiaSeleccionadaDetalle.codigo,
      this.seccionId,
      this.organizacionId
    ).subscribe({
      next: (blob) => {
        this.descargandoReporteGuardia = false;

        // Validar tamaño del archivo
        const tamano = this.guardiasReporteService.obtenerTamanoLegible(blob);

        // Alerta si el archivo es muy grande
        if (!this.guardiasReporteService.validarTamanoArchivo(blob, 10)) {
          this.mostrarInfo(`⚠️ Archivo grande (${tamano}). La descarga puede tardar un momento.`);
        }

        // Mensaje de éxito
        this.mostrarExito(`✅ Reporte descargado exitosamente (${tamano})`);

        // Log para debugging
        console.log('Reporte de usuarios descargado:', {
          guardia: this.guardiaSeleccionadaDetalle?.codigo,
          tamano: tamano,
          tipo: blob.type
        });
      },
      error: (error) => {
        this.descargandoReporteGuardia = false;

        console.error('Error al descargar reporte de usuarios:', error);

        // Manejo de errores específicos según código HTTP
        let mensajeError = 'Error al generar el reporte Excel';

        if (error.status === 403) {
          mensajeError = '🔒 No tienes permisos para generar este reporte';
        } else if (error.status === 404) {
          mensajeError = '🔍 Guardia no encontrada o sin datos';
        } else if (error.status === 400) {
          mensajeError = '⚠️ Parámetros inválidos. Por favor, intenta nuevamente';
        } else if (error.status === 500) {
          mensajeError = '⚙️ Error del servidor. Por favor, contacta al administrador';
        } else if (error.status === 0) {
          mensajeError = '📡 Error de conexión. Verifica tu red e intenta nuevamente';
        }

        this.mostrarError(mensajeError);
      }
    });
  }

  // ============================================
  // MÉTODOS: Configuración de Guardia
  // ============================================

  /**
   * Abrir modal de configuración de guardia
   */
  onAbrirConfiguracionGuardia(guardia: Guardia): void {
    this.guardiaParaConfigurar = guardia;
    this.guardiaEditando = { ...guardia }; // Clonar para edición
    this.mostrarModalConfigGuardia = true;

    // Limpiar cambios pendientes
    this.limpiarCambiosPendientesGuardia();

    // Cargar usuarios disponibles para asignar como admin
    this.cargarUsuariosDisponiblesAdmin();

    // Cargar usuario admin actual si existe
    if (guardia.usuarioGestorId) {
      this.cargarUsuarioAdmin(guardia.usuarioGestorId);
    } else {
      this.usuarioAdminSeleccionado = null;
    }
  }

  /**
   * Cerrar modal de configuración
   */
  onCerrarConfiguracionGuardia(): void {
    this.mostrarModalConfigGuardia = false;
    this.guardiaParaConfigurar = null;
    this.guardiaEditando = null;
    this.usuarioAdminSeleccionado = null;
  }

  /**
   * Cargar usuarios disponibles para asignar como admin de guardia
   * Usa la misma lógica que punto-control-crear
   */
  cargarUsuariosDisponiblesAdmin(): void {
    if (!this.organizacionId || !this.seccionId) return;

    this.cargandoUsuariosAdmin = true;

    this.usersService.list(this.organizacionId, { seccionId: this.seccionId }).subscribe({
      next: (usuarios) => {
        // Filtrar usuarios con rol GUARDIA (misma lógica que punto-control-crear)
        this.usuariosDisponiblesAdmin = usuarios.filter(u => {
          const rolesStr = (u.rolNombres || []).join(',').toUpperCase();
          return rolesStr.includes('GUARDIA') || u.rolNombre?.toUpperCase() === 'GUARDIA';
        });
        this.cargandoUsuariosAdmin = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios admin:', err);
        this.cargandoUsuariosAdmin = false;
        this.usuariosDisponiblesAdmin = [];
      }
    });
  }

  /**
   * Cargar datos del usuario admin actual
   */
  cargarUsuarioAdmin(usuarioId: string): void {
    if (!this.organizacionId) return;

    this.usersService.get(this.organizacionId, usuarioId).subscribe({
      next: (usuario) => {
        this.usuarioAdminSeleccionado = usuario;
      },
      error: (err) => {
        console.error('Error al cargar usuario admin:', err);
        this.usuarioAdminSeleccionado = null;
      }
    });
  }

  /**
   * Quitar usuario admin de la guardia
   */
  onQuitarUsuarioAdmin(): void {
    this.confirmationService.confirm({
      message: '¿Está seguro que desea quitar el usuario administrador de esta guardia?',
      header: 'Confirmar acción',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, quitar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.usuarioAdminSeleccionado = null;
      }
    });
  }

  /**
   * Guardar cambios en la configuración de la guardia
   * Procesa todos los cambios pendientes en paralelo
   */
  onGuardarConfiguracionGuardia(): void {
    if (!this.guardiaEditando || !this.guardiaParaConfigurar) return;

    // Validación: nombre obligatorio
    if (!this.guardiaEditando.nombre || this.guardiaEditando.nombre.trim() === '') {
      this.mostrarError('El nombre de la guardia es obligatorio');
      return;
    }

    // Validación: debe haber al menos un cambio (el botón está deshabilitado pero validamos por seguridad)
    if (!this.hayCambiosPendientesGuardia) {
      this.mostrarInfo('No hay cambios para guardar');
      return;
    }

    this.guardandoGuardia = true;

    // Array para almacenar todas las operaciones
    const operaciones: Observable<any>[] = [];

    // 1. Detectar cambios en usuario administrador
    const adminActualId = this.guardiaParaConfigurar.usuarioGestorId;
    const adminNuevoId = this.usuarioAdminSeleccionado?.id || null;
    const adminCambio = adminActualId !== adminNuevoId;

    console.log('🔍 Verificando cambios de administrador:', {
      guardiaId: this.guardiaEditando.id,
      adminActual: adminActualId,
      adminNuevo: adminNuevoId,
      adminCambio: adminCambio,
      usuarioSeleccionado: this.usuarioAdminSeleccionado
    });

    // 2. Detectar cambios en datos básicos
    const nombreCambio = this.guardiaEditando.nombre !== this.guardiaParaConfigurar.nombre;
    const descripcionCambio = (this.guardiaEditando.descripcion || '') !== (this.guardiaParaConfigurar.descripcion || '');
    const ubicacionCambio = (this.guardiaEditando.ubicacion || '') !== (this.guardiaParaConfigurar.ubicacion || '');
    const datosBasicosCambiaron = nombreCambio || descripcionCambio || ubicacionCambio;

    // 3. Quitar admin anterior si cambió
    if (adminCambio && adminActualId) {
      console.log('❌ OPERACIÓN: Quitar admin anterior', { guardiaId: this.guardiaEditando.id, usuarioId: adminActualId });
      operaciones.push(
        this.guardiaUsuarioService.revocar(this.guardiaEditando.id, adminActualId).pipe(
          catchError(error => {
            console.error('❌ Error al quitar admin anterior:', error);
            return of(null);
          })
        )
      );
    }

    // 4. Agregar nuevo admin si cambió
    if (adminCambio && adminNuevoId) {
      console.log('✅ OPERACIÓN: Asignar nuevo admin', {
        guardiaId: this.guardiaEditando.id,
        usuarioId: adminNuevoId,
        username: this.usuarioAdminSeleccionado?.username
      });
      operaciones.push(
        this.guardiaUsuarioService.asignar(this.guardiaEditando.id, adminNuevoId, {
          observaciones: 'Administrador de la guardia'
        }).pipe(
          catchError(error => {
            console.error('❌ Error al asignar nuevo admin:', error);
            return of(null);
          })
        )
      );
    }

    // 5. Actualizar permiteEntrada si cambió
    if (this.cambiosPendientesGuardia.permiteEntrada !== null) {
      operaciones.push(
        this.guardiaService.modificarPermiteEntrada(
          this.guardiaEditando.id,
          this.cambiosPendientesGuardia.permiteEntrada
        ).pipe(
          catchError(error => {
            console.error('❌ Error al actualizar permiteEntrada:', error);
            return of(null);
          })
        )
      );
    }

    // 6. Actualizar permiteSalida si cambió
    if (this.cambiosPendientesGuardia.permiteSalida !== null) {
      operaciones.push(
        this.guardiaService.modificarPermiteSalida(
          this.guardiaEditando.id,
          this.cambiosPendientesGuardia.permiteSalida
        ).pipe(
          catchError(error => {
            console.error('❌ Error al actualizar permiteSalida:', error);
            return of(null);
          })
        )
      );
    }

    // 7. Actualizar datos básicos si cambiaron o si cambió el admin
    if (datosBasicosCambiaron || adminCambio) {
      const dto: ActualizarGuardiaDTO = {
        nombre: this.guardiaEditando.nombre.trim(),
        descripcion: this.guardiaEditando.descripcion?.trim() || undefined,
        ubicacion: this.guardiaEditando.ubicacion?.trim() || undefined,
        usuarioGestorId: adminNuevoId
      };

      operaciones.push(
        this.guardiaService.actualizar(this.guardiaEditando.id, dto).pipe(
          catchError(error => {
            console.error('Error al actualizar datos básicos:', error);
            return of(null);
          })
        )
      );
    }

    // Ejecutar TODAS las operaciones en paralelo
    if (operaciones.length === 0) {
      this.guardandoGuardia = false;
      this.mostrarInfo('No hay cambios para guardar');
      return;
    }

    forkJoin(operaciones).subscribe({
      next: (resultados) => {
        this.guardandoGuardia = false;

        // Verificar si hubo algún error
        const errores = resultados.filter(r => r === null).length;
        const exitosas = resultados.filter(r => r !== null).length;

        if (exitosas > 0) {
          this.mostrarExito(
            `✅ Configuración actualizada correctamente${errores > 0 ? ` (${errores} operación(es) fallida(s))` : ''}`
          );

          // Recargar guardia actualizada
          this.guardiaService.obtenerPorId(this.guardiaEditando!.id).subscribe({
            next: (guardiaActualizada) => {
              // Actualizar en la lista local
              const index = this.guardias.findIndex(g => g.id === guardiaActualizada.id);
              if (index !== -1) {
                this.guardias[index] = guardiaActualizada;
              }

              // Si es la guardia seleccionada actualmente, actualizarla
              if (this.guardiaSeleccionadaDetalle?.id === guardiaActualizada.id) {
                this.guardiaSeleccionadaDetalle = guardiaActualizada;
              }

              this.limpiarCambiosPendientesGuardia();
              this.onCerrarConfiguracionGuardia();
            },
            error: () => {
              this.limpiarCambiosPendientesGuardia();
              this.onCerrarConfiguracionGuardia();
            }
          });
        } else {
          this.mostrarError('No se pudieron guardar los cambios');
        }
      },
      error: (error) => {
        this.guardandoGuardia = false;
        console.error('Error al guardar cambios:', error);
        this.mostrarError('Error al guardar cambios: ' + (error?.error?.message || 'Error desconocido'));
      }
    });
  }

  /**
   * Activar/Desactivar guardia
   */
  onToggleEstadoGuardia(): void {
    if (!this.guardiaEditando) return;

    const activa = this.guardiaEditando.activa;
    const accion = activa ? 'desactivar' : 'activar';

    this.confirmationService.confirm({
      message: `¿Está seguro que desea ${accion} esta guardia?`,
      header: `Confirmar ${accion}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, ' + accion,
      rejectLabel: 'Cancelar',
      accept: () => {
        const observable = activa
          ? this.guardiaService.desactivar(this.guardiaEditando!.id)
          : this.guardiaService.activar(this.guardiaEditando!.id);

        observable.subscribe({
          next: (guardiaActualizada) => {
            this.mostrarExito(`✅ Guardia ${activa ? 'desactivada' : 'activada'} correctamente`);

            // Actualizar en la lista local
            const index = this.guardias.findIndex(g => g.id === guardiaActualizada.id);
            if (index !== -1) {
              this.guardias[index] = guardiaActualizada;
            }

            this.guardiaEditando = guardiaActualizada;

            // Si es la guardia seleccionada actualmente, actualizarla
            if (this.guardiaSeleccionadaDetalle?.id === guardiaActualizada.id) {
              this.guardiaSeleccionadaDetalle = guardiaActualizada;
            }
          },
          error: (err) => {
            this.mostrarError('Error al cambiar estado: ' + (err?.error?.message || 'Error desconocido'));
          }
        });
      }
    });
  }

  /**
   * Eliminar guardia
   */
  onEliminarGuardia(): void {
    if (!this.guardiaEditando) return;

    this.confirmationService.confirm({
      message: `¿Está seguro que desea ELIMINAR permanentemente la guardia "${this.guardiaEditando.nombre}"? Esta acción NO se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.eliminandoGuardia = true;

        this.guardiaService.eliminar(this.guardiaEditando!.id).subscribe({
          next: () => {
            this.eliminandoGuardia = false;
            this.mostrarExito('✅ Guardia eliminada correctamente');

            // Eliminar de la lista local
            this.guardias = this.guardias.filter(g => g.id !== this.guardiaEditando!.id);

            // Si es la guardia seleccionada, limpiar selección
            if (this.guardiaSeleccionadaDetalle?.id === this.guardiaEditando!.id) {
              this.guardiaSeleccionadaDetalle = null;
              this.usuariosDeLaGuardia = [];
            }

            this.onCerrarConfiguracionGuardia();
          },
          error: (err) => {
            this.eliminandoGuardia = false;
            const mensaje = err?.error?.message || 'Error desconocido';
            this.mostrarError('Error al eliminar guardia: ' + mensaje);
          }
        });
      }
    });
  }

  /**
   * Toggle del permiso de entrada en el modal de configuración
   * Acumula el cambio sin ejecutarlo inmediatamente
   */
  onTogglePermiteEntrada(): void {
    if (!this.guardiaEditando) return;

    // Invertir el valor actual
    this.guardiaEditando.permiteEntrada = !this.guardiaEditando.permiteEntrada;

    // Registrar el cambio pendiente
    this.cambiosPendientesGuardia.permiteEntrada = this.guardiaEditando.permiteEntrada;

    // Mostrar feedback visual
    const mensaje = this.guardiaEditando.permiteEntrada
      ? 'Entradas habilitadas (cambio pendiente)'
      : 'Entradas bloqueadas (cambio pendiente)';

    this.mostrarInfo(mensaje);
  }

  /**
   * Toggle del permiso de salida en el modal de configuración
   * Acumula el cambio sin ejecutarlo inmediatamente
   */
  onTogglePermiteSalida(): void {
    if (!this.guardiaEditando) return;

    // Invertir el valor actual
    this.guardiaEditando.permiteSalida = !this.guardiaEditando.permiteSalida;

    // Registrar el cambio pendiente
    this.cambiosPendientesGuardia.permiteSalida = this.guardiaEditando.permiteSalida;

    // Mostrar feedback visual
    const mensaje = this.guardiaEditando.permiteSalida
      ? 'Salidas habilitadas (cambio pendiente)'
      : 'Salidas bloqueadas (cambio pendiente)';

    this.mostrarInfo(mensaje);
  }

  /**
   * Limpiar cambios pendientes de guardia
   */
  private limpiarCambiosPendientesGuardia(): void {
    this.cambiosPendientesGuardia = {
      adminAnterior: null,
      adminNuevo: null,
      permiteEntrada: null,
      permiteSalida: null,
      datosBasicos: null
    };
  }

  /**
   * Cancelar cambios pendientes de guardia
   */
  onCancelarCambiosGuardia(): void {
    if (!this.guardiaParaConfigurar) return;

    this.confirmationService.confirm({
      message: '¿Desea descartar todos los cambios realizados?',
      header: 'Confirmar Cancelación',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, descartar',
      rejectLabel: 'No',
      accept: () => {
        // Restaurar valores originales
        this.guardiaEditando = { ...this.guardiaParaConfigurar! };

        // Limpiar cambios pendientes
        this.limpiarCambiosPendientesGuardia();

        // Restaurar usuario admin original
        if (this.guardiaParaConfigurar!.usuarioGestorId) {
          this.cargarUsuarioAdmin(this.guardiaParaConfigurar!.usuarioGestorId);
        } else {
          this.usuarioAdminSeleccionado = null;
        }

        this.mostrarInfo('Cambios descartados');
      }
    });
  }
}







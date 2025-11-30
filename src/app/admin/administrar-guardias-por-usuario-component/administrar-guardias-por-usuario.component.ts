import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
import { Message } from 'primeng/message';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';

import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { GuardiaService } from '../../service/guardia.service';
import { GuardiaUsuarioService } from '../../service/guardia-usuario.service';
import { GuardiaUsuarioConsultaService, GuardiaUsuarioRelacion } from '../../service/guardia-usuario-consulta.service';
import {
  Guardia,
  Usuario,
  GuardiaConEstado,
  EstadoGuardia,
  RestringirGuardiaDTO
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
    Message,
    ConfirmDialog,
    TabViewModule,
    TableModule
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

  constructor(
    private orgContext: OrgContextService,
    private usersService: UsersService,
    private guardiaService: GuardiaService,
    private guardiaUsuarioService: GuardiaUsuarioService,
    private guardiaUsuarioConsulta: GuardiaUsuarioConsultaService,
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
}


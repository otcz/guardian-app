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
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';

import { OrgContextService } from '../../service/org-context.service';
import { UsersService, UserEntity } from '../../service/users.service';
import { GuardiaService } from '../../service/guardia.service';
import { GuardiaUsuarioService } from '../../service/guardia-usuario.service';
import {
  Guardia,
  Usuario,
  GuardiaConEstado,
  EstadoGuardia
} from '../../models/guardia.models';

/**
 * Componente para administrar guardias por usuario
 * Permite asignar, restringir y revocar guardias a usuarios de una sección
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
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule,
    TagModule,
    BadgeModule
  ],
  providers: [MessageService],
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

  constructor(
    private orgContext: OrgContextService,
    private usersService: UsersService,
    private guardiaService: GuardiaService,
    private guardiaUsuarioService: GuardiaUsuarioService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Obtener contexto de organización y sección
    this.organizacionId = this.orgContext.getCurrentOrgId();

    // Obtener sección del usuario actual (admin de sección)
    const currentUser = this.orgContext.getCurrentUser();
    this.seccionId = currentUser?.seccionId || null;

    console.log('🔍 [AdminGuardias] Contexto:', {
      organizacionId: this.organizacionId,
      seccionId: this.seccionId,
      currentUser
    });

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
      console.error('❌ [AdminGuardias] Usuario sin seccionId. Token JWT:', currentUser);
      console.error('❌ [AdminGuardias] localStorage.seccionPrincipalId:', localStorage.getItem('seccionPrincipalId'));
      console.error('❌ [AdminGuardias] localStorage.loginSeccionImmutable:', localStorage.getItem('loginSeccionImmutable'));
      return;
    }

    // Cargar datos iniciales
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
      console.error('❌ [AdminGuardias] No hay seccionId u organizacionId');
      return;
    }

    console.log('📥 [AdminGuardias] Cargando USUARIOS (rol: USUARIO) de sección:', this.seccionId);
    console.log('📥 [AdminGuardias] OrgId:', this.organizacionId);
    this.loading = true;

    // Usar endpoint correcto: listar usuarios por rol USUARIO
    console.log('📥 [AdminGuardias] 🔄 Llamando a usersService.listarPorRolYSeccion...');

    const subscription = this.usersService.listarPorRolYSeccion(this.organizacionId, 'USUARIO', this.seccionId).subscribe({
      next: (usuarios: UserEntity[]) => {
        console.log('✅ [AdminGuardias] Usuarios recibidos:', usuarios);
        console.log('✅ [AdminGuardias] Cantidad de usuarios:', usuarios?.length || 0);
        this.usuarios = usuarios.map(u => this.mapearUsuario(u));
        console.log('✅ [AdminGuardias] Usuarios mapeados:', this.usuarios);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ [AdminGuardias] Error al cargar usuarios:', err);
        console.error('❌ [AdminGuardias] Error completo:', JSON.stringify(err, null, 2));
        this.mostrarError('Error al cargar usuarios: ' + (err?.error?.message || 'Error desconocido'));
        this.loading = false;
      },
      complete: () => {
        console.log('✅ [AdminGuardias] Suscripción de usuarios completada');
      }
    });

    console.log('📥 [AdminGuardias] Suscripción creada:', subscription);
  }

  /**
   * Cargar guardias de la sección (rol: GUARDIA - personal de vigilancia)
   */
  cargarGuardias(): void {
    if (!this.seccionId || !this.organizacionId) {
      console.error('❌ [AdminGuardias] No hay seccionId u organizacionId');
      return;
    }

    console.log('📥 [AdminGuardias] Cargando GUARDIAS (rol: GUARDIA - personal) de sección:', this.seccionId);
    console.log('📥 [AdminGuardias] OrgId:', this.organizacionId);
    this.loading = true;

    // Usar endpoint correcto: listar usuarios por rol GUARDIA (personal de vigilancia)
    console.log('📥 [AdminGuardias] 🔄 Llamando a usersService.listarPorRolYSeccion...');

    const subscription = this.usersService.listarPorRolYSeccion(this.organizacionId, 'GUARDIA', this.seccionId).subscribe({
      next: (guardiasUsuarios: UserEntity[]) => {
        console.log('✅ [AdminGuardias] Guardias (personal) recibidos:', guardiasUsuarios);
        console.log('✅ [AdminGuardias] Cantidad de guardias:', guardiasUsuarios?.length || 0);

        // Mapear UserEntity a Guardia para mantener compatibilidad con el componente
        this.guardias = guardiasUsuarios.map(u => ({
          id: u.id,
          codigo: u.username, // Usar username como código
          nombre: u.nombreCompleto || u.username,
          descripcion: u.email || undefined,
          ubicacion: u.seccionNombre || undefined,
          seccionId: u.seccionId || '',
          activa: u.activo,
          permiteEntrada: true, // Por defecto
          permiteSalida: true  // Por defecto
        } as Guardia));

        console.log('✅ [AdminGuardias] Guardias mapeadas:', this.guardias);
        this.loading = false;

        // Si hay usuario seleccionado, recargar su estado
        if (this.usuarioSeleccionado) {
          this.cargarEstadoGuardias();
        }
      },
      error: (err) => {
        console.error('❌ [AdminGuardias] Error al cargar guardias:', err);
        console.error('❌ [AdminGuardias] Error completo:', JSON.stringify(err, null, 2));
        this.mostrarError('Error al cargar guardias: ' + (err?.error?.message || 'Error desconocido'));
        this.loading = false;
      },
      complete: () => {
        console.log('✅ [AdminGuardias] Suscripción de guardias completada');
      }
    });

    console.log('📥 [AdminGuardias] Suscripción creada:', subscription);
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
   * Filtrar usuarios por nombre, username o documento
   */
  filtrarUsuarios(filtro: string): Usuario[] {
    if (!filtro) return this.usuarios;

    const filtroLower = filtro.toLowerCase();
    return this.usuarios.filter(u =>
      u.nombreCompleto?.toLowerCase().includes(filtroLower) ||
      u.username.toLowerCase().includes(filtroLower) ||
      u.documento?.toLowerCase().includes(filtroLower)
    );
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

    const confirmacion = confirm(
      `¿Desea asignar ${this.guardiasSeleccionadas.length} guardia(s) a ${this.usuariosSeleccionados.length} usuario(s)?`
    );

    if (!confirmacion) return;

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

    const confirmacion = confirm(
      `¿Desea revocar ${this.guardiasSeleccionadas.length} guardia(s) de ${this.usuariosSeleccionados.length} usuario(s)?`
    );

    if (!confirmacion) return;

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

  /**
   * Limpiar todas las selecciones
   */
  limpiarSelecciones(): void {
    this.usuariosSeleccionados = [];
    this.guardiasSeleccionadas = [];
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
   * Contar guardias por estado
   */
  get contadorAsignadas(): number {
    return this.guardiasConCambios.filter(g => g.estado === EstadoGuardia.ASIGNADA).length;
  }

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


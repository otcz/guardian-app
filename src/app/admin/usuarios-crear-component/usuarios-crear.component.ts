import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UppercaseDirective } from '../../shared/formatting.directives';
import { OrgContextService } from '../../service/org-context.service';
import { SeccionService, SeccionEntity } from '../../service/seccion.service';
import { UsersService, CreateUserRequest, ScopeNivel, UsuariosMeta } from '../../service/users.service';
import { NotificationService } from '../../service/notification.service';
import { SkeletonModule } from 'primeng/skeleton';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { SectionInviteDialogComponent } from '../../shared/section-invite-dialog.component';
import { OrganizationService, Organization } from '../../service/organization.service';
import { RolesService, RoleEntity } from '../../service/roles.service';
import { LugarService } from '../../service/lugar.service';
import { LugarEntity } from '../../models/lugar.models';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-usuarios-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, InputTextModule, DropdownModule, MultiSelectModule, ButtonModule, ProgressSpinnerModule, UppercaseDirective, SkeletonModule, ChipModule, TagModule, TooltipModule, AvatarModule, SectionInviteDialogComponent],
  templateUrl: './usuarios-crear.component.html',
  styleUrls: ['./usuarios-crear.component.scss']
})
export class UsuariosCrearComponent implements OnInit {
  orgId: string | null = null;
  loading = false;
  saving = false;
  secciones: SeccionEntity[] = [];
  showInvite = false;
  organizaciones: Organization[] = [];

  // NUEVO: roles filtrados por contexto
  rolesDisponibles: RoleEntity[] = [];

  // NUEVO: lugares disponibles según la sección seleccionada
  lugaresDisponibles: LugarEntity[] = [];

  // Metadata de scope desde backend
  usuariosMeta: UsuariosMeta | null = null;

  // Opciones del select de scope, derivadas de allowedScopeNiveles
  scopeOptions: { label: string; value: ScopeNivel }[] = [];

  // Mapa simple i18n de labels
  private scopeLabels: Record<string, string> = {
    ORGANIZACION: 'Organización',
    SECCION: 'Sección'
  };

  // Campos separados para teléfono
  codigoPais: string = '+57';
  numeroTelefono: string = '';

  // Lista completa de códigos de país (ordenados alfabéticamente)
  codigosPais = [
    { label: '+93 (Afganistán)', value: '+93' },
    { label: '+355 (Albania)', value: '+355' },
    { label: '+49 (Alemania)', value: '+49' },
    { label: '+376 (Andorra)', value: '+376' },
    { label: '+244 (Angola)', value: '+244' },
    { label: '+1264 (Anguila)', value: '+1264' },
    { label: '+1268 (Antigua y Barbuda)', value: '+1268' },
    { label: '+966 (Arabia Saudita)', value: '+966' },
    { label: '+213 (Argelia)', value: '+213' },
    { label: '+54 (Argentina)', value: '+54' },
    { label: '+374 (Armenia)', value: '+374' },
    { label: '+297 (Aruba)', value: '+297' },
    { label: '+61 (Australia)', value: '+61' },
    { label: '+43 (Austria)', value: '+43' },
    { label: '+994 (Azerbaiyán)', value: '+994' },
    { label: '+1242 (Bahamas)', value: '+1242' },
    { label: '+880 (Bangladés)', value: '+880' },
    { label: '+1246 (Barbados)', value: '+1246' },
    { label: '+973 (Baréin)', value: '+973' },
    { label: '+32 (Bélgica)', value: '+32' },
    { label: '+501 (Belice)', value: '+501' },
    { label: '+229 (Benín)', value: '+229' },
    { label: '+1441 (Bermudas)', value: '+1441' },
    { label: '+375 (Bielorrusia)', value: '+375' },
    { label: '+95 (Birmania/Myanmar)', value: '+95' },
    { label: '+591 (Bolivia)', value: '+591' },
    { label: '+387 (Bosnia y Herzegovina)', value: '+387' },
    { label: '+267 (Botsuana)', value: '+267' },
    { label: '+55 (Brasil)', value: '+55' },
    { label: '+673 (Brunéi)', value: '+673' },
    { label: '+359 (Bulgaria)', value: '+359' },
    { label: '+226 (Burkina Faso)', value: '+226' },
    { label: '+257 (Burundi)', value: '+257' },
    { label: '+975 (Bután)', value: '+975' },
    { label: '+238 (Cabo Verde)', value: '+238' },
    { label: '+855 (Camboya)', value: '+855' },
    { label: '+237 (Camerún)', value: '+237' },
    { label: '+1 (Canadá)', value: '+1' },
    { label: '+974 (Catar)', value: '+974' },
    { label: '+235 (Chad)', value: '+235' },
    { label: '+420 (Chequia)', value: '+420' },
    { label: '+56 (Chile)', value: '+56' },
    { label: '+86 (China)', value: '+86' },
    { label: '+357 (Chipre)', value: '+357' },
    { label: '+57 (Colombia)', value: '+57' },
    { label: '+269 (Comoras)', value: '+269' },
    { label: '+242 (Congo)', value: '+242' },
    { label: '+243 (Congo RD)', value: '+243' },
    { label: '+850 (Corea del Norte)', value: '+850' },
    { label: '+82 (Corea del Sur)', value: '+82' },
    { label: '+225 (Costa de Marfil)', value: '+225' },
    { label: '+506 (Costa Rica)', value: '+506' },
    { label: '+385 (Croacia)', value: '+385' },
    { label: '+53 (Cuba)', value: '+53' },
    { label: '+599 (Curazao)', value: '+599' },
    { label: '+45 (Dinamarca)', value: '+45' },
    { label: '+1767 (Dominica)', value: '+1767' },
    { label: '+593 (Ecuador)', value: '+593' },
    { label: '+20 (Egipto)', value: '+20' },
    { label: '+503 (El Salvador)', value: '+503' },
    { label: '+971 (Emiratos Árabes)', value: '+971' },
    { label: '+291 (Eritrea)', value: '+291' },
    { label: '+421 (Eslovaquia)', value: '+421' },
    { label: '+386 (Eslovenia)', value: '+386' },
    { label: '+34 (España)', value: '+34' },
    { label: '+1 (Estados Unidos)', value: '+1' },
    { label: '+372 (Estonia)', value: '+372' },
    { label: '+268 (Esuatini)', value: '+268' },
    { label: '+251 (Etiopía)', value: '+251' },
    { label: '+63 (Filipinas)', value: '+63' },
    { label: '+358 (Finlandia)', value: '+358' },
    { label: '+679 (Fiyi)', value: '+679' },
    { label: '+33 (Francia)', value: '+33' },
    { label: '+241 (Gabón)', value: '+241' },
    { label: '+220 (Gambia)', value: '+220' },
    { label: '+995 (Georgia)', value: '+995' },
    { label: '+233 (Ghana)', value: '+233' },
    { label: '+350 (Gibraltar)', value: '+350' },
    { label: '+1473 (Granada)', value: '+1473' },
    { label: '+30 (Grecia)', value: '+30' },
    { label: '+299 (Groenlandia)', value: '+299' },
    { label: '+590 (Guadalupe)', value: '+590' },
    { label: '+1671 (Guam)', value: '+1671' },
    { label: '+502 (Guatemala)', value: '+502' },
    { label: '+594 (Guayana Francesa)', value: '+594' },
    { label: '+44 (Guernsey)', value: '+44' },
    { label: '+224 (Guinea)', value: '+224' },
    { label: '+240 (Guinea Ecuatorial)', value: '+240' },
    { label: '+245 (Guinea-Bisáu)', value: '+245' },
    { label: '+592 (Guyana)', value: '+592' },
    { label: '+509 (Haití)', value: '+509' },
    { label: '+504 (Honduras)', value: '+504' },
    { label: '+852 (Hong Kong)', value: '+852' },
    { label: '+36 (Hungría)', value: '+36' },
    { label: '+91 (India)', value: '+91' },
    { label: '+62 (Indonesia)', value: '+62' },
    { label: '+98 (Irán)', value: '+98' },
    { label: '+964 (Irak)', value: '+964' },
    { label: '+353 (Irlanda)', value: '+353' },
    { label: '+354 (Islandia)', value: '+354' },
    { label: '+1345 (Islas Caimán)', value: '+1345' },
    { label: '+682 (Islas Cook)', value: '+682' },
    { label: '+298 (Islas Feroe)', value: '+298' },
    { label: '+500 (Islas Malvinas)', value: '+500' },
    { label: '+1670 (Islas Marianas)', value: '+1670' },
    { label: '+692 (Islas Marshall)', value: '+692' },
    { label: '+677 (Islas Salomón)', value: '+677' },
    { label: '+1649 (Islas Turcas)', value: '+1649' },
    { label: '+1340 (Islas Vírgenes US)', value: '+1340' },
    { label: '+1284 (Islas Vírgenes UK)', value: '+1284' },
    { label: '+972 (Israel)', value: '+972' },
    { label: '+39 (Italia)', value: '+39' },
    { label: '+1876 (Jamaica)', value: '+1876' },
    { label: '+81 (Japón)', value: '+81' },
    { label: '+44 (Jersey)', value: '+44' },
    { label: '+962 (Jordania)', value: '+962' },
    { label: '+7 (Kazajistán)', value: '+7' },
    { label: '+254 (Kenia)', value: '+254' },
    { label: '+996 (Kirguistán)', value: '+996' },
    { label: '+686 (Kiribati)', value: '+686' },
    { label: '+965 (Kuwait)', value: '+965' },
    { label: '+856 (Laos)', value: '+856' },
    { label: '+266 (Lesoto)', value: '+266' },
    { label: '+371 (Letonia)', value: '+371' },
    { label: '+961 (Líbano)', value: '+961' },
    { label: '+231 (Liberia)', value: '+231' },
    { label: '+218 (Libia)', value: '+218' },
    { label: '+423 (Liechtenstein)', value: '+423' },
    { label: '+370 (Lituania)', value: '+370' },
    { label: '+352 (Luxemburgo)', value: '+352' },
    { label: '+853 (Macao)', value: '+853' },
    { label: '+261 (Madagascar)', value: '+261' },
    { label: '+60 (Malasia)', value: '+60' },
    { label: '+265 (Malaui)', value: '+265' },
    { label: '+960 (Maldivas)', value: '+960' },
    { label: '+223 (Malí)', value: '+223' },
    { label: '+356 (Malta)', value: '+356' },
    { label: '+212 (Marruecos)', value: '+212' },
    { label: '+596 (Martinica)', value: '+596' },
    { label: '+230 (Mauricio)', value: '+230' },
    { label: '+222 (Mauritania)', value: '+222' },
    { label: '+262 (Mayotte)', value: '+262' },
    { label: '+52 (México)', value: '+52' },
    { label: '+691 (Micronesia)', value: '+691' },
    { label: '+373 (Moldavia)', value: '+373' },
    { label: '+377 (Mónaco)', value: '+377' },
    { label: '+976 (Mongolia)', value: '+976' },
    { label: '+382 (Montenegro)', value: '+382' },
    { label: '+1664 (Montserrat)', value: '+1664' },
    { label: '+258 (Mozambique)', value: '+258' },
    { label: '+264 (Namibia)', value: '+264' },
    { label: '+674 (Nauru)', value: '+674' },
    { label: '+977 (Nepal)', value: '+977' },
    { label: '+505 (Nicaragua)', value: '+505' },
    { label: '+227 (Níger)', value: '+227' },
    { label: '+234 (Nigeria)', value: '+234' },
    { label: '+683 (Niue)', value: '+683' },
    { label: '+672 (Norfolk)', value: '+672' },
    { label: '+47 (Noruega)', value: '+47' },
    { label: '+687 (Nueva Caledonia)', value: '+687' },
    { label: '+64 (Nueva Zelanda)', value: '+64' },
    { label: '+968 (Omán)', value: '+968' },
    { label: '+31 (Países Bajos)', value: '+31' },
    { label: '+92 (Pakistán)', value: '+92' },
    { label: '+680 (Palaos)', value: '+680' },
    { label: '+970 (Palestina)', value: '+970' },
    { label: '+507 (Panamá)', value: '+507' },
    { label: '+675 (Papúa Nueva Guinea)', value: '+675' },
    { label: '+595 (Paraguay)', value: '+595' },
    { label: '+51 (Perú)', value: '+51' },
    { label: '+689 (Polinesia Francesa)', value: '+689' },
    { label: '+48 (Polonia)', value: '+48' },
    { label: '+351 (Portugal)', value: '+351' },
    { label: '+1787 (Puerto Rico)', value: '+1787' },
    { label: '+44 (Reino Unido)', value: '+44' },
    { label: '+236 (República Centroafricana)', value: '+236' },
    { label: '+1809 (República Dominicana)', value: '+1809' },
    { label: '+262 (Reunión)', value: '+262' },
    { label: '+250 (Ruanda)', value: '+250' },
    { label: '+40 (Rumania)', value: '+40' },
    { label: '+7 (Rusia)', value: '+7' },
    { label: '+685 (Samoa)', value: '+685' },
    { label: '+1684 (Samoa Americana)', value: '+1684' },
    { label: '+1758 (Santa Lucía)', value: '+1758' },
    { label: '+1869 (San Cristóbal y Nieves)', value: '+1869' },
    { label: '+378 (San Marino)', value: '+378' },
    { label: '+1784 (San Vicente)', value: '+1784' },
    { label: '+239 (Santo Tomé y Príncipe)', value: '+239' },
    { label: '+221 (Senegal)', value: '+221' },
    { label: '+381 (Serbia)', value: '+381' },
    { label: '+248 (Seychelles)', value: '+248' },
    { label: '+232 (Sierra Leona)', value: '+232' },
    { label: '+65 (Singapur)', value: '+65' },
    { label: '+1721 (Sint Maarten)', value: '+1721' },
    { label: '+963 (Siria)', value: '+963' },
    { label: '+252 (Somalia)', value: '+252' },
    { label: '+94 (Sri Lanka)', value: '+94' },
    { label: '+268 (Suazilandia)', value: '+268' },
    { label: '+27 (Sudáfrica)', value: '+27' },
    { label: '+249 (Sudán)', value: '+249' },
    { label: '+211 (Sudán del Sur)', value: '+211' },
    { label: '+46 (Suecia)', value: '+46' },
    { label: '+41 (Suiza)', value: '+41' },
    { label: '+597 (Surinam)', value: '+597' },
    { label: '+47 (Svalbard y Jan Mayen)', value: '+47' },
    { label: '+66 (Tailandia)', value: '+66' },
    { label: '+886 (Taiwán)', value: '+886' },
    { label: '+255 (Tanzania)', value: '+255' },
    { label: '+992 (Tayikistán)', value: '+992' },
    { label: '+670 (Timor Oriental)', value: '+670' },
    { label: '+228 (Togo)', value: '+228' },
    { label: '+690 (Tokelau)', value: '+690' },
    { label: '+676 (Tonga)', value: '+676' },
    { label: '+1868 (Trinidad y Tobago)', value: '+1868' },
    { label: '+216 (Túnez)', value: '+216' },
    { label: '+993 (Turkmenistán)', value: '+993' },
    { label: '+90 (Turquía)', value: '+90' },
    { label: '+688 (Tuvalu)', value: '+688' },
    { label: '+380 (Ucrania)', value: '+380' },
    { label: '+256 (Uganda)', value: '+256' },
    { label: '+598 (Uruguay)', value: '+598' },
    { label: '+998 (Uzbekistán)', value: '+998' },
    { label: '+678 (Vanuatu)', value: '+678' },
    { label: '+379 (Vaticano)', value: '+379' },
    { label: '+58 (Venezuela)', value: '+58' },
    { label: '+84 (Vietnam)', value: '+84' },
    { label: '+681 (Wallis y Futuna)', value: '+681' },
    { label: '+967 (Yemen)', value: '+967' },
    { label: '+253 (Yibuti)', value: '+253' },
    { label: '+260 (Zambia)', value: '+260' },
    { label: '+263 (Zimbabue)', value: '+263' }
  ];

  model: CreateUserRequest = {
    username: '',
    nombreCompleto: '',
    email: '',
    telefono: '',
    // no default para scopeNivel
    scopeNivel: undefined as any,
    seccionId: null,
    // organizaci��n que administrará cuando el alcance sea ORGANIZACION
    orgAdministradaId: null as any,
    // nuevo: roles seleccionados (single o multiple segun backend)
    rolesIds: [] as any,
    // nuevo: lugares asignados (múltiples)
    lugaresIds: []
  } as any;

  constructor(
    private orgCtx: OrgContextService,
    private seccionService: SeccionService,
    private users: UsersService,
    private notify: NotificationService,
    private router: Router,
    private orgService: OrganizationService,
    private rolesService: RolesService,
    private lugarService: LugarService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.orgId = this.orgCtx.value;
    if (!this.orgId) {
      this.notify.warn('Atención', 'Seleccione una organización');
      this.router.navigate(['/listar-organizaciones']);
      return;
    }

    let contextoSeccionId = this.orgCtx.seccion || null;

    // Intentar leer del localStorage - PRIORIZAR datos inmutables del login
    if (!contextoSeccionId) {
      try {
        // Primero intentar con el dato inmutable del login
        const loginSeccionImmutable = localStorage.getItem('loginSeccionImmutable');
        const seccionPrincipalId = localStorage.getItem('seccionPrincipalId');

        contextoSeccionId = loginSeccionImmutable || seccionPrincipalId;
      } catch (e) {
        console.error('Error al leer localStorage:', e);
      }
    }

    // Si hay contexto de sección, establecer automáticamente alcance SECCION
    if (contextoSeccionId) {
      this.model.scopeNivel = 'SECCION' as ScopeNivel;
      this.model.seccionId = contextoSeccionId;
    }

    // Cargar metadata de usuarios (scope) y derivar opciones/default
    this.users.getUsuarioMeta(this.orgId).subscribe({
      next: (meta) => {
        this.usuariosMeta = meta;

        // FILTRAR OPCIONES DE ALCANCE: Solo SYSADMIN puede ver ORGANIZACION
        let allowedScopes = meta.allowedScopeNiveles || [];
        const isSysAdmin = this.authService.hasRole('SYSADMIN');

        if (!isSysAdmin) {
          // Filtrar ORGANIZACION para usuarios que no son SYSADMIN
          allowedScopes = allowedScopes.filter((v: any) => String(v).toUpperCase() !== 'ORGANIZACION');
        }

        this.scopeOptions = allowedScopes.map((v) => ({ label: String(v), value: v }));

        // Detectar si es usuario de sección (puede crear SECCION pero NO ORGANIZACION)
        const allowed = allowedScopes.map((x: any) => String(x).toUpperCase());
        const canCreateOrg = allowed.includes('ORGANIZACION');
        const canCreateSeccion = allowed.includes('SECCION');
        const esUsuarioSeccion = canCreateSeccion && !canCreateOrg;


        // PRESELECCIÓN DE ALCANCE SEGÚN CONTEXTO (solo si el modelo aún no tiene valor)
        if (!this.model.scopeNivel && Array.isArray(allowedScopes) && allowedScopes.length) {
          let defaultScope: ScopeNivel | undefined;

          if (contextoSeccionId && allowed.includes('SECCION')) {
            defaultScope = allowedScopes.find((x: any) => String(x).toUpperCase() === 'SECCION');
            // Ya está asignada arriba
          } else if (!contextoSeccionId && allowed.includes('ORGANIZACION') && isSysAdmin) {
            defaultScope = allowedScopes.find((x: any) => String(x).toUpperCase() === 'ORGANIZACION');
          } else if (allowed.includes('SECCION')) {
            // Si no hay contexto de sección pero SECCION está permitida, usarla por defecto
            defaultScope = allowedScopes.find((x: any) => String(x).toUpperCase() === 'SECCION');

            // Si es usuario de sección, intentar encontrar su sección automáticamente
            if (esUsuarioSeccion && !this.model.seccionId && !contextoSeccionId) {
              // Esperar a que las secciones se carguen y asignar la única disponible si solo hay una
              setTimeout(() => {
                if (this.secciones.length === 1) {
                  this.model.seccionId = this.secciones[0].id;
                  this.onSeccionChange();
                }
              }, 500);
            }
          }

          if (defaultScope !== undefined) {
            this.model.scopeNivel = defaultScope;
          }
        }

        this.onScopeChange();
        this.cargarRolesPorContexto();

        // Cargar lugares si hay sección preseleccionada
        if (this.model.seccionId) {
          this.onSeccionChange();
        }
      },
      error: () => {
        this.onScopeChange();
        this.cargarRolesPorContexto();
      }
    });

    this.loadSecciones();
    this.loadOrganizaciones();
  }

  loadOrganizaciones() {
    this.orgService.listAccessible().subscribe({
      next: (list) => { this.organizaciones = list || []; },
      error: (e) => { this.notify.error('Error', e?.error?.message || 'No se pudieron cargar organizaciones'); }
    });
  }

  private capitalize(v: string): string { return v ? (v[0].toUpperCase() + v.slice(1).toLowerCase()) : v; }

  get scopeLabel(): string {
    // Mostrar exactamente el valor que viene del backend, sin prefijo ni i18n
    return String(this.model.scopeNivel || '');
  }

  // Valor informativo para p-tag: nombre de sección (si hay), o id de sección, o scope del contexto
  get infoTag(): string {
    const secId = this.orgCtx.seccion || null;
    if (secId) {
      const found = this.secciones.find(s => String(s.id) === String(secId));
      if (found?.nombre) return String(found.nombre);
      return String(secId);
    }
    const scope = this.orgCtx.scope;
    return scope ? String(scope) : '';
  }

  get initial(): string {
    const src = (this.model.nombreCompleto || this.model.username || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src[0].toUpperCase();
  }

  // ¿Este scope requiere sección principal?
  get isSeccionRequerida(): boolean {
    const cur = String(this.model.scopeNivel || '').toUpperCase();
    const requires = this.usuariosMeta?.requiresSeccionPrincipalWhen ?? [];
    // backend ahora exige seccionId cuando aplique; reaprovechamos metadata existente
    return requires.map((x) => String(x).toUpperCase()).includes(cur);
  }

  get isAlcanceOrganizacion(): boolean {
    return String(this.model.scopeNivel || '').toUpperCase() === 'ORGANIZACION';
  }

  // NUEVO: alcance seccion explícito
  get isAlcanceSeccion(): boolean {
    return String(this.model.scopeNivel || '').toUpperCase() === 'SECCION';
  }

  // Mostrar campo de lugar cuando hay sección seleccionada
  get mostrarCampoLugar(): boolean {
    return !!this.model.seccionId;
  }

  // Verificar si el usuario actual es de alcance SECCION (debe ver su sección bloqueada)
  get tieneContextoSeccion(): boolean {
    // Estrategia 1: Verificar del contexto o localStorage
    let seccionId = this.orgCtx.seccion;
    let scopeActual = this.orgCtx.scope;

    if (!seccionId || !scopeActual) {
      try {
        seccionId = seccionId || localStorage.getItem('seccionPrincipalId');
        scopeActual = scopeActual || localStorage.getItem('scopeNivel') as any;
      } catch {}
    }

    // Si encontramos scope SECCION con seccionId, definitivamente es usuario de sección
    if (seccionId && String(scopeActual || '').toUpperCase() === 'SECCION') {
      return true;
    }

    // Estrategia 2: Verificar por metadatos - si solo puede crear usuarios SECCION
    // (no puede crear ORGANIZACION), entonces es usuario de sección
    const allowedScopes = this.usuariosMeta?.allowedScopeNiveles || [];
    const canCreateOrg = allowedScopes.some((s: any) => String(s).toUpperCase() === 'ORGANIZACION');
    const canCreateSeccion = allowedScopes.some((s: any) => String(s).toUpperCase() === 'SECCION');

    // Si puede crear SECCION pero NO ORGANIZACION, es usuario de sección
    const esUsuarioSeccion = canCreateSeccion && !canCreateOrg;

    // Si es usuario de sección, SIEMPRE mostrar campo bloqueado
    return esUsuarioSeccion;
  }

  // Obtener el nombre de la sección del contexto actual o la asignada
  get seccionContextoNombre(): string {
    // Intentar obtener del contexto primero, luego del localStorage, finalmente del modelo
    let secId: string | null = this.orgCtx.seccion;
    if (!secId) {
      try {
        secId = localStorage.getItem('seccionPrincipalId');
      } catch {}
    }
    if (!secId) {
      secId = this.model.seccionId || null;
    }

    if (!secId) return 'Cargando...';
    const found = this.secciones.find(s => String(s.id) === String(secId));
    const nombre = found?.nombre || `Sección ${secId}`;
    return nombre;
  }

  onScopeChange() {
    let contextoSeccionId = this.orgCtx.seccion || null;

    // Intentar leer del localStorage si no está en el contexto
    if (!contextoSeccionId) {
      try {
        contextoSeccionId = localStorage.getItem('seccionPrincipalId');
      } catch {}
    }

    if (!this.isSeccionRequerida) {
      // Solo limpiar si no hay contexto de sección
      if (!contextoSeccionId) {
        this.model.seccionId = null;
      }
    } else if (contextoSeccionId) {
      // Si hay contexto de sección, mantenerla bloqueada
      this.model.seccionId = contextoSeccionId;
    }

    if (!this.isAlcanceOrganizacion) {
      (this.model as any).orgAdministradaId = null;
    }
    // limpiar selección de roles al cambiar alcance
    (this.model as any).rolesIds = Array.isArray((this.model as any).rolesIds) ? [] : null;
    // limpiar lugares al cambiar alcance solo si cambiamos de sección
    if (!contextoSeccionId || !this.isSeccionRequerida) {
      this.model.lugaresIds = [];
      this.lugaresDisponibles = [];
    } else if (this.model.seccionId) {
      // Si mantenemos la sección del contexto, cargar sus lugares
      this.onSeccionChange();
    }
    this.cargarRolesPorContexto();
  }

  // Método para cargar lugares cuando cambia la sección
  onSeccionChange() {
    this.model.lugaresIds = [];
    this.lugaresDisponibles = [];
    if (this.model.seccionId && this.orgId) {
      this.lugarService.listBySeccion(this.orgId, this.model.seccionId).subscribe({
        next: (lugares) => {
          this.lugaresDisponibles = lugares || [];
        },
        error: (e) => {
          this.notify.error('Error', e?.error?.message || 'No se pudieron cargar los lugares');
          this.lugaresDisponibles = [];
        }
      });
    }
  }

  // nuevo: cuando cambia la organización administrada, recargar roles
  onOrganizacionAdministradaChange(): void {
    // cada cambio de organización implica limpiar el rol elegido
    (this.model as any).rolesIds = Array.isArray((this.model as any).rolesIds) ? [] : null;
    this.cargarRolesPorContexto();
  }

  // Cargar roles válidos según el contexto actual
  private cargarRolesPorContexto(): void {
    this.rolesDisponibles = [];
    if (!this.orgId) return;

    // Si el alcance es SECCION (ya sea con contexto o usuario de sección), usamos la org actual
    if (this.isAlcanceSeccion) {
      this.rolesService.list(this.orgId).subscribe({
        next: (roles) => {
          this.rolesDisponibles = (roles || []).filter(r => r.estado === 'ACTIVO');
        },
        error: () => {
          this.rolesDisponibles = [];
        }
      });
      return;
    }

    // Si el alcance es ORGANIZACION y hay una organización administrada seleccionada,
    // usamos esa organización para listar roles.
    if (this.isAlcanceOrganizacion && (this.model as any).orgAdministradaId) {
      const orgAdminId = String((this.model as any).orgAdministradaId);
      this.rolesService.list(orgAdminId).subscribe({
        next: (roles) => {
          this.rolesDisponibles = (roles || []).filter(r => r.estado === 'ACTIVO');
        },
        error: () => {
          this.rolesDisponibles = [];
        }
      });
      return;
    }

    // Caso general: roles de la organización del contexto actual
    this.rolesService.list(this.orgId).subscribe({
      next: (roles) => {
        this.rolesDisponibles = (roles || []).filter(r => r.estado === 'ACTIVO');
      },
      error: () => {
        this.rolesDisponibles = [];
      }
    });
  }

  loadSecciones() {
    if (!this.orgId) return;
    this.loading = true;
    this.seccionService.list(this.orgId).subscribe({
      next: (list) => {
        this.secciones = list;
        this.loading = false;

        // Auto-asignar sección para usuarios de sección
        if (!this.model.seccionId) {
          // Intentar del contexto/localStorage primero
          let seccionContexto = this.orgCtx.seccion;
          if (!seccionContexto) {
            try {
              seccionContexto = localStorage.getItem('seccionPrincipalId');
            } catch {}
          }

          if (seccionContexto) {
            this.model.seccionId = seccionContexto;
            this.onSeccionChange();
          } else if (this.tieneContextoSeccion && this.secciones.length > 0) {
            // Si es usuario de sección, asignar la primera sección disponible
            // El backend validará que sea la correcta
            this.model.seccionId = this.secciones[0].id;
            this.onSeccionChange();
          }
        }
      },
      error: (e) => { this.loading = false; this.notify.error('Error', e?.error?.message || 'No se pudieron cargar secciones'); }
    });
  }

  // Método para combinar código de país y número
  private combinarTelefono(): void {
    if (this.numeroTelefono && this.numeroTelefono.trim()) {
      // Eliminar espacios y caracteres no numéricos del número
      const numeroLimpio = this.numeroTelefono.replace(/\D/g, '');
      if (numeroLimpio) {
        this.model.telefono = `${this.codigoPais} ${numeroLimpio}`;
      } else {
        this.model.telefono = '';
      }
    } else {
      this.model.telefono = '';
    }
  }

  // Método para separar teléfono existente (útil para edición futura)
  private separarTelefono(telefono: string): void {
    if (!telefono) {
      this.codigoPais = '+57';
      this.numeroTelefono = '';
      return;
    }

    const match = telefono.match(/^(\+\d+)\s*(.*)$/);
    if (match) {
      this.codigoPais = match[1];
      this.numeroTelefono = match[2];
    } else {
      this.codigoPais = '+57';
      this.numeroTelefono = telefono;
    }
  }

  reset() {
    this.model = {
      username: '',
      nombreCompleto: '',
      email: '',
      telefono: '',
      scopeNivel: undefined as any,
      seccionId: null,
      orgAdministradaId: null,
      rolesIds: [] as any,
      lugaresIds: []
    } as any;
    this.codigoPais = '+57';
    this.numeroTelefono = '';
    this.lugaresDisponibles = [];
  }

  validate(): string | null {
    if (!this.model.username || this.model.username.trim().length < 3) return 'Username es requerido (mín. 3)';
    if (this.isSeccionRequerida && !this.model.seccionId) return 'Debe seleccionar la sección';
    if (this.isAlcanceOrganizacion && !(this.model as any).orgAdministradaId) return 'Debe seleccionar la organización que va a administrar';
    return null;
  }

  onSubmit() {
    const err = this.validate();
    if (err) { this.notify.warn('Validación', err); return; }
    if (!this.orgId) return;

    // Combinar código de país y número de teléfono
    this.combinarTelefono();

    this.saving = true;
    const body: any = {
      username: this.model.username.trim().toUpperCase(),
      nombreCompleto: (this.model.nombreCompleto || '').trim() || undefined,
      email: (this.model.email || '').trim() || undefined,
      telefono: (this.model.telefono || '').trim() || undefined,
      scopeNivel: this.model.scopeNivel,
      seccionId: this.isSeccionRequerida ? (this.model.seccionId || null) : undefined,
      lugaresIds: Array.isArray(this.model.lugaresIds) && this.model.lugaresIds.length > 0 ? this.model.lugaresIds : undefined
    };
    if (this.isAlcanceOrganizacion && (this.model as any).orgAdministradaId) {
      body.orgAdministradaId = (this.model as any).orgAdministradaId;
    }
    // Incluir roles seleccionados solo si existen
    const rolesIds = (this.model as any).rolesIds;
    if (Array.isArray(rolesIds) && rolesIds.length) {
      body.rolesIds = rolesIds;
    } else if (rolesIds && typeof rolesIds === 'string') {
      body.rolesIds = [rolesIds];
    }
    this.users.create(this.orgId, body).subscribe({
      next: (res) => {
        this.saving = false;
        this.notify.success('Éxito', res.message || 'USUARIO CREADO CORRECTAMENTE.');
        this.router.navigate(['/gestion-de-usuarios/gestionar-usuario'], { queryParams: { id: res.user.id } });
      },
      error: (e) => {
        this.saving = false;
        this.notify.error('Error', e?.error?.message || 'No se pudo crear el usuario');
      }
    });
  }

  openInvite() { this.showInvite = true; }

  get seccionIdForInvite(): string | null {
    return this.isSeccionRequerida && this.model.seccionId ? String(this.model.seccionId) : null;
  }

  get seccionNombre(): string | null {
    const id = (this.model as any)?.seccionId;
    if (!id) return null;
    const found = this.secciones.find(s => String(s.id) === String(id));
    return found?.nombre ?? null;
  }
}

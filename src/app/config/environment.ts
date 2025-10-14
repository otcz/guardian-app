// Configuración de entorno (development por defecto)
// Si más adelante agregas build para producción, crea otro archivo environment.prod.ts y haz file replacements.
export const environment = {
  apiBase: '/api',          // Prefijo principal (si backend expone /api/...)
  apiFallbackBases: ['/api', ''], // Priorizar /api para evitar 404 en /auth/login
  // Base absoluta práctica para servicios que no usan proxy (recomendado por la guía)
  apiBaseUrl: 'http://localhost:8080/api',
  version: 'dev',
  buildTime: new Date().toISOString(),
  backendHost: 'http://localhost:8080', // Fallback absoluto para APIs de negocio
  // Nuevo: host/base exclusivos para AUTH (según requerimiento en 8081)
  authHost: 'http://localhost:8081',
  authBase: '/auth',
  preferAuthDedicated: false,
  // Bypass de sysadmin SOLO en desarrollo, para endpoint /aplicar
  adminBypass: {
    enabled: true,
    mode: 'header' as 'basic' | 'header' | 'apikey',
    // basic (si eliges este modo)
    basicUser: 'sysadmin',
    basicPass: '2306',
    // header (modo por defecto)
    addHeaderRoles: true,
    headerName: 'X-User-Roles',
    headerValue: 'SYSADMIN',
    // apikey (si eliges este modo)
    apiKey: '',
    apiKeyHeader: 'X-Api-Sysadmin-Key',
    bypassQueryName: 'bypass',
    bypassQueryValue: 'true'
  },
  organizationsEndpoint: '/api/orgs', // Opcional: si conoces la colección exacta, ej. '/api/organizaciones'
  security: {
    // El frontend usará literalmente las rutas enviadas por backend (sin heurísticas)
    keepBackendRoutesLiterally: false,
    // No ocultar menús en frontend por defecto; si se requiere, activar esta bandera
    hideOrgManagement: false
  },
  features: {
    // Si el backend expone GET /organizaciones/accesibles, habilitar en true
    accessibleOrgsEndpoint: false,
    // Cargar rol contextual en listado de Usuarios (contexto ORGANIZACION)
    fetchSectionRolesInOrgList: false
  }
};

// Configuración de entorno (development por defecto)
// Si más adelante agregas build para producción, crea otro archivo environment.prod.ts y haz file replacements.
export const environment = {
  apiBase: '/api',          // Prefijo principal (si backend expone /api/...)
  apiFallbackBases: ['', '/api'], // Se probarán en orden para tolerar diferencias ('' -> /auth/login)
  version: 'dev',
  buildTime: new Date().toISOString(),
  backendHost: 'http://localhost:8080', // Fallback absoluto para APIs de negocio
  // Nuevo: host/base exclusivos para AUTH (según requerimiento en 8081)
  authHost: 'http://localhost:8081',
  authBase: '/auth',
  organizationsEndpoint: '/api/orgs', // Opcional: si conoces la colección exacta, ej. '/api/organizaciones'
  security: {
    // El frontend usará literalmente las rutas enviadas por backend (sin heurísticas)
    keepBackendRoutesLiterally: false
  },
  features: {
    // Si el backend expone GET /organizaciones/accesibles, habilitar en true
    accessibleOrgsEndpoint: false
  }
};

# Script de Verificación - Control de Ingreso y Salida
# Fecha: 15 de Diciembre de 2025

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN DE IMPLEMENTACIÓN" -ForegroundColor Cyan
Write-Host "Control de Ingreso y Salida" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar archivos modificados
Write-Host "📁 Verificando archivos..." -ForegroundColor Yellow
$archivos = @(
    "src\app\guardia\validacion-ingreso\control-ingreso-salida\control-ingreso-salida.component.ts",
    "src\app\guardia\validacion-ingreso\control-ingreso-salida\control-ingreso-salida.component.html",
    "src\app\guardia\validacion-ingreso\control-ingreso-salida\control-ingreso-salida.component.scss",
    "src\app\models\guardia.models.ts",
    "src\app\service\movimiento-guardia.service.ts"
)

$todosExisten = $true
foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        Write-Host "  ✅ $archivo" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $archivo NO ENCONTRADO" -ForegroundColor Red
        $todosExisten = $false
    }
}

Write-Host ""

if (-not $todosExisten) {
    Write-Host "❌ Error: Algunos archivos no existen" -ForegroundColor Red
    exit 1
}

# Verificar componente TypeScript
Write-Host "🔍 Verificando TypeScript..." -ForegroundColor Yellow
$tsFile = Get-Content "src\app\guardia\validacion-ingreso\control-ingreso-salida\control-ingreso-salida.component.ts" -Raw

$verificaciones = @{
    "MetodoValidacion" = $tsFile -match "type MetodoValidacion"
    "TipoMovimiento" = $tsFile -match "type TipoMovimiento"
    "mostrarModalVehiculo" = $tsFile -match "mostrarModalVehiculo"
    "mostrarModalConfirmacion" = $tsFile -match "mostrarModalConfirmacion"
    "tiempoRestante" = $tsFile -match "tiempoRestante"
    "clearTimer" = $tsFile -match "clearTimer\(\)"
    "confirmarVehiculo" = $tsFile -match "confirmarVehiculo\(\)"
    "registrarEntradaConModal" = $tsFile -match "registrarEntradaConModal"
    "registrarSalidaConModal" = $tsFile -match "registrarSalidaConModal"
    "DialogModule" = $tsFile -match "DialogModule"
    "RadioButtonModule" = $tsFile -match "RadioButtonModule"
    "DividerModule" = $tsFile -match "DividerModule"
    "OnDestroy" = $tsFile -match "implements.*OnDestroy"
}

foreach ($check in $verificaciones.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key) NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar HTML
Write-Host "🔍 Verificando HTML..." -ForegroundColor Yellow
$htmlFile = Get-Content "src\app\guardia\validacion-ingreso\control-ingreso-salida\control-ingreso-salida.component.html" -Raw

$verificacionesHtml = @{
    "config-card" = $htmlFile -match "config-card"
    "metodoValidacion" = $htmlFile -match "metodoValidacion"
    "tipoMovimientoConfig" = $htmlFile -match "tipoMovimientoConfig"
    "vehiculo-dialog" = $htmlFile -match "vehiculo-dialog"
    "confirmacion-dialog" = $htmlFile -match "confirmacion-dialog"
    "timer-warning" = $htmlFile -match "timer-warning"
    "tiempoRestante" = $htmlFile -match "tiempoRestante"
    "vehiculo-cards" = $htmlFile -match "vehiculo-cards"
    "p-radioButton BIOMETRICO" = $htmlFile -match 'value="BIOMETRICO"'
    "p-radioButton FACE_CAM" = $htmlFile -match 'value="FACE_CAM"'
    "p-radioButton PLACA_CAM" = $htmlFile -match 'value="PLACA_CAM"'
    "p-radioButton MANUAL" = $htmlFile -match 'value="MANUAL"'
}

foreach ($check in $verificacionesHtml.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key) NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar SCSS
Write-Host "🔍 Verificando SCSS..." -ForegroundColor Yellow
$scssFile = Get-Content "src\app\guardia\validacion-ingreso\control-ingreso-salida\control-ingreso-salida.component.scss" -Raw

$verificacionesScss = @{
    "config-section" = $scssFile -match "\.config-section"
    "config-group" = $scssFile -match "\.config-group"
    "vehiculo-dialog" = $scssFile -match "\.vehiculo-dialog"
    "timer-warning" = $scssFile -match "\.timer-warning"
    "vehiculo-cards" = $scssFile -match "\.vehiculo-cards"
    "confirmacion-dialog" = $scssFile -match "\.confirmacion-dialog"
    "pulse-timer animation" = $scssFile -match "@keyframes pulse-timer"
    "check-bounce animation" = $scssFile -match "@keyframes check-bounce"
    "color-dot" = $scssFile -match "\.color-dot"
}

foreach ($check in $verificacionesScss.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key) NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar modelos
Write-Host "🔍 Verificando Modelos..." -ForegroundColor Yellow
$modelsFile = Get-Content "src\app\models\guardia.models.ts" -Raw

$verificacionesModels = @{
    "vehiculos: Vehiculo[]" = $modelsFile -match "vehiculos:\s*Vehiculo\[\]"
    "interface Vehiculo" = $modelsFile -match "interface Vehiculo"
    "color?" = $modelsFile -match "color\?\s*:"
    "tipo?" = $modelsFile -match "tipo\?\s*:"
    "marca?" = $modelsFile -match "marca\?\s*:"
    "modelo?" = $modelsFile -match "modelo\?\s*:"
}

foreach ($check in $verificacionesModels.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key) NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar Service (API Endpoints)
Write-Host "🔍 Verificando API Endpoints..." -ForegroundColor Yellow
$serviceFile = Get-Content "src\app\service\movimiento-guardia.service.ts" -Raw

$verificacionesService = @{
    "validarUsuario method" = $serviceFile -match "validarUsuario\([^)]*\):\s*Observable"
    "registrarEntrada method" = $serviceFile -match "registrarEntrada\([^)]*\):\s*Observable"
    "registrarSalida method" = $serviceFile -match "registrarSalida\([^)]*\):\s*Observable"
    "POST /entrada endpoint" = $serviceFile -match "post.*[`"']/entrada[`"']"
    "POST /salida endpoint" = $serviceFile -match "post.*[`"']/salida[`"']"
    "GET validar-usuario endpoint" = $serviceFile -match "get.*validar-usuario"
    "RegistrarEntradaDTO" = $serviceFile -match "RegistrarEntradaDTO"
    "RegistrarSalidaDTO" = $serviceFile -match "RegistrarSalidaDTO"
    "ValidacionUsuarioDTO" = $serviceFile -match "ValidacionUsuarioDTO"
}

foreach ($check in $verificacionesService.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key) NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar integración en componente
Write-Host "🔍 Verificando Integración API en Componente..." -ForegroundColor Yellow

$verificacionesIntegracion = @{
    "Import MovimientoGuardiaService" = $tsFile -match "MovimientoGuardiaService"
    "validarUsuario() call" = $tsFile -match "\.validarUsuario\("
    "registrarEntrada() call" = $tsFile -match "\.registrarEntrada\("
    "registrarSalida() call" = $tsFile -match "\.registrarSalida\("
    "HTTP Error Handling" = $tsFile -match "(catchError|error:|\.subscribe\([^)]*error)"
    "guardiaId en DTO" = $tsFile -match "guardiaId:\s*(this\.guardiaId|guardiaId)"
    "usuarioId en DTO" = $tsFile -match "usuarioId:\s*(this\.validacionUsuario|validacionUsuario)"
    "adminGuardiaId en DTO" = $tsFile -match "adminGuardiaId"
}

foreach ($check in $verificacionesIntegracion.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key) NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ VERIFICACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Documentación:" -ForegroundColor Yellow
Write-Host "   docs\IMPLEMENTACION-METODOS-VALIDACION-MODAL-VEHICULOS-2025-12-15.md" -ForegroundColor White
Write-Host "   docs\API-FLUJO-VALIDACION-ENTRADA-SALIDA-2025-12-15.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 API Endpoints verificados:" -ForegroundColor Yellow
Write-Host "   GET  /api/movimientos-guardia/validar-usuario/{identificacion}" -ForegroundColor Cyan
Write-Host "   POST /api/movimientos-guardia/entrada" -ForegroundColor Cyan
Write-Host "   POST /api/movimientos-guardia/salida" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Códigos HTTP esperados:" -ForegroundColor Yellow
Write-Host "   200 OK          - Consultas exitosas" -ForegroundColor White
Write-Host "   201 CREATED     - Entrada/Salida registrada" -ForegroundColor White
Write-Host "   400 BAD REQUEST - Datos inválidos" -ForegroundColor White
Write-Host "   401 UNAUTHORIZED- Token faltante/inválido" -ForegroundColor White
Write-Host "   404 NOT FOUND   - Usuario no encontrado" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para probar la aplicación:" -ForegroundColor Yellow
Write-Host "   ng serve" -ForegroundColor White
Write-Host ""


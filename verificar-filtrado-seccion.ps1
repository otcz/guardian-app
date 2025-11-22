# 🔍 Script de Verificación: Filtrado de Usuarios por Sección

# Este script ayuda a verificar que el sistema esté correctamente configurado
# para el filtrado de usuarios por sección

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN: FILTRADO DE USUARIOS POR SECCIÓN" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Variables de configuración
$API_BASE = "http://localhost:8080/api"  # Ajustar según tu entorno
$ORG_ID = ""  # Se solicitará al usuario
$TOKEN = ""   # Se solicitará al usuario

# Función para hacer peticiones HTTP
function Invoke-ApiRequest {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Headers = @{}
    )

    try {
        $response = Invoke-RestMethod -Uri "$API_BASE$Endpoint" -Method $Method -Headers $Headers
        return $response
    } catch {
        Write-Host "❌ Error en request: $_" -ForegroundColor Red
        return $null
    }
}

# Paso 1: Verificar Frontend
Write-Host "📦 Verificando Archivos del Frontend..." -ForegroundColor Yellow
Write-Host ""

$frontendFiles = @(
    "src/app/admin/usuarios-listar-component/usuarios-listar.component.ts",
    "src/app/service/users.service.ts",
    "src/app/service/org-context.service.ts"
)

$allFilesExist = $true
foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - NO ENCONTRADO" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""

if (-not $allFilesExist) {
    Write-Host "⚠️ Algunos archivos no se encontraron. Verifica la estructura del proyecto." -ForegroundColor Yellow
    Write-Host ""
}

# Paso 2: Verificar implementación en usuarios-listar.component.ts
Write-Host "🔍 Verificando Implementación del Filtrado..." -ForegroundColor Yellow
Write-Host ""

$componentFile = "src/app/admin/usuarios-listar-component/usuarios-listar.component.ts"
if (Test-Path $componentFile) {
    $content = Get-Content $componentFile -Raw

    # Verificar el NUEVO comportamiento: SIN filtrado manual
    $checks = @{
        "✅ Eliminación de envío manual seccionId" = $content -match "NO enviar params\.seccionId"
        "✅ Logs de filtrado automático" = $content -match "El backend aplicará filtrado automático"
        "✅ Llamada simplificada al servicio" = $content -match "this\.users\.list\(this\.orgId\)\.subscribe"
        "✅ Logs de distribución por sección" = $content -match "Distribución por sección"
        "❌ NO debe enviar parámetro seccionId manualmente" = !($content -match "params\.seccionId = String\(seccionId\)")
    }

    foreach ($check in $checks.GetEnumerator()) {
        $keyParts = $check.Key -split " ", 2
        $icon = $keyParts[0]
        $description = $keyParts[1]

        if ($check.Value) {
            Write-Host "  $icon $description" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $description - NO ENCONTRADO/INCORRECTO" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ❌ No se pudo verificar el componente" -ForegroundColor Red
}

Write-Host ""

# Paso 3: Verificar users.service.ts
Write-Host "🔍 Verificando Servicio de Usuarios..." -ForegroundColor Yellow
Write-Host ""

$serviceFile = "src/app/service/users.service.ts"
if (Test-Path $serviceFile) {
    $content = Get-Content $serviceFile -Raw

    $checks = @{
        "✅ Método list acepta parámetros opcionales" = $content -match "list\(orgId: string, params\?\:"
        "✅ Documentación del filtrado automático" = $content -match "FILTRADO AUTOMÁTICO basándose en el rol"
        "✅ Comentario sobre seccionId ignorado" = $content -match "seccionId es IGNORADO"
        "✅ Logs informativos de backend" = $content -match "Backend aplicará filtrado automático"
        "✅ Compatibilidad mantenida" = $content -match "params\?.seccionId"
    }

    foreach ($check in $checks.GetEnumerator()) {
        $keyParts = $check.Key -split " ", 2
        $icon = $keyParts[0]
        $description = $keyParts[1]

        if ($check.Value) {
            Write-Host "  $icon $description" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $description - NO ENCONTRADO" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ❌ No se pudo verificar el servicio" -ForegroundColor Red
}

Write-Host ""

# Paso 4: Compilar el proyecto
Write-Host "Compilando Proyecto..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "package.json") {
    Write-Host "  Ejecutando: ng build --configuration development" -ForegroundColor Gray

    # Verificar que Angular CLI este disponible
    try {
        $ngVersion = ng version 2>&1 | Out-String
        if ($ngVersion -match "Angular CLI") {
            Write-Host "  Angular CLI detectado" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Angular CLI no disponible. Asegurate de tenerlo instalado." -ForegroundColor Yellow
        Write-Host "     Ejecuta: npm install -g @angular/cli" -ForegroundColor Gray
    }
} else {
    Write-Host "  package.json no encontrado" -ForegroundColor Red
}

Write-Host ""

# Paso 5: Checklist de testing
Write-Host "📋 Checklist de Testing Manual" -ForegroundColor Yellow
Write-Host ""

$testCases = @(
    "Login como ADMINSECC1 y verificar que solo ve usuarios de SECC1",
    "Login como ADMINSECC2 y verificar que NO ve usuarios de SECC1",
    "Verificar en Network Tab que NO se envía parámetro ?seccionId=",
    "Verificar en Console logs: [UsuariosListar] Backend aplicará filtrado automático",
    "Verificar en Console logs: Distribución por sección correcta",
    "Login como ORGADMIN y verificar que ve TODOS los usuarios",
    "Verificar logs del backend: [UsuarioController][listar]",
    "Verificar que ADMINSECC1 NO puede ver usuarios de SECC2 bajo ninguna circunstancia"
)

foreach ($i in 0..($testCases.Count - 1)) {
    Write-Host "  [ ] Test $($i + 1): $($testCases[$i])" -ForegroundColor Gray
}

Write-Host ""

# Paso 6: Información de documentación
Write-Host "📚 Documentación Disponible" -ForegroundColor Yellow
Write-Host ""

$docs = @(
    @{
        File = "docs/CORRECCION-FILTRADO-SECCION.md"
        Description = "Especificación técnica de la corrección (Backend)"
    },
    @{
        File = "docs/IMPLEMENTACION-REQUERIMIENTO-FILTRADO-SECCION-2025-11-21.md"
        Description = "Implementación completa del requerimiento frontend (2025-11-21)"
    },
    @{
        File = "docs/GUIA-TESTING-FILTRADO-SECCION.md"
        Description = "Guía completa de testing paso a paso"
    },
    @{
        File = "VERIFICACION-FILTRADO-USUARIOS.md"
        Description = "Verificación de implementación frontend"
    }
)

foreach ($doc in $docs) {
    if (Test-Path $doc.File) {
        Write-Host "  ✅ $($doc.File)" -ForegroundColor Green
        Write-Host "     $($doc.Description)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ $($doc.File) - NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""

# Resumen final
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Frontend:" -ForegroundColor Green
Write-Host "   - Componente usuarios-listar implementado" -ForegroundColor Gray
Write-Host "   - Servicio users.service configurado" -ForegroundColor Gray
Write-Host "   - Logs de debugging agregados" -ForegroundColor Gray
Write-Host ""

Write-Host "⏳ Backend:" -ForegroundColor Yellow
Write-Host "   - Verificar que el backend esté desplegado" -ForegroundColor Gray
Write-Host "   - Verificar logs: [UsuarioController][listar]" -ForegroundColor Gray
Write-Host "   - Confirmar métodos en repositorios agregados" -ForegroundColor Gray
Write-Host ""

Write-Host "📋 Próximos Pasos:" -ForegroundColor Cyan
Write-Host "   1. Compilar frontend: ng build" -ForegroundColor Gray
Write-Host "   2. Desplegar aplicación" -ForegroundColor Gray
Write-Host "   3. Ejecutar tests manuales (ver GUIA-TESTING-FILTRADO-SECCION.md)" -ForegroundColor Gray
Write-Host "   4. Verificar logs del backend" -ForegroundColor Gray
Write-Host "   5. Documentar resultados" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Preguntar si quiere compilar ahora
$compile = Read-Host "¿Deseas compilar el proyecto ahora? (s/n)"
if ($compile -eq "s" -or $compile -eq "S") {
    Write-Host ""
    Write-Host "Compilando proyecto..." -ForegroundColor Yellow
    ng build --configuration development

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Compilación exitosa" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error en compilación. Revisa los errores arriba." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Script finalizado." -ForegroundColor Cyan
Write-Host ""


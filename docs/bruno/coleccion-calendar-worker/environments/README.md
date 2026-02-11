# Entornos de Bruno - Calendar Worker

Esta carpeta contiene los archivos de configuración de entornos para la colección de Bruno del Calendar Worker.

## 📁 Entornos disponibles

### Local.bru
**Propósito**: Desarrollo local con `pnpm dev`
- `base_url`: `http://localhost:8787`
- `user_id`: `local-dev-user-001`
- `debug_requests`: `true` - Muestra detalles completos de requests
- `debug_oauth`: `true` - Información detallada del flujo OAuth
- `debug_calendar`: `false` - Análisis de eventos deshabilitado por defecto

**Uso típico**: Desarrollo y testing inicial de funcionalidades

### Desarrollo.bru
**Propósito**: Worker desplegado en ambiente de desarrollo/staging
- `base_url`: `https://calendar-worker-dev.tu-dominio.workers.dev`
- `user_id`: `dev-test-user-001`
- `debug_requests`: `false` - Logs mínimos para mejor rendimiento
- `debug_oauth`: `true` - OAuth debugging habilitado para troubleshooting
- `debug_calendar`: `false` - Análisis de eventos deshabilitado

**Uso típico**: Testing de integración y validación pre-producción

### Produccion.bru
**Propósito**: Worker en producción (usar con precaución)
- `base_url`: `https://calendar-worker.tu-dominio-prod.workers.dev`
- `user_id`: (vacío por seguridad)
- `debug_requests`: `false` - Sin logs para mejor seguridad
- `debug_oauth`: `false` - Sin información sensible en logs
- `debug_calendar`: `false` - Mínimo overhead

**Uso típico**: Testing crítico y verificaciones de producción

### Testing.bru
**Propósito**: Entorno especializado para testing exhaustivo
- `base_url`: `https://calendar-worker-testing.tu-dominio.workers.dev`
- `user_id`: `testing-user-001`
- `test_user_authenticated`: `testing-auth-user-002` - Usuario pre-autenticado
- `debug_requests`: `true` - Logs completos para análisis
- `debug_oauth`: `false` - OAuth simplificado
- `debug_calendar`: `true` - Análisis detallado de eventos
- `error_type`: `missing_header` - Tipo de error por defecto
- `timeout_ms`: `30000` - Timeout extendido para requests lentos

**Uso típico**: Testing de errores, performance y casos edge

## 🔧 Variables principales

### Variables requeridas
- **base_url**: URL base del Cloudflare Worker
- **user_id**: Identificador único del usuario para testing

### Variables de debugging
- **debug_requests**: `true/false` - Logs detallados de HTTP requests
- **debug_oauth**: `true/false` - Información del flujo OAuth
- **debug_calendar**: `true/false` - Análisis de eventos de calendario

### Variables especiales
- **test_user_authenticated**: Usuario que ya completó OAuth (opcional)
- **error_type**: Tipo de error para testing específico (opcional)
- **timeout_ms**: Timeout personalizado para requests (opcional)

## ⚙️ Configuración personalizada

### Para usar tu propio dominio
1. Edita los archivos `.bru` correspondientes
2. Cambia `tu-dominio` por tu dominio real:
   ```
   base_url: https://calendar-worker.mi-empresa.workers.dev
   ```

### Para múltiples usuarios de testing
Crea copias de los entornos con diferentes `user_id`:
```
vars {
  base_url: http://localhost:8787
  user_id: team-member-001
  debug_requests: true
}
```

### Para testing de performance
Usa el entorno Testing con timeout extendido:
```
vars {
  timeout_ms: 60000
  debug_calendar: true
}
```

## 🚨 Consideraciones de seguridad

### ❌ NO hacer en entornos de producción
- Habilitar `debug_oauth=true` (puede filtrar tokens)
- Usar `user_id` predecibles o simples
- Commitear códigos de autorización reales
- Compartir archivos con datos sensibles

### ✅ Mejores prácticas
- Usar `user_id` únicos por desarrollador/entorno
- Mantener `debug_*=false` en producción
- Limpiar variables temporales después de testing
- Revisar logs antes de compartir screenshots

## 📝 Variables temporales

Algunas variables se generan automáticamente durante el flujo:

### Generadas por scripts
- `auth_code`: Código de autorización de Google (temporal)
- `google_auth_url`: URL de autorización generada (temporal)

### Configurables para testing
- `error_type`: Controla el tipo de error en 06-test-errores.bru
  - `missing_header`: Sin header x-user-id
  - `invalid_user`: Usuario inexistente
  - `empty_user`: Header vacío
  - `malformed_user`: Header malformado

## 🔄 Cambio de entornos

### En Bruno GUI
1. Ve a la barra lateral izquierda
2. Click en el dropdown de entornos
3. Selecciona el entorno deseado
4. Las variables se cargarán automáticamente

### Verificación de entorno activo
Ejecuta "01 - Información del Servicio" para verificar que el `base_url` es correcto.

## 📋 Plantilla para nuevo entorno

Si necesitas crear un entorno adicional:

```
vars {
  base_url: https://calendar-worker-NOMBRE.tu-dominio.workers.dev
  user_id: NOMBRE-user-001
  debug_requests: false
  debug_oauth: false
  debug_calendar: false
  # Variables adicionales según necesidades
}
```

## 🔗 Archivos relacionados

- `../bruno.json`: Configuración principal de la colección
- `../variables-ejemplo.json`: Ejemplos de configuración detallados
- `../README.md`: Documentación completa de la colección
- `../GUIA-USO-BRUNO.md`: Guía de uso paso a paso
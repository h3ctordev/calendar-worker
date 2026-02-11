# Colección Bruno - Calendar Worker

Esta colección de Bruno contiene todos los endpoints necesarios para probar el servicio Calendar Worker, que actúa como puente entre OpenClaw y Google Calendar.

## Estructura de la colección

La colección está organizada en orden secuencial para seguir el flujo completo de autenticación y uso:

1. **01-info-servicio.bru** - Información básica del servicio
2. **02-auth-google.bru** - Iniciar autenticación con Google OAuth
3. **03-auth-callback.bru** - Callback de autenticación
4. **04-calendar-list.bru** - Listar todos los calendarios disponibles
5. **05-calendar-today.bru** - Obtener eventos de hoy (multi-calendario)
6. **06-calendar-week.bru** - Obtener eventos de la semana (multi-calendario)
7. **07-test-errores.bru** - Testing de errores comunes

## Configuración de entornos

La colección incluye tres entornos preconfigurados:

### Local
- **base_url**: `http://localhost:8787`
- **user_id**: `test-user-123`

Para desarrollo local usando `pnpm dev`.

### Desarrollo
- **base_url**: `https://calendar-worker.tu-dominio.workers.dev`
- **user_id**: `test-user-123`

Para testing en el worker desplegado en desarrollo.

### Producción
- **base_url**: `https://calendar-worker.tu-dominio-prod.workers.dev`
- **user_id**: (vacío por seguridad)

Para testing en producción. Requiere configurar un `user_id` válido.

## Variables necesarias

### Variables de entorno (definidas en bruno.json)
- `base_url`: URL base del worker
- `user_id`: Identificador único del usuario para testing

### Variables de colección (se generan automáticamente)
- `google_auth_url`: URL de autorización de Google (generada en paso 2)
- `auth_code`: Código de autorización de Google (debe copiarse manualmente)

## Flujo de testing completo

### 1. Verificar servicio
Ejecuta `01-info-servicio.bru` para verificar que el worker está funcionando.

### 2. Iniciar autenticación
Ejecuta `02-auth-google.bru` para obtener la URL de autorización de Google.

### 3. Autorización manual
1. Ve a la URL mostrada en `google_auth_url`
2. Autoriza la aplicación en Google
3. Copia el parámetro `code` de la URL de callback
4. Pégalo en la variable `auth_code` de Bruno

### 4. Completar autenticación
Ejecuta `03-auth-callback.bru` para intercambiar el código por tokens y guardarlos en KV.

### 5. Probar endpoints de calendario
Una vez autenticado, puedes ejecutar:
- `04-calendar-list.bru` para ver todos los calendarios disponibles
- `05-calendar-today.bru` para eventos de hoy (multi-calendario)
- `06-calendar-week.bru` para eventos de la semana (multi-calendario)
- `07-test-errores.bru` para probar manejo de errores

## Configuración requerida

### Cloudflare Worker
- Variables de entorno configuradas en Wrangler
- KV namespace `USERS_KV` configurado
- Credenciales OAuth de Google configuradas

### Google Cloud Console
- Proyecto con Google Calendar API habilitada
- Credenciales OAuth 2.0 configuradas
- URL de callback autorizada: `https://tu-worker.workers.dev/auth/callback`

## Scripts automáticos

Cada request incluye scripts que:

### Pre-request
- Validan variables requeridas
- Muestran instrucciones cuando sea necesario
- Preparan datos para la request

### Post-response
- Registran información relevante en consola
- Extraen y guardan variables útiles
- Analizan respuestas para debugging

### Tests
- Verifican códigos de estado HTTP
- Validan estructura de respuestas JSON
- Comprueban campos requeridos
- Validan lógica de negocio específica

## Errores comunes y soluciones

### 401 - Unauthorized
- **Causa**: Falta header `x-user-id` o usuario no autenticado
- **Solución**: Verificar que el `user_id` esté configurado y completar flujo OAuth

### 404 - User not found
- **Causa**: Usuario no existe en KV
- **Solución**: Ejecutar flujo completo de autenticación (pasos 2-4)

### 400 - Bad Request
- **Causa**: Parámetros faltantes o inválidos
- **Solución**: Revisar variables requeridas en cada request

### 500 - Internal Server Error
- **Causa**: Error del worker o API de Google
- **Solución**: Revisar logs de Cloudflare y configuración OAuth

## Nuevas funcionalidades (v2.0.0)

### Multi-calendario
- Todos los endpoints de calendario ahora consultan **múltiples calendarios**
- Incluye calendarios principales, compartidos, suscritos y públicos
- Cada evento incluye información del calendario origen (ID, nombre, color)
- Procesamiento paralelo para mejor rendimiento

### Logging verboso
- Sistema completo de logs estructurados para debugging
- Request IDs únicos para seguimiento completo
- Redacción automática de información sensible

### Eventos enriquecidos
- Cada evento incluye `calendar_id`, `calendar_name`, `calendar_color`
- Información completa de organizador, creador, asistentes
- Enlaces directos a Google Calendar

## Variables de debugging

Activa las siguientes variables en Bruno para debugging avanzado:

- `debug_requests`: Muestra detalles completos de requests
- `debug_oauth`: Muestra información detallada del flujo OAuth
- `debug_calendar`: Muestra datos extra de eventos de calendario
- `error_type`: Controla tipo de error a probar en request de errores

## Notas de seguridad

- Nunca commitees el `auth_code` en control de versiones
- Usa `user_id` únicos y no predecibles en producción
- Los refresh tokens se almacenan cifrados en KV
- Las URLs de callback deben estar en whitelist de Google

## Flujo recomendado para testing

### Primera ejecución (setup completo)
1. `01-info-servicio` - Verificar que el worker responde
2. `02-auth-google` - Iniciar flujo OAuth 
3. `03-auth-callback` - Completar autenticación (requiere intervención manual)
4. `04-calendar-list` - Ver calendarios disponibles del usuario
5. `05-calendar-today` - Eventos de hoy de todos los calendarios
6. `06-calendar-week` - Eventos de la semana de todos los calendarios

### Testing de regresión
Una vez el usuario está autenticado, puedes ejecutar directamente:
- `04-calendar-list` para verificar acceso a calendarios
- `05-calendar-today` y `06-calendar-week` para datos actuales
- `07-test-errores` para verificar manejo de errores

## Interpretación de respuestas multi-calendario

### Respuesta típica de eventos:
```json
{
  "total_calendars": 3,
  "total_events": 5,
  "calendars": [
    {"id": "primary", "summary": "usuario@example.com", "primary": true},
    {"id": "shared123", "summary": "Equipo", "primary": false}
  ],
  "events": [
    {
      "calendar_id": "primary",
      "calendar_name": "usuario@example.com",
      "calendar_color": "#9fc6e7",
      "summary": "Reunión"
    }
  ]
}
```

### Análisis automático
Los scripts post-response muestran automáticamente:
- Número total de calendarios y eventos
- Lista de calendarios consultados con sus permisos
- Distribución de eventos por calendario
- Eventos ordenados cronológicamente

## Estructura de archivos

```
docs/bruno/coleccion-calendar-worker/
├── bruno.json                 # Configuración de colección y entornos
├── README.md                  # Esta documentación
├── 01-info-servicio.bru      # GET / - Información del servicio
├── 02-auth-google.bru        # GET /auth/google - Iniciar OAuth
├── 03-auth-callback.bru      # GET /auth/callback - Callback OAuth
├── 04-calendar-list.bru      # GET /calendar/list - Lista calendarios
├── 05-calendar-today.bru     # GET /calendar/today - Eventos hoy (multi)
├── 06-calendar-week.bru      # GET /calendar/week - Eventos semana (multi)
└── 07-test-errores.bru       # Testing de manejo de errores
```

Cada archivo `.bru` incluye documentación completa en la sección `docs` con ejemplos, casos de uso y troubleshooting específico.
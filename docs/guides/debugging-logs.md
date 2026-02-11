# Guía de Debugging con Logs Verbosos

Esta guía explica cómo utilizar el sistema de logging verboso implementado en el calendar-worker para diagnosticar problemas en producción.

## Visión General

El worker implementa un sistema de logging estructurado que registra detalladamente:
- Todas las llamadas HTTP a las APIs de Google (OAuth y Calendar)
- Operaciones de KV (lectura/escritura de usuarios)
- Flujo de autenticación OAuth completo
- Manejo de errores con contexto detallado

## Estructura de Logs

Todos los logs siguen un formato JSON estructurado:

```json
{
  "level": "INFO|ERROR",
  "timestamp": "2026-02-10T15:30:45.123Z",
  "message": "Descripción legible del evento",
  "requestId": "uuid-generado-por-request",
  "userId": "identificador-del-usuario",
  "action": "nombre-de-la-acción",
  "http": {
    "method": "GET|POST",
    "url": "https://api.example.com/endpoint",
    "status": 200,
    "headers": { /* headers relevantes */ },
    "bodySize": 1234
  }
}
```

## Activación de Logs

Los logs verbosos están **siempre activos** en el worker. Para verlos:

### En Wrangler Dev (Local)
```bash
pnpm dev
# Los logs aparecen directamente en la consola
```

### En Producción
```bash
# Logs en tiempo real
pnpm dlx wrangler tail

# Logs con filtros
pnpm dlx wrangler tail --format pretty
```

### En Dashboard de Cloudflare
1. Ve a **Workers & Pages**
2. Selecciona tu worker `calendar-worker`  
3. Ve a la pestaña **Logs**
4. Habilita **Real-time Logs**

## Tipos de Logs por Funcionalidad

### 1. Autenticación OAuth

#### Inicio del flujo OAuth (`/auth/google`)
```json
{
  "level": "INFO",
  "message": "Starting Google OAuth flow",
  "action": "google_auth_initiate",
  "userId": "user123",
  "redirectUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### Callback OAuth (`/auth/callback`)
```json
{
  "level": "INFO", 
  "message": "Processing Google OAuth callback",
  "action": "google_auth_callback",
  "hasCode": true,
  "codeLength": 87
}
```

#### Intercambio de tokens
```json
{
  "level": "INFO",
  "message": "HTTP Request",
  "action": "exchange_code_for_tokens",
  "http": {
    "method": "POST",
    "url": "https://oauth2.googleapis.com/token",
    "bodyParams": ["code=[REDACTED]", "client_id=...", "grant_type=authorization_code"]
  }
}
```

### 2. Llamadas a Google Calendar API

#### Request a Calendar Events
```json
{
  "level": "INFO",
  "message": "Starting Google Calendar API request",
  "action": "fetch_calendar_events", 
  "timeRange": {
    "start": "2026-02-10T03:00:00.000Z",
    "end": "2026-02-11T03:00:00.000Z",
    "timezone": "America/Santiago"
  },
  "requestParams": {
    "singleEvents": true,
    "orderBy": "startTime",
    "maxResults": 250
  }
}
```

#### Response de Calendar Events
```json
{
  "level": "INFO",
  "message": "Google Calendar API request successful",
  "eventCount": 5,
  "hasNextPageToken": false,
  "timeZone": "America/Santiago",
  "summary": "usuario@example.com"
}
```

### 3. Operaciones KV

#### Lectura de usuario
```json
{
  "level": "INFO",
  "message": "User retrieved and validated successfully",
  "action": "get_user_from_kv",
  "userId": "user123",
  "provider": "google",
  "timezone": "America/Santiago",
  "hasRefreshToken": true
}
```

#### Guardado de usuario  
```json
{
  "level": "INFO",
  "message": "User saved to KV successfully", 
  "action": "save_user_to_kv",
  "userId": "user123",
  "kvKey": "user:user123",
  "recordSize": 245
}
```

## Diagnóstico de Problemas Comunes

### 1. Error 401 en Calendar API

**Síntoma:** `Google Calendar request failed: Invalid Credentials`

**Buscar en logs:**
```bash
# Filtrar logs de refresh token
pnpm dlx wrangler tail --format pretty | grep "refresh_access_token"
```

**Logs a revisar:**
- `"action": "refresh_access_token"` - ¿Se está refresheando el token?
- `"Google OAuth request failed"` - ¿Hay error en el refresh?
- `"Google Calendar API response received"` - ¿Qué status code devuelve?

### 2. Usuario no encontrado en KV

**Síntoma:** `User not found in KV`

**Buscar en logs:**
```bash
# Filtrar operaciones KV para un usuario específico  
pnpm dlx wrangler tail --format pretty | grep "user123"
```

**Logs a revisar:**
- `"action": "save_user_to_kv"` - ¿Se guardó el usuario correctamente?
- `"action": "get_user_from_kv"` - ¿Se está usando el userId correcto?
- `"found": false` - Confirma que no existe en KV

### 3. Error en OAuth Flow

**Síntoma:** `Missing refresh_token`

**Buscar en logs:**
```bash
# Filtrar todo el flujo OAuth
pnpm dlx wrangler tail --format pretty | grep -E "(google_auth|oauth)"
```

**Logs a revisar:**
- `"Google OAuth URL generated"` - ¿Se generó correctamente la URL?
- `"hasAccessToken": true, "hasRefreshToken": false` - Google no devolvió refresh token
- `"oauthError"` - Error específico de Google OAuth

### 4. Problemas de Secrets/Variables

**Síntoma:** `YOUR_GOOGLE_CLIENT_ID` aparece en logs

**Logs indicativos:**
```json
{
  "level": "ERROR",
  "message": "Google OAuth request failed", 
  "oauthError": {
    "error": "invalid_client",
    "error_description": "The OAuth client was not found."
  }
}
```

**Solución:** Verificar que los secrets están configurados y no las variables del `wrangler.toml`.

## Filtros Útiles en Producción

### Ver solo errores
```bash
pnpm dlx wrangler tail --format pretty | grep "ERROR"
```

### Seguir un request específico
```bash
pnpm dlx wrangler tail --format pretty | grep "requestId-específico"
```

### Ver solo llamadas HTTP externas
```bash
pnpm dlx wrangler tail --format pretty | grep "HTTP Request"
```

### Filtrar por usuario
```bash
pnpm dlx wrangler tail --format pretty | grep "userId.*user123"
```

## Redacción de Información Sensible

El sistema **automáticamente redacta** información sensible:

- **Headers de Authorization:** `"authorization": "[REDACTED]"`
- **Client Secrets:** `"client_secret=[REDACTED]"`
- **Tokens:** `"refresh_token=[REDACTED]"`
- **Códigos OAuth:** `"code=[REDACTED]"`

## Mejores Prácticas

### 1. Usar Request ID para seguimiento
Cada request tiene un `requestId` único que permite seguir todo el flujo:

```bash
# Encontrar un request problemático
pnpm dlx wrangler tail --format pretty | grep "Failed"

# Seguir todo ese request  
pnpm dlx wrangler tail --format pretty | grep "abc-123-def-456"
```

### 2. Monitorear patrones de error
```bash
# Contar tipos de error más comunes
pnpm dlx wrangler tail --format json | jq -r '.message' | sort | uniq -c
```

### 3. Revisar performance
Los logs incluyen timestamps y tamaños de response para identificar llamadas lentas:

```json
{
  "http": {
    "bodySize": 15420,
    "status": 200
  },
  "timestamp": "2026-02-10T15:30:45.123Z"
}
```

## Limitaciones

- **Cloudflare Logs:** Solo mantiene logs por ~24-48 horas
- **Volumen:** En alto tráfico, algunos logs pueden perderse
- **Tamaño:** Responses >1000 caracteres se truncan automáticamente

Para retención de logs más larga, considera integrar con servicios como Logflare o exportar logs a herramientas de monitoreo externas.
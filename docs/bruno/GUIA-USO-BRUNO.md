# Guía de Uso - Bruno REST Client

Esta guía te ayudará a configurar y usar Bruno para probar la API de Calendar Worker.

## 🚀 Configuración inicial

> **Nota**: Esta guía ha sido actualizada para la versión 2.0.0 que incluye soporte multi-calendario y logging verboso.

### 1. Instalar Bruno
Descarga Bruno desde [usebruno.com](https://www.usebruno.com/) o instala vía package manager:

```bash
# macOS
brew install bruno

# Windows (Chocolatey)
choco install bruno

# Linux (AppImage)
# Descargar desde GitHub releases
```

### 2. Abrir la colección
1. Abre Bruno
2. Click en "Open Collection"
3. Navega a `docs/bruno/coleccion-calendar-worker/`
4. Selecciona la carpeta completa

### 3. Configurar entorno
1. En Bruno, selecciona el entorno apropiado:
   - **Local**: Para desarrollo con `pnpm dev`
   - **Desarrollo**: Para worker desplegado en staging
   - **Producción**: Para testing en producción

2. Ajusta las variables según tu configuración:
   ```json
   {
     "base_url": "http://localhost:8787",
     "user_id": "tu-usuario-unico-123"
   }
   ```

## 📋 Flujo de testing completo

### Flujo completo (primera vez)
Para usuarios nuevos, ejecuta todos los pasos en orden:

### Paso 1: Verificar servicio
Ejecuta **01 - Información del Servicio**
- ✅ Status 200
- ✅ Respuesta JSON con endpoints disponibles

### Paso 2: Iniciar OAuth
Ejecuta **02 - Iniciar Autenticación Google**
- ✅ Status 302 (redirect)
- ✅ Header `Location` con URL de Google
- 📝 Se guarda `google_auth_url` automáticamente

### Paso 3: Autorización manual
1. Ve a la URL mostrada en la consola de Bruno
2. Autoriza la aplicación en Google
3. Serás redirigido a una URL como:
   ```
   https://tu-worker.workers.dev/auth/callback?code=ABC123...&state=tu-usuario
   ```
4. **Copia el valor del parámetro `code`**

### Paso 4: Configurar código de autorización
1. En Bruno, ve a Variables de Entorno
2. Agrega/edita la variable `auth_code`
3. Pega el código copiado del paso anterior

### Paso 5: Completar OAuth
Ejecuta **03 - Callback Autenticación Google**
- ✅ Status 200
- ✅ Mensaje "successfully linked"
- ✅ User ID y provider confirmados

### Paso 6: Explorar calendarios disponibles
Ejecuta **04 - Lista de Calendarios**
- ✅ Status 200
- ✅ Lista de todos los calendarios accesibles
- ✅ Información de permisos y colores
- 📝 Se muestran calendarios principales, compartidos y suscritos

### Paso 7: Probar endpoints de eventos (multi-calendario)
Ahora puedes ejecutar:
- **05 - Eventos de Hoy**: Eventos del día actual de todos los calendarios
- **06 - Eventos de la Semana**: Eventos de lunes a domingo de todos los calendarios
- **07 - Test de Errores**: Verificar manejo de errores

### Respuesta típica (v2.0.0)
```json
{
  "timeframe": "today",
  "total_calendars": 3,
  "total_events": 5,
  "calendars": [
    {"id": "primary", "summary": "usuario@example.com", "primary": true},
    {"id": "team@group.calendar.google.com", "summary": "Equipo", "primary": false}
  ],
  "events": [
    {
      "calendar_id": "primary",
      "calendar_name": "usuario@example.com", 
      "calendar_color": "#9fc6e7",
      "summary": "Reunión diaria"
    }
  ]
}
```

### Flujo rápido (testing repetido)
Para usuarios ya autenticados:
1. **04 - Lista de Calendarios** - Ver calendarios disponibles
2. **05 - Eventos de Hoy** - Datos actuales multi-calendario  
3. **06 - Eventos de la Semana** - Vista semanal completa

## 🔧 Variables importantes

### Variables de entorno (bruno.json)
```json
{
  "base_url": "http://localhost:8787",
  "user_id": "test-user-123"
}
```

### Variables de colección (generadas/configuradas)
```json
{
  "auth_code": "4/0AdQt8qi...",
  "google_auth_url": "https://accounts.google.com/oauth2/...",
  "error_type": "missing_header"
}
```

## ⚠️ Testing de errores

Usa **07 - Test de Errores Comunes** para verificar manejo de errores:

1. Configura `error_type` en variables:
   - `missing_header`: Sin header x-user-id
   - `invalid_user`: Usuario inexistente
   - `empty_user`: Header vacío
   - `malformed_user`: Header malformado

2. Ejecuta el request y verifica respuestas de error apropiadas

## 📊 Análisis automático

Los scripts incluidos automáticamente analizan las nuevas funcionalidades:

### Pre-request
- Validan variables requeridas
- Muestran instrucciones cuando faltan datos
- Configuran headers dinámicamente

### Post-response
- Registran información en consola
- Extraen datos útiles (URLs, códigos)
- **NUEVO**: Analizan múltiples calendarios y sus permisos
- **NUEVO**: Muestran distribución de eventos por calendario
- **NUEVO**: Estadísticas de calendarios consultados
- Verifican seguridad (no filtración de tokens)

### Tests
- Verifican códigos de estado HTTP
- Validan estructura de respuestas
- **NUEVO**: Verifican campos multi-calendario (`total_calendars`, `calendars`)
- **NUEVO**: Validan información de calendario en eventos
- **NUEVO**: Comprueban roles de acceso a calendarios
- Comprueban lógica de negocio
- Detectan problemas de seguridad

## 🚨 Solución de problemas comunes

### Error 401 - Unauthorized
```json
{
  "error": "Missing x-user-id header."
}
```
**Solución**: Verificar que `user_id` esté configurado en variables de entorno

### Error 404 - User not found
```json
{
  "error": "User not found in KV.",
  "user_id": "tu-usuario"
}
```
**Solución**: Completar flujo OAuth completo (pasos 2-5)

### Error 400 - Missing code
```json
{
  "error": "Missing `code` query parameter."
}
```
**Solución**: Copiar correctamente el código de autorización de Google

### Error 500 - Internal Server Error
**Posibles causas**:
- Tokens OAuth expirados
- Configuración incorrecta en Cloudflare
- API de Google no disponible

**Solución**: Revisar logs de Cloudflare Worker

## 📝 Tips de uso

### 1. Consola de Bruno
Mantén la consola abierta para ver:
- Logs automáticos de scripts
- URLs de autorización
- Análisis de eventos
- Mensajes de debug

### 2. Variables dinámicas
Las variables se actualizan automáticamente:
- `google_auth_url` después del paso 2
- Información de debug en cada request

### 3. Testing rápido
Para testing repetido:
1. Guarda un `user_id` ya autenticado
2. Salta directamente a endpoints 04-07 (lista + eventos + errores)
3. No necesitas repetir OAuth cada vez

### 4. Nuevas funcionalidades (v2.0.0)
**Multi-calendario**: Todos los endpoints de eventos consultan múltiples calendarios automáticamente
- Calendarios principales, compartidos, suscritos
- Eventos incluyen información del calendario origen
- Procesamiento paralelo para mejor rendimiento

**Logging verboso**: Sistema completo de debugging
- Request IDs únicos para seguimiento
- Logs estructurados en JSON  
- Redacción automática de datos sensibles

**Análisis enriquecido**: Scripts post-response mejorados
- Estadísticas de calendarios consultados
- Distribución de eventos por calendario
- Análisis de permisos y roles

### 5. Entornos múltiples
Configura diferentes entornos para:
- Local development
- Staging/testing
- Production
- Diferentes usuarios de prueba

## 🔐 Consideraciones de seguridad

### ❌ NO hacer
- Commitear `auth_code` en git
- Compartir tokens en screenshots
- Usar datos reales en development
- Hardcodear credentials

### ✅ Hacer
- Usar `user_id` únicos por entorno
- Limpiar variables sensibles después de testing
- Verificar que no se filtren tokens
- Usar HTTPS en producción

## 📚 Recursos adicionales

### Documentación
- Cada request incluye documentación completa en la pestaña "Docs"
- Ejemplos de respuestas esperadas
- Casos de uso específicos
- Troubleshooting detallado

### Archivos relacionados
- `bruno.json`: Configuración de colección y entornos
- `variables-ejemplo.json`: Ejemplos de configuración  
- `README.md`: Documentación detallada de la colección
- **NUEVO**: `04-calendar-list.bru`: Endpoint para listar calendarios
- **NUEVO**: Endpoints actualizados con soporte multi-calendario

### Cambios v2.0.0
- **BREAKING**: Estructura de respuesta de eventos cambió
- **AÑADIDO**: Endpoint `/calendar/list` 
- **MEJORADO**: Todos los eventos incluyen información de calendario origen
- **MEJORADO**: Logging verboso para debugging en producción

### Enlaces útiles
- [Bruno Documentation](https://docs.usebruno.com/)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [OAuth 2.0 Flow](https://developers.google.com/identity/protocols/oauth2)
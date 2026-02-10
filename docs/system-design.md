# Diseño del Sistema (SDD) – Calendar Worker

## 1. Descripción general

Calendar Worker es un Cloudflare Worker que actúa como puente multiusuario entre OpenClaw y Google Calendar. Expone endpoints HTTP para iniciar OAuth con Google, almacena de forma segura los `refresh_token` en Cloudflare KV y devuelve eventos diarios o semanales según el identificador enviado en el encabezado `x-user-id`. El servicio es stateless salvo por el almacenamiento en KV, por lo que escala de forma horizontal en la red global de Cloudflare.

## 2. Objetivos y alcances

### Objetivos
- Facilitar la integración de OpenClaw con Google Calendar mediante endpoints REST simples.
- Autenticar usuarios con OAuth 2.0 (access_type=offline, prompt=consent) para obtener `refresh_token`.
- Persistir credenciales por usuario en Cloudflare KV utilizando el encabezado `x-user-id` como clave.
- Consultar eventos del calendario primario para rangos “hoy” y “semana” con huso horario `America/Santiago`.
- Mantener el código modular, con dependencias mínimas y preparado para Wrangler.

### Fuera de alcance
- Crear o administrar el proyecto de Google Cloud o la pantalla de consentimiento.
- Interactuar con calendarios que no sean Google.
- Exponer operaciones de escritura (crear/editar/eliminar eventos).
- Manejar webhooks o notificaciones push.
- Proveer interfaces gráficas; toda interacción ocurre vía HTTP.

## 3. Arquitectura de alto nivel

```
OpenClaw ──HTTP──> Cloudflare Worker (Router)
                         │
                         ├── Módulo OAuth (intercambio de códigos y tokens)
                         ├── Módulo Calendar (consultas a Google Calendar)
                         ├── Módulo Users (persistencia en KV)
                         └── Cloudflare KV (namespace USERS_KV)
```

Las solicitudes llegan al edge de Cloudflare, el router determina el handler y los datos persistentes se obtienen o guardan en KV. Las únicas salidas externas son los endpoints de Google OAuth y Google Calendar, consumidos con `fetch` nativo.

## 4. Flujos principales

### 4.1 Alta OAuth (`GET /auth/google`)
1. OpenClaw invoca `/auth/google?user_id=<ID>`.
2. El Worker valida `user_id`, construye la URL de autorización de Google con `state` y `login_hint` igual al ID.
3. Responde con una redirección 302 hacia Google OAuth.

### 4.2 Callback OAuth (`GET /auth/callback`)
1. Google redirige con `code` (y `state`).
2. El Worker resuelve `user_id` desde `user_id`, `state` o encabezado `x-user-id`.
3. `oauth.exchangeCodeForTokens` intercambia `code` por tokens.
4. Se verifica la presencia de `refresh_token` y se guarda en KV a través de `users.saveUserToKV`.
5. Se retorna una respuesta JSON confirmando la vinculación.

### 4.3 Consulta de calendario (`GET /calendar/today` y `GET /calendar/week`)
1. El cliente envía `x-user-id`.
2. El Worker recupera al usuario con `users.getUserFromKV`; si no existe, responde 404.
3. `calendar.getTodayEvents` o `calendar.getWeekEvents` calcula el rango con `utils.getDateRange`, solicita un nuevo `access_token` mediante `oauth.getAccessToken` y consulta Google Calendar.
4. El Worker devuelve un payload con metadatos (timeframe, ventana de fechas, zona horaria) y los eventos.

## 5. Componentes y responsabilidades

| Archivo            | Rol clave                                                                 |
|--------------------|---------------------------------------------------------------------------|
| `src/index.ts`     | Router, validaciones de método, normalización de rutas y respuestas JSON. |
| `src/oauth.ts`     | Lógica para `exchangeCodeForTokens` y `getAccessToken`.                   |
| `src/calendar.ts`  | Construcción de ventanas temporales y llamadas a Google Calendar.         |
| `src/users.ts`     | Serialización, almacenamiento y validación de registros en KV.            |
| `src/utils.ts`     | Helpers (respuestas, redirects, fechas, query strings, timezone).         |
| `src/types.ts`     | Definiciones de tipos para Env, usuarios y respuestas de Google.          |

## 6. Modelo de datos

### Registro en KV (`USERS_KV`)
```json
{
  "refresh_token": "<google_refresh_token>",
  "provider": "google",
  "timezone": "America/Santiago",
  "created_at": "<ISO timestamp>"
}
```

- Clave: `user:<x-user-id>`.
- Se valida que `refresh_token`, `provider`, `timezone` y `created_at` existan.
- Solo se persiste información mínima; los `access_token` se generan bajo demanda.

## 7. Integraciones externas

### Google OAuth 2.0
- Endpoint de autorización: `https://accounts.google.com/o/oauth2/v2/auth`.
- Endpoint de tokens: `https://oauth2.googleapis.com/token`.
- Parámetros obligatorios: `scope=https://www.googleapis.com/auth/calendar`, `response_type=code`, `access_type=offline`, `prompt=consent`, `state=user_id`, `login_hint=user_id`, `redirect_uri`, `client_id`.
- Las credenciales (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`) se inyectan vía variables de Wrangler.

### Google Calendar API
- Endpoint: `https://www.googleapis.com/calendar/v3/calendars/primary/events`.
- Parámetros: `timeMin`, `timeMax`, `timeZone`, `singleEvents=true`, `orderBy=startTime`, `maxResults`.
- Autorización: encabezado `Authorization: Bearer <access_token>`.

## 8. Seguridad y manejo de errores

- Falta de `x-user-id` → `401 Unauthorized`.
- Usuario inexistente en KV → `404 Not Found`.
- Uso de `try/catch` global para encapsular errores inesperados.
- Los mensajes de error no exponen secretos ni detalles internos.
- Los secretos de Google nunca se devuelven al cliente.
- Los estados OAuth se igualan al `user_id` para simplificar la correlación.

## 9. Despliegue y configuración

- `wrangler.toml` define:
  - `name`, `main`, `compatibility_date`.
  - Variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`).
  - Binding KV `USERS_KV`.
- Scripts:
  - `pnpm dev` → `wrangler dev`.
  - `pnpm deploy` → `wrangler deploy`.
- `tsconfig.json` habilita ESNext, `strict` y tipos de Cloudflare Workers.
- `.gitignore` excluye dependencias, artefactos, archivos de entorno y carpetas de IDE.

## 10. Evolución futura

- Almacenar zonas horarias personalizadas por usuario.
- Añadir endpoints de lectura ampliada (p. ej. eventos por fecha arbitraria) o de escritura si se amplían los scopes.
- Integrar caché o rate limiting para mitigar cuotas de Google.
- Incorporar test automation con Miniflare o Workers Testing Framework.
- Añadir alertas/observabilidad (Workers Trace Events, logs centralizados).

Este SDD proporciona la base para mantener y extender Calendar Worker bajo un enfoque de diseño sistemático, asegurando que OpenClaw pueda consumirlo como herramienta HTTP confiable.
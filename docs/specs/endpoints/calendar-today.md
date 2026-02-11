# Especificación de Endpoint: GET /calendar/today

## 1. Resumen

Devuelve los eventos de **todos los calendarios accesibles** de Google para el día actual del usuario identificado por `x-user-id`. Incluye calendarios principales, secundarios, compartidos y suscritos. Utiliza el `refresh_token` almacenado en Cloudflare KV para obtener un `access_token` válido y consulta la API de Google Calendar respetando el huso horario definido para el usuario (por defecto `America/Santiago`).

## 2. Request

- **Método:** `GET`
- **Ruta:** `/calendar/today`
- **Headers requeridos:**
  - `x-user-id` (`string`): identificador único del usuario en OpenClaw; se usa como clave para recuperar sus credenciales desde KV.

- **Query params:** ninguno.

### Ejemplo

```
GET https://calendar-worker.hectordev.workers.dev/calendar/today
x-user-id: alice-123
```

## 3. Response

- **Tipo:** JSON (`application/json`).
- **Cuerpo:**
  ```json
  {
    "timeframe": "today",
    "window": {
      "label": "today",
      "timeMin": "2024-06-06T03:00:00.000Z",
      "timeMax": "2024-06-07T03:00:00.000Z"
    },
    "user_id": "alice-123",
    "timezone": "America/Santiago",
    "total_calendars": 3,
    "total_events": 2,
    "calendars": [
      {
        "id": "primary",
        "summary": "alice@example.com",
        "primary": true,
        "access_role": "owner"
      },
      {
        "id": "team@group.calendar.google.com",
        "summary": "Calendario del Equipo",
        "primary": false,
        "access_role": "writer"
      },
      {
        "id": "holidays@group.calendar.google.com",
        "summary": "Feriados en Chile",
        "primary": false,
        "access_role": "reader"
      }
    ],
    "events": [
      {
        "id": "evt-1",
        "calendar_id": "primary",
        "calendar_name": "alice@example.com",
        "calendar_color": "#9fc6e7",
        "summary": "Daily sync",
        "description": "Reunión diaria del equipo",
        "location": "Sala de conferencias",
        "html_link": "https://www.google.com/calendar/event?eid=...",
        "status": "confirmed",
        "start": { "dateTime": "2024-06-06T09:00:00-04:00" },
        "end": { "dateTime": "2024-06-06T09:30:00-04:00" },
        "attendees": [
          { "email": "bob@example.com", "responseStatus": "accepted" }
        ],
        "organizer": {
          "email": "alice@example.com",
          "displayName": "Alice Smith",
          "self": true
        },
        "creator": {
          "email": "alice@example.com",
          "displayName": "Alice Smith",
          "self": true
        }
      },
      {
        "id": "evt-2",
        "calendar_id": "holidays@group.calendar.google.com",
        "calendar_name": "Feriados en Chile",
        "calendar_color": "#0d7377",
        "summary": "Día de la Independencia",
        "description": null,
        "location": null,
        "html_link": "https://www.google.com/calendar/event?eid=...",
        "status": "confirmed",
        "start": { "date": "2024-09-18" },
        "end": { "date": "2024-09-19" },
        "attendees": null,
        "organizer": {
          "email": "holidays@group.calendar.google.com",
          "displayName": "Feriados en Chile"
        },
        "creator": {
          "email": "holidays@group.calendar.google.com",
          "displayName": "Feriados en Chile"
        }
      }
    ]
  }
  ```
- **Descripción de campos principales:**
  - `timeframe`: siempre `"today"` para este endpoint.
  - `window`: objeto con el rango RFC3339 calculado en UTC.
  - `user_id`: el mismo valor recibido en `x-user-id`.
  - `timezone`: zona horaria asociada al usuario (por defecto `America/Santiago`).
  - `total_calendars`: número total de calendarios accesibles al usuario.
  - `total_events`: número total de eventos encontrados en todos los calendarios.
  - `calendars`: arreglo con información resumida de cada calendario accesible.
  - `events`: arreglo con los eventos de todos los calendarios, ordenados por fecha/hora de inicio.

### Campos del objeto Calendar (en `calendars`)
  - `id`: ID único del calendario en Google.
  - `summary`: nombre/título del calendario.
  - `primary`: indica si es el calendario principal del usuario.
  - `access_role`: nivel de acceso (`owner`, `writer`, `reader`).

### Campos del objeto Event (en `events`)
  - `id`: ID único del evento.
  - `calendar_id`: ID del calendario al que pertenece el evento.
  - `calendar_name`: nombre legible del calendario.
  - `calendar_color`: color de fondo del calendario (hex).
  - `summary`: título del evento.
  - `description`: descripción del evento (puede ser null).
  - `location`: ubicación del evento (puede ser null).
  - `html_link`: enlace directo al evento en Google Calendar.
  - `status`: estado del evento (`confirmed`, `tentative`, `cancelled`).
  - `start`/`end`: fecha/hora de inicio y fin (formato RFC3339).
  - `attendees`: lista de asistentes (puede ser null).
  - `organizer`: organizador del evento.
  - `creator`: creador del evento.

## 4. Errores

| Código | Mensaje                                       | Descripción                                                                                                              |
|--------|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| 401    | `Missing x-user-id header.`                   | No se envió el encabezado requerido; el Worker no puede identificar al usuario.                                         |
| 404    | `User not found in KV.`                       | No existe un registro en Cloudflare KV para el `x-user-id` proporcionado.                                               |
| 500    | `Unexpected error while processing the request.` | Fallo inesperado (por ejemplo, error al obtener tokens o al llamar a Google). Se incluye `error.details.message` con pistas. |

## 5. Notas y dependencias

- El usuario debe haber completado previamente el flujo de `/auth/google` y `/auth/callback` para contar con un `refresh_token` almacenado.
- El endpoint intercambia el `refresh_token` por un `access_token` en cada llamada; no almacena tokens de acceso en KV.
- El rango "today" se calcula con `utils.getDateRange("today")`, respetando la zona horaria del usuario. `timeMin` y `timeMax` están expresados en UTC para cumplir con los requisitos de la API de Google.
- **Multi-calendario**: El worker obtiene primero la lista de calendarios accesibles, luego consulta eventos de cada uno en paralelo.
- Solo se incluyen calendarios con permisos de `reader` o superior (`writer`, `owner`).
- Los eventos se limitan a 500 por calendario y se ordenan globalmente por hora de inicio.
- Si algún calendario individual falla (permisos, error temporal), se registra en logs pero no interrumpe la consulta de otros calendarios.
- Los eventos de todo el día aparecen con campo `date` en lugar de `dateTime`.
- Para ver solo la lista de calendarios disponibles, usar `/calendar/list`.
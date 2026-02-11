# Especificación de Endpoint: GET /calendar/week

## 1. Resumen

Entrega los eventos de **todos los calendarios accesibles** de Google correspondientes a la semana calendarizada actual del usuario identificado por `x-user-id`. Incluye calendarios principales, secundarios, compartidos y suscritos. Al igual que en `/calendar/today`, se obtiene un `access_token` efímero a partir del `refresh_token` guardado en Cloudflare KV y se consulta la API de Google Calendar respetando el huso horario configurado (por defecto `America/Santiago`). El rango semanal cubre de lunes 00:00 a domingo 23:59:59 en la zona horaria del usuario.

## 2. Request

- **Método:** `GET`
- **Ruta:** `/calendar/week`
- **Headers requeridos:**
  - `x-user-id` (`string`): identificador del usuario en OpenClaw.

- **Query params:** no aplica.

### Ejemplo

```
GET https://calendar-worker.hectordev.workers.dev/calendar/week
x-user-id: alice-123
```

## 3. Response

- **Tipo:** JSON (`application/json`).
- **Cuerpo:**
  ```json
  {
    "timeframe": "week",
    "window": {
      "label": "week",
      "timeMin": "2024-06-03T03:00:00.000Z",
      "timeMax": "2024-06-10T03:00:00.000Z"
    },
    "user_id": "alice-123",
    "timezone": "America/Santiago",
    "total_calendars": 4,
    "total_events": 3,
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
      },
      {
        "id": "project@group.calendar.google.com",
        "summary": "Proyecto ABC",
        "primary": false,
        "access_role": "reader"
      }
    ],
    "events": [
      {
        "id": "evt-42",
        "calendar_id": "primary",
        "calendar_name": "alice@example.com",
        "calendar_color": "#9fc6e7",
        "summary": "Sprint planning",
        "description": "Planificación semanal del sprint",
        "location": "Sala virtual",
        "html_link": "https://www.google.com/calendar/event?eid=...",
        "status": "confirmed",
        "start": { "dateTime": "2024-06-04T10:00:00-04:00" },
        "end": { "dateTime": "2024-06-04T11:00:00-04:00" },
        "attendees": [
          { "email": "team@example.com", "responseStatus": "accepted" }
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
        "id": "evt-43",
        "calendar_id": "team@group.calendar.google.com",
        "calendar_name": "Calendario del Equipo",
        "calendar_color": "#7986cb",
        "summary": "Reunión de equipo",
        "description": null,
        "location": "Oficina",
        "html_link": "https://www.google.com/calendar/event?eid=...",
        "status": "confirmed",
        "start": { "dateTime": "2024-06-05T15:00:00-04:00" },
        "end": { "dateTime": "2024-06-05T16:00:00-04:00" },
        "attendees": null,
        "organizer": {
          "email": "team@group.calendar.google.com",
          "displayName": "Equipo"
        },
        "creator": {
          "email": "bob@example.com",
          "displayName": "Bob Johnson"
        }
      },
      {
        "id": "evt-44",
        "calendar_id": "holidays@group.calendar.google.com",
        "calendar_name": "Feriados en Chile",
        "calendar_color": "#0d7377",
        "summary": "Día del Trabajo",
        "description": null,
        "location": null,
        "html_link": "https://www.google.com/calendar/event?eid=...",
        "status": "confirmed",
        "start": { "date": "2024-05-01" },
        "end": { "date": "2024-05-02" },
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
  - `timeframe`: siempre `week` para este endpoint.
  - `window.timeMin` / `window.timeMax`: delimitan la semana completa en formato RFC3339 (UTC).
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
| 401    | `Missing x-user-id header.`                   | No se envió el encabezado requerido para identificar al usuario.                                                         |
| 404    | `User not found in KV.`                       | No existe un registro asociado a `x-user-id` en Cloudflare KV (el usuario no ha completado el flujo OAuth).             |
| 500    | `Unexpected error while processing the request.` | Error inesperado (fallo al obtener tokens, respuesta inválida de Google, etc.). Se adjunta `error.details.message`.     |

## 5. Notas y dependencias

- El usuario debe haber pasado por `/auth/google` y `/auth/callback` para contar con `refresh_token` persistido.
- El rango semanal se calcula con `utils.getDateRange("week")`, considerando lunes como primer día y utilizando la zona horaria guardada para el usuario.
- **Multi-calendario**: El worker obtiene primero la lista de calendarios accesibles, luego consulta eventos de cada uno en paralelo.
- Solo se incluyen calendarios con permisos de `reader` o superior (`writer`, `owner`).
- Los eventos se limitan a 500 por calendario y se ordenan globalmente por hora de inicio.
- Si algún calendario individual falla (permisos, error temporal), se registra en logs pero no interrumpe la consulta de otros calendarios.
- Los eventos de todo el día aparecen con campo `date` en lugar de `dateTime`.
- Para ver solo la lista de calendarios disponibles, usar `/calendar/list`.
- Este endpoint no permite filtrar por estado del evento ni por asistentes; cualquier lógica adicional debe implementarse por el consumidor tras recibir la respuesta.
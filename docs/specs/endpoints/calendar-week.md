# Especificación de Endpoint: GET /calendar/week

## 1. Resumen

Entrega los eventos del calendario primario de Google correspondientes a la semana calendarizada actual del usuario identificado por `x-user-id`. Al igual que en `/calendar/today`, se obtiene un `access_token` efímero a partir del `refresh_token` guardado en Cloudflare KV y se consulta la API de Google Calendar respetando el huso horario configurado (por defecto `America/Santiago`). El rango semanal cubre de lunes 00:00 a domingo 23:59:59 en la zona horaria del usuario.

## 2. Request

- **Método:** `GET`
- **Ruta:** `/calendar/week`
- **Headers requeridos:**
  - `x-user-id` (`string`): identificador del usuario en OpenClaw.

- **Query params:** no aplica.

### Ejemplo

```
GET https://calendar-worker.example.com/calendar/week
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
    "events": [
      {
        "id": "evt-42",
        "summary": "Sprint planning",
        "start": { "dateTime": "2024-06-04T10:00:00-04:00" },
        "end": { "dateTime": "2024-06-04T11:00:00-04:00" },
        "htmlLink": "https://www.google.com/calendar/event?eid=..."
      }
    ]
  }
  ```
- **Campos clave:**
  - `timeframe`: siempre `week`.
  - `window.timeMin` / `window.timeMax`: delimitan la semana completa en formato RFC3339 (UTC).
  - `events`: arreglo con los eventos devueltos por Google Calendar; se preservan los atributos estándar (`id`, `summary`, `description`, `start`, `end`, `attendees`, etc.).

## 4. Errores

| Código | Mensaje                                       | Descripción                                                                                                              |
|--------|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| 401    | `Missing x-user-id header.`                   | No se envió el encabezado requerido para identificar al usuario.                                                         |
| 404    | `User not found in KV.`                       | No existe un registro asociado a `x-user-id` en Cloudflare KV (el usuario no ha completado el flujo OAuth).             |
| 500    | `Unexpected error while processing the request.` | Error inesperado (fallo al obtener tokens, respuesta inválida de Google, etc.). Se adjunta `error.details.message`.     |

## 5. Notas y dependencias

- El usuario debe haber pasado por `/auth/google` y `/auth/callback` para contar con `refresh_token` persistido.
- El rango semanal se calcula con `utils.getDateRange("week")`, considerando lunes como primer día y utilizando la zona horaria guardada para el usuario.
- Se consulta `calendar.primary` con `singleEvents=true`, `orderBy=startTime` y `maxResults=500`. Si se requiere paginar o consultar otro calendario, se deberá definir un endpoint adicional con parámetros específicos.
- Este endpoint no permite filtrar por estado del evento ni por asistentes; cualquier lógica adicional debe implementarse por el consumidor tras recibir la respuesta.
# Especificación de Endpoint: GET /calendar/today

## 1. Resumen

Devuelve los eventos del calendario primario de Google para el día actual del usuario identificado por `x-user-id`. Utiliza el `refresh_token` almacenado en Cloudflare KV para obtener un `access_token` válido y consulta la API de Google Calendar respetando el huso horario definido para el usuario (por defecto `America/Santiago`).

## 2. Request

- **Método:** `GET`
- **Ruta:** `/calendar/today`
- **Headers requeridos:**
  - `x-user-id` (`string`): identificador único del usuario en OpenClaw; se usa como clave para recuperar sus credenciales desde KV.

- **Query params:** ninguno.

### Ejemplo

```
GET https://calendar-worker.example.com/calendar/today
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
    "events": [
      {
        "id": "evt-1",
        "summary": "Daily sync",
        "start": { "dateTime": "2024-06-06T09:00:00-04:00" },
        "end": { "dateTime": "2024-06-06T09:30:00-04:00" },
        "htmlLink": "https://www.google.com/calendar/event?eid=..."
      }
    ]
  }
  ```
- **Descripción de campos principales:**
  - `timeframe`: siempre `"today"` para este endpoint.
  - `window`: objeto con el rango RFC3339 calculado en UTC.
  - `user_id`: el mismo valor recibido en `x-user-id`.
  - `timezone`: zona horaria asociada al usuario (por defecto `America/Santiago`).
  - `events`: arreglo con los eventos devueltos por Google Calendar (se preservan campos estándar como `id`, `summary`, `start`, `end`, `htmlLink`, `attendees`, etc.).

## 4. Errores

| Código | Mensaje                                       | Descripción                                                                                                              |
|--------|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| 401    | `Missing x-user-id header.`                   | No se envió el encabezado requerido; el Worker no puede identificar al usuario.                                         |
| 404    | `User not found in KV.`                       | No existe un registro en Cloudflare KV para el `x-user-id` proporcionado.                                               |
| 500    | `Unexpected error while processing the request.` | Fallo inesperado (por ejemplo, error al obtener tokens o al llamar a Google). Se incluye `error.details.message` con pistas. |

## 5. Notas y dependencias

- El usuario debe haber completado previamente el flujo de `/auth/google` y `/auth/callback` para contar con un `refresh_token` almacenado.
- El endpoint intercambia el `refresh_token` por un `access_token` en cada llamada; no almacena tokens de acceso en KV.
- El rango “today” se calcula con `utils.getDateRange("today")`, respetando la zona horaria del usuario. `timeMin` y `timeMax` están expresados en UTC para cumplir con los requisitos de la API de Google.
- Los resultados se limitan a 500 eventos y se ordenan por hora de inicio (`orderBy=startTime`, `singleEvents=true`).
- En caso de necesitar filtros adicionales (por ejemplo, calendario alternativo o paginación), se deben crear nuevos endpoints derivados documentados en este mismo directorio.
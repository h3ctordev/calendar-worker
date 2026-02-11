# GET /calendar/list

## Descripción
Obtiene la lista completa de calendarios accesibles para el usuario autenticado, incluyendo calendarios principales, secundarios, compartidos y suscritos.

## Autenticación
- **Header requerido**: `x-user-id` - Identificador único del usuario
- **OAuth**: El usuario debe haber completado el flujo OAuth con Google Calendar

## Request

### Headers
```http
x-user-id: string (requerido)
```

### Ejemplo de Request
```http
GET /calendar/list HTTP/1.1
Host: calendar-worker.hectordev.workers.dev
x-user-id: usuario123
```

## Response

### Éxito (200 OK)
```json
{
  "user_id": "usuario123",
  "timezone": "America/Santiago", 
  "total_calendars": 4,
  "calendars": [
    {
      "id": "primary",
      "summary": "usuario@example.com",
      "description": null,
      "timezone": "America/Santiago",
      "access_role": "owner",
      "primary": true,
      "color": {
        "background": "#9fc6e7",
        "foreground": "#000000"
      },
      "selected": true
    },
    {
      "id": "calendario123@group.calendar.google.com",
      "summary": "Calendario del Equipo",
      "description": "Eventos del equipo de desarrollo",
      "timezone": "America/Santiago",
      "access_role": "writer",
      "primary": false,
      "color": {
        "background": "#7986cb",
        "foreground": "#ffffff"
      },
      "selected": true
    },
    {
      "id": "holidays@group.calendar.google.com", 
      "summary": "Feriados en Chile",
      "description": null,
      "timezone": "America/Santiago",
      "access_role": "reader",
      "primary": false,
      "color": {
        "background": "#0d7377",
        "foreground": "#ffffff"
      },
      "selected": false
    },
    {
      "id": "compartido456@group.calendar.google.com",
      "summary": "Reuniones Cliente ABC",
      "description": "Calendario compartido con cliente",
      "timezone": "America/New_York",
      "access_role": "reader", 
      "primary": false,
      "color": {
        "background": "#d50000",
        "foreground": "#ffffff"
      },
      "selected": true
    }
  ]
}
```

### Error - Usuario no autenticado (401)
```json
{
  "error": {
    "message": "Missing x-user-id header."
  }
}
```

### Error - Usuario no encontrado (404)
```json
{
  "error": {
    "message": "User not found in KV.",
    "details": {
      "user_id": "usuario123"
    }
  }
}
```

### Error - Token expirado/inválido (500)
```json
{
  "error": {
    "message": "Unexpected error while processing the request.",
    "details": {
      "message": "Google OAuth error: invalid_grant - Token has been expired or revoked."
    }
  }
}
```

## Campos de Response

### Nivel raíz
- `user_id` (string): ID del usuario que hizo la solicitud
- `timezone` (string): Zona horaria del usuario configurada
- `total_calendars` (number): Número total de calendarios accesibles
- `calendars` (array): Lista de calendarios del usuario

### Objeto Calendar
- `id` (string): ID único del calendario en Google
- `summary` (string): Nombre/título del calendario
- `description` (string|null): Descripción opcional del calendario
- `timezone` (string): Zona horaria específica del calendario
- `access_role` (string): Nivel de acceso del usuario
  - `"owner"`: Propietario del calendario
  - `"writer"`: Puede crear/editar eventos
  - `"reader"`: Solo lectura
  - `"freeBusyReader"`: Solo información de disponibilidad
- `primary` (boolean): Indica si es el calendario principal del usuario
- `color` (object): Colores del calendario
  - `background` (string): Color de fondo (hex)
  - `foreground` (string): Color de texto (hex)
- `selected` (boolean): Si está seleccionado por defecto en Google Calendar

## Casos de Uso

### 1. Listar todos los calendarios disponibles
Útil para mostrar al usuario qué calendarios están disponibles antes de consultar eventos específicos.

### 2. Identificar calendarios por tipo de acceso
Filtrar calendarios según permisos (solo lectura vs. escritura) para funcionalidades diferentes.

### 3. Mostrar información visual
Usar los colores y nombres de calendarios para presentar una interfaz coherente con Google Calendar.

### 4. Detectar calendarios compartidos
Identificar calendarios compartidos o suscritos (access_role != "owner").

## Notas Técnicas

- Los calendarios se devuelven en el orden determinado por la API de Google Calendar
- Solo se incluyen calendarios con acceso `reader` o superior
- Los calendarios ocultos o no seleccionados se incluyen pero con `selected: false`
- El campo `primary` solo es `true` para el calendario principal del usuario
- La zona horaria puede variar entre calendarios (ej: calendarios internacionales)

## Logs Generados

Este endpoint genera logs estructurados para debugging:

```json
{
  "level": "INFO",
  "message": "Calendar list retrieved successfully",
  "action": "get_calendar_list", 
  "userId": "usuario123",
  "calendarCount": 4,
  "timestamp": "2026-02-10T15:30:45.123Z"
}
```

## Ejemplos de Integración

### cURL
```bash
curl -H "x-user-id: usuario123" \
     https://calendar-worker.hectordev.workers.dev/calendar/list
```

### JavaScript/Fetch
```javascript
const response = await fetch('/calendar/list', {
  headers: {
    'x-user-id': 'usuario123'
  }
});
const data = await response.json();
console.log(`Usuario tiene ${data.total_calendars} calendarios`);
```

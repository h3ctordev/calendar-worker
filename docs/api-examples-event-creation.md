# Ejemplos de API - Creación de Eventos

Este documento proporciona ejemplos prácticos de uso del endpoint de creación de eventos del calendar-worker. Para la especificación técnica completa, consultar el Software Design Document correspondiente.

## Casos de Uso Comunes

### 1. Reunión de Trabajo Básica

**Request:**
```http
POST /calendar/events HTTP/1.1
Host: calendar-worker.hectordev.workers.dev
Content-Type: application/json
x-user-id: usuario123

{
  "calendar_id": "primary",
  "event_type": "meeting",
  "summary": "Reunión con cliente ABC",
  "description": "Discusión de propuesta comercial Q2",
  "location": "Sala de conferencias A",
  "start": {
    "dateTime": "2024-03-20T14:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "end": {
    "dateTime": "2024-03-20T15:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "attendees": [
    { "email": "cliente@abc.com" },
    { "email": "sales@mycompany.com" }
  ],
  "reminders": {
    "useDefault": false,
    "overrides": [
      { "method": "email", "minutes": 60 },
      { "method": "popup", "minutes": 15 }
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "id": "evento_abc123xyz",
  "status": "confirmed",
  "html_link": "https://www.google.com/calendar/event?eid=...",
  "created": "2024-03-15T08:30:00.000Z",
  "updated": "2024-03-15T08:30:00.000Z",
  "summary": "Reunión con cliente ABC",
  "start": {
    "dateTime": "2024-03-20T14:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "end": {
    "dateTime": "2024-03-20T15:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "calendar_info": {
    "calendar_id": "primary",
    "calendar_name": "usuario123@example.com",
    "calendar_color": "#9fc6e7"
  },
  "event_metadata": {
    "event_type": "meeting",
    "created_by_worker": true,
    "worker_version": "2.1.0"
  }
}
```

### 2. Evento Recurrente (Standup Diario)

**Request:**
```http
POST /calendar/events HTTP/1.1
Host: calendar-worker.hectordev.workers.dev
Content-Type: application/json
x-user-id: usuario123

{
  "calendar_id": "team@group.calendar.google.com",
  "event_type": "standup",
  "summary": "Daily Standup",
  "description": "Reunión diaria del equipo de desarrollo",
  "location": "Sala virtual - Google Meet",
  "start": {
    "dateTime": "2024-03-15T09:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "end": {
    "dateTime": "2024-03-15T09:30:00-03:00",
    "timeZone": "America/Santiago"
  },
  "recurrence": [
    "RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;COUNT=20"
  ],
  "attendees": [
    { "email": "dev1@example.com" },
    { "email": "dev2@example.com" },
    { "email": "scrum-master@example.com" }
  ]
}
```

### 3. Evento de Todo el Día (Vacaciones)

**Request:**
```http
POST /calendar/events HTTP/1.1
Host: calendar-worker.hectordev.workers.dev
Content-Type: application/json
x-user-id: usuario123

{
  "calendar_id": "primary",
  "event_type": "vacation",
  "summary": "Vacaciones de verano",
  "description": "Tiempo libre - No disponible para reuniones",
  "start": {
    "date": "2024-06-15"
  },
  "end": {
    "date": "2024-06-30"
  },
  "status": "confirmed",
  "visibility": "public"
}
```

### 4. Bloqueo de Tiempo Personal

**Request:**
```http
POST /calendar/events HTTP/1.1
Host: calendar-worker.hectordev.workers.dev
Content-Type: application/json
x-user-id: usuario123

{
  "calendar_id": "primary",
  "event_type": "blocked-time",
  "summary": "Tiempo de trabajo profundo",
  "description": "Enfoque en desarrollo sin interrupciones",
  "start": {
    "dateTime": "2024-03-21T09:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "end": {
    "dateTime": "2024-03-21T11:00:00-03:00",
    "timeZone": "America/Santiago"
  },
  "visibility": "private",
  "status": "confirmed"
}
```

### 5. Hito de Proyecto

**Request:**
```http
POST /calendar/events HTTP/1.1
Host: calendar-worker.hectordev.workers.dev
Content-Type: application/json
x-user-id: usuario123

{
  "calendar_id": "project@group.calendar.google.com",
  "event_type": "milestone",
  "summary": "Entrega MVP v1.0",
  "description": "Entrega de la primera versión funcional del MVP",
  "start": {
    "date": "2024-04-01"
  },
  "end": {
    "date": "2024-04-02"
  },
  "attendees": [
    { "email": "project-manager@example.com" },
    { "email": "tech-lead@example.com" }
  ]
}
```

## Ejemplos de Respuestas de Error

### Error de Validación (400 Bad Request)

```json
{
  "error": {
    "message": "Invalid request data.",
    "details": {
      "validation_errors": [
        {
          "field": "summary",
          "message": "Summary is required and cannot be empty"
        },
        {
          "field": "start.dateTime",
          "message": "Start time must be before end time"
        },
        {
          "field": "event_type",
          "message": "Invalid event type. Must be one of: meeting, presentation, workshop, etc."
        }
      ]
    }
  }
}
```

### Error de Permisos (403 Forbidden)

```json
{
  "error": {
    "message": "Insufficient permissions to create events in this calendar.",
    "details": {
      "calendar_id": "readonly@group.calendar.google.com",
      "required_permission": "writer",
      "current_permission": "reader"
    }
  }
}
```

### Error de Conflicto (409 Conflict)

```json
{
  "error": {
    "message": "Time slot conflict detected.",
    "details": {
      "conflicting_events": [
        {
          "id": "existing_event_123",
          "summary": "Reunión existente",
          "start": "2024-03-15T09:30:00-03:00",
          "end": "2024-03-15T10:00:00-03:00"
        }
      ],
      "calendar_id": "primary"
    }
  }
}
```

## Ejemplos con cURL

### Evento Básico
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-user-id: usuario123" \
  -d '{
    "calendar_id": "primary",
    "event_type": "meeting",
    "summary": "Nueva reunión",
    "start": {
      "dateTime": "2024-03-20T14:00:00-03:00",
      "timeZone": "America/Santiago"
    },
    "end": {
      "dateTime": "2024-03-20T15:00:00-03:00",
      "timeZone": "America/Santiago"
    }
  }' \
  https://calendar-worker.hectordev.workers.dev/calendar/events
```

### Evento Recurrente
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-user-id: usuario123" \
  -d '{
    "calendar_id": "primary",
    "event_type": "standup",
    "summary": "Daily Standup",
    "start": {
      "dateTime": "2024-03-15T09:00:00-03:00",
      "timeZone": "America/Santiago"
    },
    "end": {
      "dateTime": "2024-03-15T09:30:00-03:00",
      "timeZone": "America/Santiago"
    },
    "recurrence": ["RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"]
  }' \
  https://calendar-worker.hectordev.workers.dev/calendar/events
```

## Ejemplos con JavaScript/Fetch

### Función de Creación de Eventos
```javascript
async function createEvent(eventData, userId) {
  try {
    const response = await fetch('/calendar/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.error.message}`);
    }

    const event = await response.json();
    return event;
  } catch (error) {
    console.error('Failed to create event:', error);
    throw error;
  }
}

// Uso de la función
const eventData = {
  calendar_id: 'primary',
  event_type: 'meeting',
  summary: 'Reunión con cliente',
  start: {
    dateTime: '2024-03-20T14:00:00-03:00',
    timeZone: 'America/Santiago'
  },
  end: {
    dateTime: '2024-03-20T15:00:00-03:00',
    timeZone: 'America/Santiago'
  },
  attendees: [
    { email: 'cliente@example.com' }
  ]
};

createEvent(eventData, 'usuario123')
  .then(event => {
    console.log('Evento creado:', event.id);
    console.log('Link del evento:', event.html_link);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

## Validaciones de Entrada

### Campos Requeridos
- `calendar_id`: ID válido de calendario accesible
- `summary`: Título del evento (1-1024 caracteres)
- `start`: Fecha/hora de inicio válida
- `end`: Fecha/hora de fin válida (posterior a start)
- `event_type`: Tipo de evento de la lista soportada

### Tipos de Eventos Válidos
- **Trabajo**: meeting, presentation, workshop, conference-call, review, planning, standup
- **Personal**: appointment, personal, family, social, travel, vacation
- **Proyecto**: deadline, milestone, launch, deployment
- **Especial**: all-day, recurring, reminder, blocked-time

### Formatos de Fecha Válidos

**Con hora específica:**
```json
{
  "dateTime": "2024-03-15T09:00:00-03:00",
  "timeZone": "America/Santiago"
}
```

**Todo el día:**
```json
{
  "date": "2024-03-15"
}
```

## Límites y Restricciones

- **Duración máxima**: 24 horas (excepto eventos de todo el día)
- **Asistentes máximos**: 100 por evento
- **Longitud del título**: 1024 caracteres máximo
- **Eventos por día**: 1000 por usuario
- **Timeout de respuesta**: 5 segundos máximo

## Códigos de Respuesta HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 201 | Created | Evento creado exitosamente |
| 400 | Bad Request | Datos de entrada inválidos |
| 401 | Unauthorized | Header x-user-id faltante o inválido |
| 403 | Forbidden | Permisos insuficientes en calendario |
| 404 | Not Found | Usuario o calendario no encontrado |
| 409 | Conflict | Conflicto de horario detectado |
| 422 | Unprocessable Entity | Error de validación de reglas de negocio |
| 500 | Internal Server Error | Error del servidor o API de Google |
# Ejemplos de `curl` para Calendar Worker

Todos los endpoints requieren el Worker desplegado en `https://calendar-worker.hectordev.workers.dev` (o tu dominio personalizado). Recuerda:

- Los endpoints `/calendar/*` exigen el header `x-user-id`.
- Para uso local, puedes apuntar a `http://127.0.0.1:8787/...`.
- Antes de llamar a los endpoints de calendario, el usuario debe haber completado el flujo OAuth (`/auth/google` → `/auth/callback`).
- Ahora todos los endpoints de calendario devuelven eventos de **múltiples calendarios** (principal, compartidos, suscritos).

---

## 1. Iniciar flujo OAuth

```bash
curl -i "https://calendar-worker.hectordev.workers.dev/auth/google?user_id=alice-123"
```

La respuesta será una redirección (`302`) hacia Google OAuth. Abre la URL en el navegador para completar el consentimiento.

---

## 2. Callback de OAuth (solo para pruebas manuales)

Normalmente Google redirige automáticamente al usuario, pero puedes simularlo:

```bash
curl -i "https://calendar-worker.hectordev.workers.dev/auth/callback?code=CODIGO_DE_GOOGLE&state=alice-123"
```

Debes reemplazar `CODIGO_DE_GOOGLE` con el valor real obtenido tras aprobar el consentimiento.

---

## 3. Listar calendarios disponibles

```bash
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/list" | jq
```

**Respuesta esperada:**
```json
{
  "user_id": "alice-123",
  "timezone": "America/Santiago",
  "total_calendars": 3,
  "calendars": [
    {
      "id": "primary",
      "summary": "alice@example.com",
      "access_role": "owner",
      "primary": true,
      "color": {
        "background": "#9fc6e7",
        "foreground": "#000000"
      }
    },
    {
      "id": "team@group.calendar.google.com",
      "summary": "Calendario del Equipo",
      "access_role": "writer",
      "primary": false
    }
  ]
}
```

---

## 4. Consultar eventos de hoy (todos los calendarios)

```bash
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/today" | jq
```

**Respuesta esperada:**
```json
{
  "timeframe": "today",
  "user_id": "alice-123",
  "timezone": "America/Santiago",
  "total_calendars": 3,
  "total_events": 2,
  "calendars": [...],
  "events": [
    {
      "id": "evt-1",
      "calendar_id": "primary",
      "calendar_name": "alice@example.com",
      "calendar_color": "#9fc6e7",
      "summary": "Reunión diaria",
      "start": { "dateTime": "2024-06-06T09:00:00-04:00" },
      "end": { "dateTime": "2024-06-06T09:30:00-04:00" }
    }
  ]
}
```

---

## 5. Consultar eventos de la semana (todos los calendarios)

```bash
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/week" | jq
```

**Nota:** Similar estructura que `/today` pero con `"timeframe": "week"` y eventos de toda la semana.

---

## 6. Filtrar eventos por calendario específico

Para mostrar solo eventos de calendarios específicos, puedes filtrar la respuesta con `jq`:

```bash
# Solo eventos del calendario principal
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/today" \
  | jq '.events[] | select(.calendar_id == "primary")'

# Solo eventos de calendarios compartidos (no principal)
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/today" \
  | jq '.events[] | select(.calendar_id != "primary")'

# Contar eventos por calendario
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/today" \
  | jq 'group_by(.events[].calendar_id) | map({calendar: .[0].events[0].calendar_name, count: length})'
```

---

## 7. Validar manejo de errores

### 7.1 Sin `x-user-id`
```bash
curl -i "https://calendar-worker.hectordev.workers.dev/calendar/today"
```

### 7.2 Usuario inexistente
```bash
curl -i \
  -H "x-user-id: user-no-registrado" \
  "https://calendar-worker.hectordev.workers.dev/calendar/today"
```

---

## 8. Ejemplos avanzados con logging verboso

Para debugging en desarrollo, puedes ver los logs detallados:

```bash
# En una terminal, inicia el modo desarrollo
pnpm dev

# En otra terminal, haz requests y verás logs detallados
curl -s -H "x-user-id: alice-123" "http://127.0.0.1:8788/calendar/today"
```

Los logs mostrarán:
- Llamadas HTTP a Google APIs (OAuth y Calendar)
- Tiempos de respuesta 
- Operaciones KV (lectura/escritura de usuarios)
- Errores detallados con contexto

---

## Notas finales

- **Multi-calendario**: Todos los endpoints de eventos ahora consultan múltiples calendarios automáticamente.
- **Rendimiento**: Las llamadas a múltiples calendarios se hacen en paralelo para optimizar latencia.
- **Tolerancia a fallos**: Si un calendario individual falla, los otros calendarios se procesan normalmente.
- Ajusta la URL base según tu despliegue (por defecto `https://calendar-worker.hectordev.workers.dev`, o tu dominio personalizado).
- Para trabajar en local (`wrangler dev`), sustituye la URL por `http://127.0.0.1:8788`.
- Si deseas automatizar estas pruebas en scripts, administra los secretos via `.dev.vars` y `wrangler secret` siguiendo la guía `docs/guides/secrets-wrangler.md`.
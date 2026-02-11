# Ejemplos de `curl` para Calendar Worker

Todos los endpoints requieren el Worker desplegado en `https://calendar-worker.hectordev.workers.dev` (o tu dominio personalizado). Recuerda:

- Los endpoints `/calendar/*` exigen el header `x-user-id`.
- Para uso local, puedes apuntar a `http://127.0.0.1:8787/...`.
- Antes de llamar a los endpoints de calendario, el usuario debe haber completado el flujo OAuth (`/auth/google` → `/auth/callback`).

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

## 3. Consultar eventos de hoy

```bash
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/today" | jq
```

---

## 4. Consultar eventos de la semana

```bash
curl -s \
  -H "x-user-id: alice-123" \
  "https://calendar-worker.hectordev.workers.dev/calendar/week" | jq
```

---

## 5. Validar manejo de errores

### 5.1 Sin `x-user-id`
```bash
curl -i "https://calendar-worker.hectordev.workers.dev/calendar/today"
```

### 5.2 Usuario inexistente
```bash
curl -i \
  -H "x-user-id: user-no-registrado" \
  "https://calendar-worker.hectordev.workers.dev/calendar/today"
```

---

## Notas finales

- Ajusta la URL base según tu despliegue (por defecto `https://calendar-worker.hectordev.workers.dev`, o tu dominio personalizado).
- Para trabajar en local (`wrangler dev`), sustituye la URL por `http://127.0.0.1:8787`.
- Si deseas automatizar estas pruebas en scripts, administra los secretos via `.dev.vars` y `wrangler secret` siguiendo la guía `docs/guides/secrets-wrangler.md`.
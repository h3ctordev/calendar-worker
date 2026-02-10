# Especificación de Endpoint: GET /auth/google

## 1. Resumen

Inicia el flujo de autenticación OAuth 2.0 con Google Calendar para un usuario específico de OpenClaw. Su objetivo es redirigir al navegador del usuario hacia la pantalla de consentimiento de Google con los parámetros adecuados para obtener acceso offline y un `refresh_token`.

## 2. Request

- **Método:** `GET`
- **Ruta:** `/auth/google`
- **Headers requeridos:** ninguno.
- **Query params obligatorios:**
  - `user_id` (`string`): identificador único del usuario dentro de OpenClaw. Se usa para asociar el `refresh_token` en Cloudflare KV y se inyecta en los parámetros `state` y `login_hint` de Google.

- **Query params opcionales:**
  - `state` (`string`): valor personalizado para correlacionar el flujo OAuth. Si se omite, el Worker usa el mismo `user_id` como `state`.

### Ejemplo de llamada

```
GET https://calendar-worker.example.com/auth/google?user_id=alice-123
```

## 3. Response

- **Tipo:** redirección HTTP (`302 Found`).
- **Headers:**
  - `Location`: URL firmada de Google (`https://accounts.google.com/o/oauth2/v2/auth?...`) con los parámetros siguientes:
    - `client_id`: `GOOGLE_CLIENT_ID` configurado en Wrangler.
    - `redirect_uri`: `GOOGLE_REDIRECT_URI`.
    - `response_type`: `code`.
    - `scope`: `https://www.googleapis.com/auth/calendar`.
    - `access_type`: `offline`.
    - `prompt`: `consent`.
    - `state`: valor recibido o `user_id` si no se proporcionó.
    - `login_hint`: `user_id`.

El cuerpo de la respuesta es vacío.

### Ejemplo de encabezado Location

```
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar&access_type=offline&prompt=consent&state=alice-123&login_hint=alice-123
```

## 4. Errores

| Código | Mensaje                            | Descripción                                                        |
|--------|------------------------------------|--------------------------------------------------------------------|
| 400    | `Missing user_id query parameter.` | No se envió `user_id` en la URL, por lo que no es posible iniciar el flujo. |
| 500    | `Unexpected error while processing the request.` | Cualquier excepción no controlada. El cuerpo incluye `error.details.message` con información diagnóstica. |

## 5. Notas y dependencias

- Este endpoint no verifica la existencia previa del usuario en KV; únicamente redirige a Google.
- Asegúrate de configurar correctamente `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI` en `wrangler.toml`.
- Tras la redirección y consentimiento del usuario, Google llamará a `/auth/callback` con un `code` y el mismo `state` para continuar el proceso.
- Recomendado usar HTTPS en todos los entornos para evitar exponer parámetros sensibles.
# Especificación de Endpoint: GET /auth/callback

## 1. Resumen

Completa el flujo OAuth 2.0 con Google. Recibe el `code` devuelto por Google, lo intercambia por tokens y persiste el `refresh_token` en Cloudflare KV asociado al `user_id`. Devuelve un mensaje JSON confirmando la vinculación.

## 2. Request

- **Método:** `GET`
- **Ruta:** `/auth/callback`
- **Headers requeridos (opcionales pero recomendados):**
  - `x-user-id`: permite identificar al usuario si no se envía por query ni viene en `state`.

- **Query params obligatorios:**
  - `code` (`string`): código de autorización entregado por Google.

- **Query params opcionales:**
  - `user_id` (`string`): identificador del usuario; si falta, se intenta recuperar desde `state` o `x-user-id`.
  - `state` (`string`): eco del valor enviado a Google; el Worker lo usa como fallback para inferir el `user_id`.

### Ejemplo de llamada

```
GET https://calendar-worker.example.com/auth/callback?code=4/0AX4Xf...&state=alice-123
```

## 3. Response

- **Tipo:** JSON (`application/json`).
- **Cuerpo:**
  ```json
  {
    "message": "Google account linked successfully.",
    "user_id": "alice-123",
    "provider": "google"
  }
  ```
- **Significado de campos:**
  - `message`: texto de confirmación.
  - `user_id`: identificador asociado en KV.
  - `provider`: siempre `"google"` para esta integración.

## 4. Errores

| Código | Mensaje                                                                                                       | Descripción                                                                                                                                                    |
|--------|---------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 400    | `Missing \`code\` query parameter.`                                                                           | Google no envió el parámetro `code`; no se puede continuar con el intercambio.                                                                                |
| 400    | `Missing user identifier. Provide ?user_id=... in the callback URL.`                                          | No se pudo determinar `user_id` a partir de query, headers ni `state`.                                                                                        |
| 400    | `Google did not return a refresh_token. Ensure access_type=offline and prompt=consent were used.`             | La respuesta de Google no incluyó `refresh_token`; suele ocurrir si el usuario ya concedió permisos sin forzar `prompt=consent`.                               |
| 500    | `Unexpected error while processing the request.`                                                              | Error no controlado (fallo en Google OAuth, KV, etc.). Se incluye `error.details.message` con información diagnóstica para operadores.                         |

## 5. Notas y dependencias

- Es indispensable que `/auth/google` se haya invocado previamente con `access_type=offline` y `prompt=consent` para garantizar la obtención de `refresh_token`.
- El Worker persiste la siguiente estructura en KV bajo `user:<user_id>`:
  ```json
  {
    "refresh_token": "<token>",
    "provider": "google",
    "timezone": "America/Santiago",
    "created_at": "<ISO8601>"
  }
  ```
- Si el usuario ejecuta el flujo varias veces, el `refresh_token` almacenado se sobrescribe.
- Este endpoint no devuelve `refresh_token` ni `access_token` al cliente para evitar exponer secretos.
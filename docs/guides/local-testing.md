# Guía de Pruebas Locales

Esta guía describe cómo levantar Calendar Worker en un entorno local utilizando Wrangler y validar los endpoints antes de desplegar en producción.

---

## 1. Requisitos previos

1. **Cuenta de Cloudflare** habilitada para Workers y KV.
2. **Cuenta de Google Cloud** con un proyecto que tenga:
   - Pantalla de consentimiento publicada (modo interno o externo según aplique).
   - Cliente OAuth 2.0 de tipo *Web application* con `redirect_uri` apuntando a `https://<tu-worker>.workers.dev/auth/callback` (puedes crear un valor temporal y luego ajustarlo).
3. **Node.js 18+** y **pnpm** instalados localmente (puedes habilitar Corepack con `corepack enable`). Verifica con:
   ```bash
   node --version
   pnpm --version
   ```
4. **Git** para clonar el repositorio (opcional si ya descargaste el código).

---

## 2. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-org/calendar-worker.git
cd calendar-worker
pnpm install
```

Esto instala Wrangler, Prettier y los tipos de Cloudflare definidos en `package.json`.

---

## 3. Configurar credenciales para pruebas

### 3.1 Variables de entorno ( `.dev.vars` )

Crea un archivo `.dev.vars` en la raíz del proyecto con el siguiente contenido:

```
GOOGLE_CLIENT_ID="tu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu_client_secret"
GOOGLE_REDIRECT_URI="https://<tu-worker>.workers.dev/auth/callback"
```

> `.dev.vars` es leído automáticamente por `wrangler dev` y no se commitea (está en `.gitignore`).

### 3.2 Namespace KV de prueba

Wrangler puede emular KV en local, pero para probar con el flujo OAuth real es recomendable crear un namespace de prueba:

```bash
pnpm dlx wrangler kv:namespace create USERS_KV --preview
```

Copia el `id` generado en la sección `[[kv_namespaces]]` de `wrangler.toml`. Para pruebas remotas (modo `--remote`), crea también el namespace de producción y agrega su `id`.

---

## 4. Autenticarse con Cloudflare

Ejecuta:

```bash
pnpm dlx wrangler login
```

Se abrirá una ventana del navegador para autorizar al CLI. Este paso es obligatorio incluso para `wrangler dev` cuando se usan recursos remotos.

---

## 5. Ejecutar el Worker en local

### 5.1 Modo local puro

```bash
pnpm dev
```

- Expondrá el Worker en `http://127.0.0.1:8787`.
- Por defecto usa el simulador de runtime y un KV in-memory.

### 5.2 Modo remoto (recomendado para pruebas OAuth)

```bash
pnpm dlx wrangler dev --remote
```

- Usa la infraestructura de Cloudflare para ejecutar el Worker (latencia y comportamiento más cercanos a producción).
- La URL temporal mostrada en consola se debe registrar como `redirect_uri` mientras haces pruebas.

---

## 6. Flujos de prueba sugeridos

1. **Inicio OAuth**
   ```bash
   open "http://127.0.0.1:8787/auth/google?user_id=alice-123"
   ```
   (en Linux usa `xdg-open` o simplemente pega la URL en el navegador). Completa la pantalla de consentimiento de Google.

2. **Verificar KV**
   - Tras el callback, el namespace debe almacenar `user:alice-123`.
   - Puedes confirmarlo con:
     ```bash
     pnpm dlx wrangler kv:key get --namespace-id=<ID> user:alice-123 --preview
     ```

3. **Consultar eventos diarios**
   ```bash
   curl -H "x-user-id: alice-123" http://127.0.0.1:8787/calendar/today
   ```

4. **Consultar eventos semanales**
   ```bash
   curl -H "x-user-id: alice-123" http://127.0.0.1:8787/calendar/week
   ```

5. **Validar errores**
   - Omite `x-user-id` para confirmar el `401`.
   - Consulta con un usuario inexistente para verificar el `404`.

---

## 7. Tareas de depuración comunes

| Problema | Revisión sugerida |
|----------|-------------------|
| `Missing user identifier...` en `/auth/callback` | Asegúrate de que Google esté devolviendo `state` y que la URL incluya `user_id` o el header `x-user-id`. |
| `Google did not return a refresh_token` | Fuerza `prompt=consent` limpiando las cookies de Google o agregando `approval_prompt=force` en el flujo manual (solo para depurar). |
| Errores de certificado al abrir `/auth/google` | Usa `--remote` para evitar redirecciones desde `http://127.0.0.1` hacia un `https://` registrado. |
| `wrangler dev` no refleja cambios | Detén el proceso y vuelve a ejecutar `pnpm dev`; Wrangler recompila automáticamente pero a veces requiere reinicio ante errores de sintaxis. |

---

## 8. Limpieza

- Revoca tokens de prueba desde la consola de seguridad de Google (opcional).
- Para liberar el namespace de KV temporal:
  ```bash
  pnpm dlx wrangler kv:namespace delete --namespace-id=<ID>
  ```
- Elimina `.dev.vars` si contiene credenciales sensibles que no quieras dejar en tu máquina.

---

Con estos pasos podrás validar el comportamiento end-to-end de Calendar Worker en tu entorno local antes de pasar a despliegues en Cloudflare.
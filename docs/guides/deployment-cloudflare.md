# Guía de Despliegue en Cloudflare

Esta guía explica cómo desplegar Calendar Worker en Cloudflare partiendo de una máquina local sin herramientas instaladas previamente.

---

## 1. Prerrequisitos

1. **Cuenta de Cloudflare activa** con acceso a Workers y KV.
2. **Proyecto de Google Cloud** con:
   - Pantalla de consentimiento aprobada.
   - Cliente OAuth 2.0 (tipo Web) con `redirect_uri` apuntando a `https://<tu-subdominio>.workers.dev/auth/callback` o a tu dominio personalizado.
3. **Navegador** para autenticarte durante la instalación.
4. **Sistema operativo compatible** (Windows, macOS o Linux) con permisos para instalar software.

---

## 2. Instalación de dependencias

### 2.1 Node.js y pnpm
1. Descarga Node.js 18 LTS desde [https://nodejs.org](https://nodejs.org) y habilita pnpm con Corepack (`corepack enable`) o instalándolo desde su sitio oficial.
2. Sigue el instalador según tu sistema.
3. Verifica la instalación:
   ```bash
   node --version
   pnpm --version
   ```

### 2.2 Wrangler CLI
1. Inicializa el proyecto o entra al directorio existente:
   ```bash
   cd calendar-worker
   ```
2. Instala las dependencias (incluido Wrangler) de forma local:
   ```bash
   pnpm install
   ```
3. Opcionalmente instala la versión global:
   ```bash
   pnpm add -g wrangler
   ```

---

## 3. Autenticación con Cloudflare

1. Ejecuta:
   ```bash
   pnpm dlx wrangler login
   ```
2. Se abrirá una ventana del navegador para autorizar el acceso del CLI a tu cuenta.
3. Una vez aprobado, Wrangler almacenará el token de autenticación localmente.

---

### 4. Configuración del proyecto

Antes de editar archivos, asegúrate de tener a mano tu **Cloudflare Account ID**:
1. Inicia sesión en el panel de Cloudflare y selecciona la cuenta correcta desde la barra lateral izquierda.
2. Ve a **Workers & Pages** → **Overview**; el ID aparecerá en la sección “Account details”.
3. También puedes copiarlo desde la URL del dashboard (es la cadena alfanumérica entre `/accounts/` y `/workers/`).
4. Si prefieres la línea de comandos, ejecuta `pnpm dlx wrangler whoami` para mostrar el `account_id` asociado a tu sesión.

### 4.1 Variables en `wrangler.toml`
Edita `wrangler.toml` con los valores reales (para secretos sensibles usa el flujo descrito en `docs/guides/secrets-wrangler.md`):
```toml
[vars]
GOOGLE_CLIENT_ID = "tu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "tu_client_secret"
GOOGLE_REDIRECT_URI = "https://tu-worker.workers.dev/auth/callback"
```

### 4.2 Namespace KV
1. Crea el namespace:
   ```bash
   pnpm dlx wrangler kv namespace create USERS_KV
   ```
2. Copia el `id` retornado y reemplaza `YOUR_KV_NAMESPACE_ID` en `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "USERS_KV"
   id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

> Si necesitas un namespace diferente para preproducción, repite el comando con `--preview`.

---

## 5. Prueba previa (opcional pero recomendable)

1. Lanza el Worker en modo remoto:
   ```bash
   pnpm dlx wrangler dev --remote
   ```
2. Usa la URL generada como `GOOGLE_REDIRECT_URI` temporal para validar el flujo OAuth y los endpoints (`/auth/google`, `/calendar/today`, etc.).

---

## 6. Despliegue

Ejecuta el comando estándar de Wrangler:

```bash
pnpm deploy
```

Equivale a:

```bash
pnpm dlx wrangler deploy
```

Wrangler:
- Construirá el bundle TypeScript.
- Subirá el script a Cloudflare Workers.
- Asociará el namespace `USERS_KV`.
- Guardará la URL pública (por ejemplo, `https://calendar-worker.<tu-subdominio>.workers.dev`).

---

## 7. Post-despliegue

1. **Verifica el estado**:
   ```bash
   pnpm dlx wrangler deployments list
   ```
2. **Comprueba los endpoints** directamente en producción:
   - `/auth/google?user_id=alice-123`
   - `/calendar/today` (incluyendo `x-user-id`).
3. **Configura dominios personalizados** (opcional):
   ```bash
   pnpm dlx wrangler routes deploy
   ```
   y sigue las instrucciones para mapear un subdominio propio.

---

## 8. Mantenimiento y actualizaciones

1. **Cambios en código** → `pnpm deploy`.
2. **Rotación de secretos**:
   - Edita `wrangler.toml`.
   - Ejecuta nuevamente `pnpm dlx wrangler deploy`.
3. **Observabilidad**:
   - Revisa la sección `[observability]` en `wrangler.toml`.
   - Habilita Workers Trace Events o integra con tu plataforma de logs preferida.
4. **Backups de KV**:
   - Exporta claves críticas con `wrangler kv:key list/get`.
   - Considera automatizar respaldos periódicos si manejas muchos usuarios.

---

Siguiendo estos pasos, Calendar Worker quedará desplegado en Cloudflare y listo para que OpenClaw consuma los endpoints de autenticación y calendario.

# Guía de Manejo de Secretos con Wrangler

Esta guía resume el flujo recomendado para gestionar secretos en Calendar Worker utilizando las capacidades nativas de Wrangler. Sigue estos pasos para mantener credenciales y datos sensibles fuera del repositorio.

---

## 1. ¿Por qué usar `wrangler secret`?

- Los valores se almacenan cifrados en Cloudflare y sólo son accesibles en tiempo de ejecución.
- Evitas exponer secretos en `wrangler.toml`, `git` o pipelines.
- Facilitas la rotación de credenciales sin modificar el código.

---

## 2. Preparación

1. Asegúrate de haber iniciado sesión con Wrangler:
   ```bash
   pnpm dlx wrangler login
   ```
2. Verifica que `account_id`, `vars` y `kv_namespaces` estén configurados en `wrangler.toml` (sin secretos reales).

---

## 3. Crear o actualizar un secreto

Ejecuta el comando interactivo:

```bash
pnpm dlx wrangler secret put GOOGLE_CLIENT_SECRET
```

- Wrangler solicitará el valor por consola (no se almacena en historial).
- Repite por cada secreto requerido (`GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, etc.) si prefieres mantenerlos fuera del archivo.

> También puedes pasar el valor desde una variable de entorno:
> ```bash
> echo "$GOOGLE_CLIENT_SECRET" | pnpm dlx wrangler secret put GOOGLE_CLIENT_SECRET --stdin
> ```

---

## 4. Consumir secretos en el código

En el worker, los secretos están disponibles en `env` como cualquier otra variable:

```ts
export interface Env {
  GOOGLE_CLIENT_SECRET: string;
  // ...
}

async function handler(request: Request, env: Env) {
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  // ...
}
```

No es necesario modificar `wrangler.toml` para referenciarlos.

---

## 5. Listar y eliminar secretos

- **Listar** (solo nombres):
  ```bash
  pnpm dlx wrangler secret list
  ```

- **Eliminar**:
  ```bash
  pnpm dlx wrangler secret delete GOOGLE_CLIENT_SECRET
  ```

Usa estos comandos para revisar o limpiar valores obsoletos.

---

## 6. Entornos múltiples

- Mantén secretos separados por entorno usando archivos `wrangler.*.toml` (ej. `wrangler.dev.toml`, `wrangler.prod.toml`).
- Ejecuta `pnpm dlx wrangler secret put ... --env <ENV>` para asociar el secreto al entorno correcto.
- Documenta qué valores requieren actualización en cada despliegue.

---

## 7. Buenas prácticas

1. **Nunca** compartas secretos en texto plano ni en capturas de pantalla.
2. Rotar credenciales periódicamente y tras cualquier incidente.
3. Automatiza la inyección de secretos en CI/CD usando variables del sistema y `wrangler secret put --stdin`.
4. Revisa permisos en Cloudflare para que solo las personas necesarias puedan gestionar secretos.

---

Siguiendo esta guía mantendrás los datos sensibles seguros y aislados del código fuente, cumpliendo con las mejores prácticas de seguridad para proyectos en Cloudflare Workers.
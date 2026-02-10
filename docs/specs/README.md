# Especificaciones Funcionales

Este directorio contiene la documentación detallada de cada endpoint expuesto por Calendar Worker. Su objetivo es centralizar los contratos HTTP que OpenClaw u otros integradores necesitan para consumir el servicio.

## Organización

- `endpoints/`: carpeta que alberga una especificación por endpoint (por ejemplo, `endpoints/auth-google.md`, `endpoints/calendar-today.md`, etc.). Cada archivo sigue la misma estructura:
  1. **Resumen**: propósito y alcance del endpoint.
  2. **Request**:
     - Método y ruta.
     - Encabezados obligatorios.
     - Parámetros de query o cuerpo (si aplica).
  3. **Response**:
     - Formato esperado (JSON, redirect, etc.).
     - Campos y tipos.
     - Ejemplos.
  4. **Errores**: códigos HTTP y mensajes más comunes.
  5. **Notas**: consideraciones adicionales, dependencias o pasos previos necesarios.

## Flujo de Trabajo

1. **Crear archivo**: para cada nuevo endpoint, duplica una especificación existente o usa la plantilla base descrita arriba.
2. **Mantener sincronía**: cualquier cambio en la lógica del Worker debe reflejarse también en el archivo correspondiente.
3. **Revisión**: valida que los ejemplos y códigos de error coincidan con el comportamiento real del servicio antes de publicar.
4. **Control de versiones**: incluye referencias a PRs o commits relevantes dentro de la sección de notas cuando el cambio sea significativo.

## Buenas Prácticas

- Redactar siempre en español técnico.
- Usar ejemplos completos que muestren headers, query params y cuerpos JSON.
- Documentar los estados de error más probables (401, 404, 500) con mensajes tal como los devuelve la API.
- Indicar siempre cómo manejar los secretos: para uso local referenciar `.dev.vars` y para despliegues usar `wrangler secret`, según `docs/guides/secrets-wrangler.md`.
- Referenciar otras secciones de `docs/` (por ejemplo, el SDD) cuando se describan dependencias o decisiones de diseño.

Con esta estructura, el equipo dispone de un catálogo claro y evolutivo de los contratos HTTP que rigen Calendar Worker.
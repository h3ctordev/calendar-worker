# Guía de Trabajo con SDD

Este documento describe el flujo de trabajo recomendado para mantener la documentación **System Design Document (SDD)** del proyecto Calendar Worker.

## 1. Estructura de Documentos

- `docs/system-design.md`: SDD principal con la arquitectura y decisiones actuales.
- `docs/README.md`: Este manual de proceso para crear, actualizar y revisar el SDD.

Mantén ambos archivos sincronizados cuando se incorporen cambios funcionales o de arquitectura.

## 2. Flujo de Trabajo Recomendado

1. **Propuesta de Cambio**
   - Registra el objetivo (nueva funcionalidad, refactor, configuración).
   - Lista supuestos y restricciones.
   - Identifica secciones del SDD que se verán afectadas.

2. **Borrador del SDD**
   - Actualiza `docs/system-design.md` en español.
   - Incluye:
     - Contexto y motivación.
     - Impacto en componentes.
     - Modificaciones en modelos de datos, flujos y dependencias.
     - Riesgos, mitigaciones y métricas si aplican.

3. **Revisión**
   - Solicita retroalimentación técnica.
   - Verifica coherencia con requisitos funcionales y no funcionales.
   - Asegura que el SDD refleje exactamente lo que se implementará.

4. **Implementación**
   - Usa el SDD como referencia durante el desarrollo.
   - Registra cualquier desviación detectada en esta etapa y actualiza el documento para mantener trazabilidad.

5. **Post-Implementación**
   - Confirma que el SDD final coincide con el estado real del sistema.
   - Añade notas de aprendizaje (decisiones que no prosperaron, problemas encontrados, etc.).

## 3. Buenas Prácticas

- **Lenguaje:** redactar siempre en español claro y técnico.
- **Versión mínima:** cada cambio sustancial debe incluir fecha y breve resumen en la parte superior del SDD.
- **Evidencia:** enlaza PRs, diagramas o prototipos relevantes.
- **Consistencia:** revisa que las secciones de objetivos, flujos y componentes estén alineadas entre sí.
- **Automatización:** cuando sea posible, describe cómo el cambio afecta scripts de despliegue, observabilidad o pruebas.

## 4. Plantilla Sugerida para Nuevas Secciones

```
### {Nombre de la Sección}
- **Motivación:** …
- **Alcance:** …
- **Componentes impactados:** …
- **Riesgos / Mitigaciones:** …
- **Decisiones pendientes:** …
```

## 5. Roles y Responsabilidades

| Rol              | Responsabilidad en SDD                                |
|------------------|-------------------------------------------------------|
| Autor del cambio | Redactar propuesta y borrador del SDD.                |
| Revisor técnico  | Validar coherencia, riesgos y alineación arquitectónica. |
| Equipo Dev       | Implementar conforme al SDD y reportar discrepancias. |
| Mantenimiento    | Garantizar que `docs/system-design.md` represente el estado actual del sistema. |

---

Seguir este flujo asegura que la documentación de diseño siga siendo una referencia confiable y evolucione junto con el producto.
# Plan de Barrido Total de Bugs (12 Secciones x 4 Barridos)

Fecha: 2026-03-23  
Alcance: plataforma completa (frontend, backend, datos, integraciones, infraestructura)

## 1) Objetivo operativo

Eliminar bugs hasta causa raiz y cerrar regresiones repetidas mediante 4 barridos completos con criterios de salida estrictos. Este plan esta pensado para dejar la plataforma consistente, solida y lista para operar sin deuda oculta de estabilidad.

## 2) Regla de oro de ejecucion

Ningun bug corregido se considera cerrado si no cumple todos los puntos:

- Tiene reproduccion determinista (pasos, datos, entorno).
- Tiene RCA (causa raiz tecnica y causa de proceso).
- Tiene fix validado por pruebas automaticas y prueba manual del flujo afectado.
- Tiene prueba de no-regresion incorporada al pipeline.
- Queda trazabilidad en tracker con evidencia.

## 3) Las 12 secciones de caza de bugs

1. Alcance y criticidad del negocio
2. Inventario de sintomas y deuda visible
3. Reproduccion controlada
4. Contratos entre capas (frontend-backend-DB-servicios externos)
5. Datos e integridad transaccional
6. Flujos funcionales criticos (compra, auth, carrito, paneles)
7. Seguridad y autorizacion
8. Resiliencia e infraestructura
9. Rendimiento y capacidad
10. Observabilidad y diagnostico
11. Pruebas automaticas y regresion
12. Cierre de raiz y prevencion

## 4) Matriz de cobertura por barrido

### Barrido 1: Descubrimiento total

Meta: mapear 100% de sintomas y convertirlos en casos reproducibles.

- Salida minima:
  - 100% de bugs del backlog con severidad y pasos de reproduccion.
  - 0 bugs sin owner ni prioridad.
  - 0 hallazgos criticos sin workaround temporal.

### Barrido 2: Correccion de alto impacto

Meta: eliminar fallos que rompen negocio, confianza o conversion.

- Salida minima:
  - 0 bugs criticos abiertos.
  - >= 80% de bugs altos cerrados.
  - Flujos de ingreso, compra y paneles rol-based sin bloqueos.

### Barrido 3: Causa raiz y endurecimiento

Meta: quitar recurrencias y estabilizar contratos, datos y resiliencia.

- Salida minima:
  - 100% de criticos/altos con RCA documentada.
  - Cobertura de no-regresion para todos los fixes de alto impacto.
  - Sin incoherencias de datos en validaciones de integridad.

### Barrido 4: Consistencia final

Meta: validar plataforma completa bajo criterio de release.

- Salida minima:
  - 0 regresiones abiertas.
  - KPI tecnicos estables 72h (error rate, latencia, jobs).
  - Checklist de release completado y firmado.

## 5) Protocolo de ejecucion por seccion (aplica en los 4 barridos)

Para cada seccion, seguir siempre este orden:

1. Explorar evidencia: logs, trazas, metricas, reportes previos.
2. Enumerar casos: convertir sintomas en casos reproducibles.
3. Reproducir: documentar datos de entrada/salida y entorno.
4. Corregir: fix minimo seguro, sin cambios colaterales innecesarios.
5. Verificar: prueba manual + automatica + no-regresion.
6. Cerrar: RCA, evidencia, owner y fecha en tracker.

## 6) Cadencia sugerida (sprints de barrido)

- Sprint A (3 dias): Barrido 1 completo.
- Sprint B (4 dias): Barrido 2 completo.
- Sprint C (4 dias): Barrido 3 completo.
- Sprint D (3 dias): Barrido 4 + release gate.

Total sugerido: 14 dias efectivos.

## 7) Gate de calidad por seccion

Cada seccion se marca VERDE solo si cumple:

- Bugs abiertos en severidad critica: 0
- Bugs abiertos en severidad alta: <= umbral acordado
- Regresiones de la seccion: 0
- Evidencia de verificacion: completa
- RCA cerrada en incidentes P0/P1: 100%

## 8) Comandos de verificacion recomendados en este repositorio

### Frontend

```bash
cd frontend
npm run lint
npm run test:run
npm run test:e2e
```

### Backend

```bash
cd backend
pytest -q
```

### Verificacion rapida de estabilidad

```bash
cd frontend
npm run test:smoke
```

Nota: cuando el tiempo sea limitado, ejecutar smoke en cada fix y ejecutar suite completa al cierre de cada barrido.

## 9) Definicion de severidad (operativa)

- Critica: rompe compra, auth, datos sensibles, caida de flujo principal o perdida de datos.
- Alta: bloquea funcionalidad principal sin workaround aceptable.
- Media: afecta experiencia o productividad, con workaround parcial.
- Baja: defecto cosmetico o impacto menor sin riesgo operativo.

## 10) Definicion de Done (global)

La plataforma se considera consistente, solida y lista cuando:

- 0 criticos abiertos.
- 0 regresiones de flujos criticos.
- 100% de fixes de criticos/altos con prueba de no-regresion.
- Integridad de datos validada sin discrepancias.
- Monitoreo y alertas cubren los flujos de negocio clave.

## 11) Plan de arranque inmediato (hoy)

1. Abrir tracker y cargar backlog actual de bugs/hallazgos.
2. Etiquetar severidad y owner por cada item.
3. Ejecutar Barrido 1 Secciones 1-3 (alcance, inventario, reproduccion).
4. Ejecutar smoke frontend + pytest backend para baseline.
5. Congelar baseline en reporte diario.

## 12) Riesgos de ejecucion y mitigacion

- Riesgo: cerrar bugs por sintoma y no por causa raiz.
  - Mitigacion: RCA obligatoria en P0/P1 + review tecnica de cierre.
- Riesgo: regresiones por fixes rapidos.
  - Mitigacion: prueba de no-regresion obligatoria por bug corregido.
- Riesgo: cobertura desigual entre modulos.
  - Mitigacion: gate por seccion, no solo por total agregado.

# Tracker de Barridos de Bugs

Uso: duplicar las tablas por cada barrido (B1, B2, B3, B4) y mantener evidencia de extremo a extremo.

## 1) Estado por seccion

| Barrido | Seccion | Owner | Estado | Bugs Criticos Abiertos | Bugs Altos Abiertos | Regresiones Abiertas | Evidencia | Gate |
|---|---|---|---|---:|---:|---:|---|---|
| B1 | 1. Alcance y criticidad |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 2. Inventario de sintomas |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 3. Reproduccion controlada |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 4. Contratos entre capas |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 5. Datos e integridad |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 6. Flujos funcionales criticos |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 7. Seguridad y autorizacion |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 8. Resiliencia e infraestructura |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 9. Rendimiento y capacidad |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 10. Observabilidad |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 11. Pruebas y regresion |  | Pendiente | 0 | 0 | 0 |  | Rojo |
| B1 | 12. Cierre de raiz y prevencion |  | Pendiente | 0 | 0 | 0 |  | Rojo |

## 2) Registro unitario de bugs

| ID | Barrido | Seccion | Severidad | Componente/Endpoint | Reproducible (Si/No) | Causa raiz | Fix aplicado | No-regresion agregada | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|---|
| BUG-0001 | B1 |  |  |  |  |  |  |  | Abierto |  |

## 3) Registro de RCA obligatorio (P0/P1)

| ID Bug | Tipo (Tecnica/Proceso) | Causa raiz | Senal temprana que falto | Accion preventiva | Responsable | Fecha compromiso | Estado |
|---|---|---|---|---|---|---|---|
| BUG-0001 | Tecnica |  |  |  |  |  | Abierto |

## 4) Reporte diario de barrido

| Fecha | Barrido | Bugs nuevos | Bugs cerrados | Criticos abiertos | Altos abiertos | Regresiones abiertas | Riesgo principal del dia | Decision tomada |
|---|---:|---:|---:|---:|---:|---:|---|---|
| 2026-03-23 | B1 | 0 | 0 | 0 | 0 | 0 |  |  |

## 5) Checklist de cierre por barrido

- [ ] Todos los bugs criticos del barrido estan en 0 abiertos.
- [ ] Todos los bugs altos del barrido cumplen umbral acordado.
- [ ] Todas las correcciones tienen evidencia de validacion.
- [ ] Todos los P0/P1 tienen RCA completa.
- [ ] No existen regresiones abiertas en flujos criticos.
- [ ] Se ejecuto smoke + pruebas requeridas de barrido.

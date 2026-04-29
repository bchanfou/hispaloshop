# HispaloShop — AI MAP (LEER PRIMERO)

## 1) Qué es HispaloShop (definición oficial)
HispaloShop es una red social de comercio local (B2C) y un puente entre mercados (B2B), que conecta productores, importadores/distribuidores, influencers y consumidores para comprar, vender y relacionarse alrededor de alimentos reales; con agentes de IA (David AI nutrición, Rebeca AI ventas nacionales, Pedro AI import/export B2B, Iris seguridad) para mejorar la experiencia y mantener la plataforma limpia.

## 2) Reglas duras (NO HACER)
Estas reglas son *hard constraints*; si un documento o una sugerencia contradice esto, **se rechaza**:

- **Prohibido OpenAI**: no usar SDKs, endpoints, modelos, ni referencias (ni reintroducirlo “por conveniencia”).
- **Diseño**: no inventar estilos; seguir el ADN de `DESIGN_SYSTEM.md`.
- **Colores**: no introducir colores fuera del sistema (blanco/negro/stone, y las excepciones definidas en el design system).
- **UI sin emojis**: no usar emojis en UI.
- **UI sin banderas**: no usar banderas (ni emojis ni iconos de bandera). Países se muestran como texto + código, p.ej. `ES — España`, `KR — Corea`, `US — Estados Unidos`.
- **Docs**: no crear documentos nuevos en la raíz del repo. Todo documento nuevo debe vivir en `docs/` o `docs/ai/`.
- **Negocio**: no cambiar pricing/planes/comisiones sin actualizar primero el documento de negocio correspondiente (ver “Mapa de lectura”).
- **Multi-país por defecto**: cualquier feature crítica se considera multi-país y multi-moneda por defecto (ES/KR/US) salvo decisión explícita documentada.

## 3) Fuente de verdad (orden de autoridad)
Si dos documentos se contradicen, se obedece este orden:

1. `MEGA_PLAN.md` (decisiones cerradas / target final)
2. `ROADMAP_LAUNCH.md` (orden/estado de ejecución)
3. `memory/PRD.md` (resumen ejecutivo; no puede contradecir 1 o 2)
4. `README.md` (overview)
5. Auditorías / reports / status (anexos; informan pero **no mandan**)

## 4) Decisiones cerradas (canon)
- **Lanzamiento simultáneo**: ES + KR + US.
- **Plan ELITE**: 249€/mes.
- **Tiers influencers**:
  - HÉRCULES: 3%
  - ATENEA: 5%
  - ZEUS: 7%
- **Diseño manda**: `DESIGN_SYSTEM.md`. (El archivo legacy `design_guidelines.json` fue eliminado.)
- **OpenAI**: prohibido.
- **UI**: sin emojis, sin banderas; países como texto + código.
- **Docs**: prohibido crear docs nuevos en raíz.
- **Orden fuente de verdad**: MEGA_PLAN > ROADMAP_LAUNCH > PRD > README > audits.

## 5) Roles oficiales (y alias permitido)
### Roles oficiales
- Consumidor
- Productor (vendedor)
- Importador/Distribuidor
- Influencer
- Admin (país)
- Super Admin (global)

### Alias permitido (solo como genérico)
- **Vendedor** = Productor o Importador/Distribuidor (los únicos que pueden vender).

## 6) Agentes de IA (canon)
- **David AI**: nutricionista personal.
- **Rebeca AI**: agente comercial a nivel nacional para los vendedores.
- **Pedro AI**: agente de importación y exportación B2B.
- **Iris**: agente que mantiene la plataforma limpia y segura.

## 7) Mapa de lectura (qué leer según tarea)
- Si la tarea es **negocio (planes, comisiones, precios, roles, países)**:
  - Leer: `MEGA_PLAN.md`
  - Leer: `docs/ai/03_BUSINESS_MODEL.md` (cuando exista; será el resumen operativo)
- Si la tarea es **orden de ejecución / qué va primero**:
  - Leer: `ROADMAP_LAUNCH.md`
- Si la tarea es **copy / tono / ADN visual / UX rules**:
  - Leer: `DESIGN_SYSTEM.md`
  - Leer: `docs/ai/01_DNA.md` (cuando exista)
- Si la tarea es **decisión ambigua**:
  - Aplicar: “Fuente de verdad”
  - Si sigue ambiguo: pedir confirmación al owner antes de implementar

## 8) Checklist antes de proponer o cambiar algo (para humanos e IAs)
1. ¿Respeta las **Reglas duras**?
2. ¿Afecta ES/KR/US? (asumir **sí** por defecto)
3. ¿Impacta pricing/planes/comisiones? Si sí: actualizar doc de negocio primero.
4. ¿Contradice MEGA_PLAN o ROADMAP? Si sí: detener y escalar.
5. ¿Introduce colores/emojis/banderas? Si sí: rechazar.
6. ¿Se está creando un doc en raíz? Si sí: mover a `docs/` o `docs/ai/`.

## 9) Notas de estilo (rápidas)
- Escribir en **español** en `docs/ai/`.
- Ser explícito con decisiones: “CERRADO” vs “ABIERTO”.
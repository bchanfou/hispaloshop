# Copilot instructions (HispaloShop)

## Read-first
- Always read `docs/ai/00_AI_MAP.md` before suggesting changes.
- If documents conflict, follow the “Fuente de verdad” order in the map.

## Hard constraints
- OpenAI is forbidden: do not add dependencies, integrations, references, or code paths for OpenAI.
- UI: no emojis, no flags. Countries must be rendered as text + code (e.g., `ES — España`, `KR — Corea`, `US — Estados Unidos`).
- Design: follow `DESIGN_SYSTEM.md`; do not invent colors outside the system.
- Multi-country by default: assume ES/KR/US impact unless explicitly documented otherwise.
- Do not create new documentation files in repo root; use `docs/` or `docs/ai/`.
- Do not change pricing/commissions/plans without updating the business model docs first.

## Language
- `docs/ai/*` is Spanish.

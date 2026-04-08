# PROMPT DE TRANSFERENCIA — Sección 4.1
## GDPR & Privacy Compliance

**Prioridad:** CRÍTICA (Legal)  
**Estado:** DESCONOCIDO  
**Objetivo:** Cumplimiento completo GDPR para usuarios UE + Corea PIPA

---

## CONTEXTO OBLIGATORIO

Lee ANTES de codear:
1. `memory/hispaloshop_dna.md`
2. `DESIGN_SYSTEM.md`
3. `ROADMAP_LAUNCH.md` sección 4.1
4. `backend/routes/users.py` — gestión datos usuario
5. `backend/core/models.py` — estructura datos

---

## REQUERIMIENTOS

### 1. Consentimiento Explícito (Registro)
- Checkbox separados obligatorios:
  - Aceptar Términos y Condiciones
  - Aceptar Política de Privacidad
  - (Opcional) Recibir newsletters
  - (Opcional) Cookies de análisis
- Timestamp y versión de documentos aceptados
- No se puede registrar sin aceptar obligatorios

### 2. Cookie Banner
- Aparece en primera visita
- Opciones: Rechazar todo / Aceptar esenciales / Aceptar todo
- Guarda preferencias en localStorage + backend
- Solo carga scripts de terceros (analytics) si se aceptó

### 3. Página "Mis Datos" (Usuario)
- Ver todos los datos almacenados
- Descargar datos en JSON (GDPR export)
- Eliminar cuenta permanentemente (con confirmación)

### 4. Derecho al Olvido (Delete Account)
- Endpoint: DELETE /users/me
- Elimina: perfil, datos personales, direcciones
- Anonimiza: pedidos (conserva para accounting), posts (marca "usuario eliminado")
- Retención: datos fiscales requeridos por ley (7 años)
- Email confirmación de eliminación

### 5. Políticas Legales
- Páginas estáticas:
  - `/terms` — Términos y Condiciones
  - `/privacy` — Política de Privacidad
  - `/cookies` — Política de Cookies
- Versionadas con fecha última actualización
- Links en footer de todas las páginas

### 6. Data Processing Records
- Log de accesos a datos personales (quién, cuándo, qué)
- Solo staff autorizado (admin/super-admin)
- Retención logs: 1 año

---

## ARCHIVOS

### Backend
- `backend/routes/users.py` — Export datos, delete account
- `backend/routes/legal.py` — Endpoints políticas
- `backend/services/gdpr_service.py` — Export, anonymize
- `backend/middleware/audit_log.py` — Log accesos datos

### Frontend
- `frontend/src/components/legal/CookieBanner.tsx`
- `frontend/src/pages/legal/TermsPage.tsx`
- `frontend/src/pages/legal/PrivacyPage.tsx`
- `frontend/src/pages/legal/CookiesPage.tsx`
- `frontend/src/pages/user/MyDataPage.tsx`
- `frontend/src/components/user/DeleteAccountModal.tsx`

---

## CHECKLIST DONE

- [ ] Checkboxes separados en registro
- [ ] Cookie banner funcional
- [ ] Página Términos y Privacidad
- [ ] Página Mis Datos con export JSON
- [ ] Delete account con anonimización
- [ ] Audit log accesos
- [ ] Versionado políticas
- [ ] Links legales en footer
- [ ] Zero emojis, stone palette

---

## COMMIT MESSAGE
```
feat(gdpr): cumplimiento completo GDPR + PIPA

- Registro: checkboxes consentimiento separados
- Cookie banner: rechazar/aceptar esenciales/todo
- Páginas: Términos, Privacidad, Cookies
- Mis Datos: export JSON, view datos
- Delete account: elimina + anonimiza, retiene fiscal
- Audit log: accesos datos personales
- Zero emojis, stone palette ADN

Refs: 4.1
```

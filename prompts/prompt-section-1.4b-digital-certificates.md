# PROMPT DE TRANSFERENCIA — Sección 1.4b
## Digital Certificates & HispaloTranslate

**Prioridad:** CRÍTICA (Top 5)  
**Estado:** ROTO — Requiere refactor  
**Objetivo:** Sistema automático compacto, QR funcional

---

## CONTEXTO OBLIGATORIO

Lee ANTES de codear:
1. `memory/hispaloshop_dna.md`
2. `DESIGN_SYSTEM.md`  
3. `backend/routes/certificates.py`
4. `frontend/src/pages/CertificatePage.tsx`
5. `frontend/src/pages/CertificatesListPage.tsx`

---

## REQUERIMIENTOS

### 1. Certificados Automáticos
- Se generan al subir producto (checkboxes del productor)
- Tipos: ORIGIN, ARTISAN, SUSTAINABLE, ORGANIC, LOCAL, TRADITIONAL, WOMEN_OWNED, FAMILY_BUSINESS
- ID: cert_{product_id}_{type}
- Campos: product_id, producer_id, type, issued_at, expires_at, qr_url, pdf_url, hash, status

### 2. QR Funcional
- URL: /c/{certificate_id}
- Página pública: producto + productor + tipo + fecha + badge verificado
- Generación: librería qrcode Python → PNG → Cloudinary

### 3. Lista Compacta
- Grid 3/2/1 columnas responsive
- Tarjeta: Icono + Título + Producto + Fecha + QR thumbnail
- Click → modal QR grande + descargar PDF
- ADN: stone palette, zero emojis, Lucide icons

---

## ARCHIVOS A MODIFICAR

### Backend
- `backend/core/models.py` — Modelo DigitalCertificate simplificado
- `backend/routes/certificates.py` — Endpoints limpios (lista, generar, detalle, qr, pdf)
- `backend/routes/certificates_public.py` — Vista pública /c/{id}
- `backend/services/certificate_generator.py` — Generar QR y PDF
- `backend/routes/products.py` — Hook auto-generar certificados

### Frontend  
- `frontend/src/pages/producer/ProducerCertificates.tsx` — Refactor lista compacta
- `frontend/src/pages/CertificatePage.tsx` — Fix QR
- `frontend/src/components/certificate/CertificateCard.tsx` — Nuevo componente
- `frontend/src/components/certificate/QRModal.tsx` — Nuevo modal

---

## CHECKLIST DONE

- [ ] Modelo simplificado
- [ ] Auto-generación en product create/update
- [ ] QR generado y escaneable
- [ ] PDF generado
- [ ] Vista pública /c/{id} funcional
- [ ] Lista compacta implementada
- [ ] Modal QR con descargas
- [ ] Tests: generación, QR válido, vista pública
- [ ] Zero emojis en todo el código
- [ ] Stone palette exclusivo

---

## COMMIT MESSAGE
```
feat(certificates): sistema compacto auto-generado con QR funcional

- Modelo DigitalCertificate simplificado (8 tipos)
- Auto-generación al crear/actualizar producto
- QR escaneable con URL /c/{id}
- Lista compacta grid responsive
- Modal QR con descarga PNG/PDF
- HispaloTranslate verificado operativo
- Zero emojis, stone palette ADN

Refs: 1.4b
```

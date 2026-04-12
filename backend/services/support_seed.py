"""
Seed knowledge base articles. Idempotent — only inserts articles whose slug
does not already exist. Called from core.database startup.
"""
from datetime import datetime, timezone

from core.database import db


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


SEED_ARTICLES = [
    # ── customer ──────────────────────────────────────────────────────────
    {
        "slug": "track-my-order",
        "title": "Cómo seguir mi pedido",
        "title_en": "How to track my order",
        "title_ko": "주문 추적 방법",
        "category": "order_issue",
        "role_target": "customer",
        "body": (
            "Una vez procesado el pago recibirás un email con tu número de pedido y enlace de tracking.\n\n"
            "Puedes ver el estado en tiempo real desde **Mi cuenta → Pedidos**. Allí verás el productor que prepara tu pedido y el courier asignado.\n\n"
            "Si después de 48h no ves actualizaciones, abre un ticket de soporte indicando tu número de pedido."
        ),
        "body_en": (
            "Once your payment is processed you will receive an email with your order number and tracking link.\n\n"
            "You can also see status in real time from **My account → Orders**. There you will see the producer preparing your order and the assigned courier.\n\n"
            "If after 48h there are no updates, open a support ticket with your order number."
        ),
    },
    {
        "slug": "return-policy",
        "title": "Política de devoluciones",
        "title_en": "Return policy",
        "category": "order_issue",
        "role_target": "customer",
        "body": (
            "Puedes solicitar la devolución de un pedido **dentro de 14 días** desde que lo recibes (Ley de consumidores UE).\n\n"
            "Productos perecederos (lácteos, carne, productos frescos) NO admiten devolución salvo defecto.\n\n"
            "Para iniciar una devolución, abre un ticket en **Soporte → Nuevo ticket → Problema con pedido** indicando motivo y fotos si aplica."
        ),
        "body_en": (
            "You can request a return **within 14 days** of receipt (EU consumer law).\n\n"
            "Perishable products (dairy, meat, fresh produce) cannot be returned unless defective.\n\n"
            "Open a ticket in **Support → New ticket → Order issue** with reason and photos."
        ),
    },
    {
        "slug": "damaged-order",
        "title": "Mi pedido llegó dañado, ¿qué hago?",
        "title_en": "My order arrived damaged, what do I do?",
        "category": "order_issue",
        "role_target": "customer",
        "body": (
            "1. Toma fotos claras del paquete y del producto dañado.\n"
            "2. Abre un ticket en **Soporte → Problema con pedido** dentro de 48h tras la entrega.\n"
            "3. Adjunta las fotos.\n\n"
            "Procesamos reembolsos íntegros para productos dañados en transporte. El productor también recibirá la información para mejorar embalaje."
        ),
        "body_en": (
            "1. Take clear photos of the package and the damaged product.\n"
            "2. Open a ticket in **Support → Order issue** within 48h of delivery.\n"
            "3. Attach the photos.\n\n"
            "We process full refunds for transport-damaged items."
        ),
    },
    # ── seller ────────────────────────────────────────────────────────────
    {
        "slug": "verify-producer-account",
        "title": "Cómo verificar mi cuenta de productor",
        "title_en": "How to verify my producer account",
        "category": "account_issue",
        "role_target": "producer",
        "body": (
            "La verificación es un paso obligatorio antes de poder vender:\n\n"
            "1. **CIF/NIF** o equivalente (sube foto o PDF).\n"
            "2. **Foto del obrador o instalación** donde produces.\n"
            "3. **Certificados sanitarios** si los tienes (opcional pero recomendado).\n\n"
            "El country admin de tu país revisa cada solicitud manualmente. Tiempo medio: 24-48h en días laborables."
        ),
        "body_en": (
            "Verification is mandatory before you can sell:\n\n"
            "1. **Tax ID** (upload photo or PDF).\n"
            "2. **Photo of your facility**.\n"
            "3. **Health certificates** if applicable.\n\n"
            "Your country admin reviews each request manually. Average time: 24-48h on business days."
        ),
    },
    {
        "slug": "change-my-plan",
        "title": "Cómo cambiar mi plan",
        "title_en": "How to change my plan",
        "category": "payment_issue",
        "role_target": "producer",
        "body": (
            "Puedes cambiar de plan en **Panel de productor → Plan**.\n\n"
            "- **Upgrade** (Free→PRO o Free→ELITE): aplicación inmediata, prorrata el primer mes.\n"
            "- **Downgrade**: se aplica al final del periodo de facturación actual.\n\n"
            "Tu comisión por venta cambia automáticamente: FREE 20% / PRO 18% / ELITE 17%."
        ),
        "body_en": (
            "Change your plan from **Producer panel → Plan**.\n\n"
            "- **Upgrade**: applies immediately with prorated billing.\n"
            "- **Downgrade**: applies at the end of the current billing period.\n\n"
            "Commission rate updates automatically: FREE 20% / PRO 18% / ELITE 17%."
        ),
    },
    # ── influencer ────────────────────────────────────────────────────────
    {
        "slug": "modelo-190-irpf",
        "title": "Modelo 190 y retención IRPF",
        "title_en": "Spanish IRPF withholding (Modelo 190)",
        "category": "fiscal_issue",
        "role_target": "influencer",
        "body": (
            "Si eres residente fiscal en España, HispaloShop está obligada a retener IRPF sobre tus comisiones de influencer:\n\n"
            "- **15%** estándar.\n"
            "- **7%** los primeros 3 años de actividad económica si te das de alta como autónomo.\n\n"
            "La retención se descuenta automáticamente del payout. Cada año fiscal recibirás el certificado modelo 190 para tu declaración."
        ),
        "body_en": (
            "If you are a Spanish tax resident, HispaloShop must withhold IRPF on your influencer commissions:\n\n"
            "- **15%** standard.\n"
            "- **7%** during the first 3 years if you register as self-employed.\n\n"
            "The withholding is deducted automatically from your payout. Each fiscal year you receive the modelo 190 certificate."
        ),
    },
    # ── importer ──────────────────────────────────────────────────────────
    {
        "slug": "upload-certificates",
        "title": "Cómo subir certificados",
        "title_en": "How to upload certificates",
        "category": "account_issue",
        "role_target": "importer",
        "body": (
            "Los certificados (sanitarios, halal, kosher, BIO, etc.) van en **Panel de importador → Certificados**.\n\n"
            "Formatos aceptados: PDF, JPG, PNG. Tamaño máximo 5MB.\n\n"
            "Cada certificado pasa revisión manual del country admin. Una vez aprobado, aparece en la ficha del producto y mejora la confianza del comprador."
        ),
        "body_en": (
            "Upload certificates (sanitary, halal, kosher, organic, etc.) from **Importer panel → Certificates**.\n\n"
            "Accepted formats: PDF, JPG, PNG. Max 5MB.\n\n"
            "Each certificate is manually reviewed by the country admin."
        ),
    },
    {
        "slug": "b2b-3pct-commission",
        "title": "Comisión B2B 3% explicada",
        "title_en": "B2B 3% commission explained",
        "category": "b2b_operation",
        "role_target": "importer",
        "body": (
            "En operaciones B2B, HispaloShop cobra una comisión del **3%** sobre el valor neto de la operación (después de descuentos).\n\n"
            "Esa comisión cubre: matchmaking, contrato digital, custodia de pagos (escrow), seguro de tránsito básico y soporte preferente.\n\n"
            "El 3% se deduce automáticamente del pago al productor cuando la operación se cierra."
        ),
        "body_en": (
            "On B2B operations, HispaloShop charges a **3%** commission on net operation value (after discounts).\n\n"
            "This covers: matchmaking, digital contract, payment escrow, basic transit insurance and priority support."
        ),
    },
    # ── general ───────────────────────────────────────────────────────────
    {
        "slug": "influencer-discount-code",
        "title": "Cómo funciona el código de descuento del influencer",
        "title_en": "How the influencer discount code works",
        "category": "payment_issue",
        "role_target": "customer",
        "body": (
            "Si entras a HispaloShop con el código de un influencer, recibes un **10% de descuento en tu primera compra**.\n\n"
            "El descuento lo absorbe la plataforma — el productor recibe el 100% del precio original. Es nuestra forma de premiar a los creadores que nos traen consumidores nuevos.\n\n"
            "El código solo funciona una vez por consumidor."
        ),
        "body_en": (
            "If you enter HispaloShop with an influencer code, you get a **10% discount on your first purchase**.\n\n"
            "The platform absorbs the discount — the producer receives 100% of the original price. It is our way of rewarding creators who bring us new shoppers.\n\n"
            "The code only works once per consumer."
        ),
    },
    {
        "slug": "refund-policy",
        "title": "Política de reembolso",
        "title_en": "Refund policy",
        "category": "payment_issue",
        "role_target": "all",
        "body": (
            "**Plazos de reembolso:**\n\n"
            "- Reembolsos por producto dañado o no recibido: 100% del importe en 5-10 días hábiles.\n"
            "- Reembolsos por cambio de opinión (productos no perecederos): 100% en 14 días desde la entrega.\n\n"
            "El reembolso vuelve al método de pago original (tarjeta, Apple Pay, etc.). Las comisiones de plataforma se devuelven proporcionalmente."
        ),
        "body_en": (
            "**Refund timelines:**\n\n"
            "- Damaged or undelivered products: 100% within 5-10 business days.\n"
            "- Change of mind (non-perishable): 100% within 14 days of delivery.\n\n"
            "Refunds go back to the original payment method. Platform fees are returned proportionally."
        ),
    },
    # ── Section 4.2: Fiscal help articles (3 countries × 2 each) ──
    {
        "slug": "declarar-ingresos-espana",
        "title": "Como declarar ingresos de HispaloShop en Espana",
        "title_en": "How to report HispaloShop income in Spain",
        "category": "fiscal_issue",
        "role_target": "all",
        "country_target": "ES",
        "body": (
            "Si eres autonomo o tienes actividad economica en Espana, debes declarar tus ingresos de HispaloShop como rendimiento de actividad economica.\n\n"
            "**Modelos tributarios aplicables:**\n"
            "- **Modelo 130**: Pago fraccionado trimestral del IRPF (20% del rendimiento neto)\n"
            "- **Modelo 303**: Declaracion trimestral de IVA\n"
            "- **Modelo 100**: Declaracion anual de la renta (IRPF)\n"
            "- **Alta en IAE**: Epigrafe correspondiente a tu actividad\n\n"
            "**Importante:** HispaloShop LLC (USA) no retiene impuestos. Cobras el 100% de tus ganancias y eres responsable de tu declaracion fiscal.\n\n"
            "Recomendamos consultar con un asesor fiscal para tu situacion particular."
        ),
        "body_en": (
            "If you are self-employed in Spain, you must report your HispaloShop income as business income.\n\n"
            "Applicable tax forms: Modelo 130 (quarterly IRPF), Modelo 303 (quarterly VAT), Modelo 100 (annual income tax), IAE registration.\n\n"
            "HispaloShop LLC (USA) does not withhold taxes. You receive 100% of your earnings."
        ),
    },
    {
        "slug": "facturacion-productores-espana",
        "title": "Facturacion para productores espanoles en HispaloShop",
        "title_en": "Invoicing for Spanish producers on HispaloShop",
        "category": "fiscal_issue",
        "role_target": "producer",
        "country_target": "ES",
        "body": (
            "Como productor en Espana, debes emitir facturas por tus ventas.\n\n"
            "**A quien facturar:** A HispaloShop LLC (comprador del servicio de marketplace)\n"
            "**Base imponible:** El importe bruto de tus ventas menos la comision de la plataforma\n"
            "**IVA:** Aplica IVA segun tu regimen fiscal (general 21%, reducido 10% para alimentacion)\n"
            "**Retencion IRPF:** No aplica (HispaloShop LLC es empresa estadounidense, no sujeta a retencion espanola)\n\n"
            "Consulta con tu asesor fiscal para determinar tu regimen de IVA aplicable."
        ),
        "body_en": (
            "As a Spanish producer, you must issue invoices for your sales through HispaloShop."
        ),
    },
    {
        "slug": "korean-income-reporting",
        "title": "\ud55c\uad6d\uc5d0\uc11c HispaloShop \uc18c\ub4dd \uc2e0\uace0\ud558\uae30",
        "title_en": "How to report HispaloShop income in South Korea",
        "title_ko": "\ud55c\uad6d\uc5d0\uc11c HispaloShop \uc18c\ub4dd \uc2e0\uace0\ud558\uae30",
        "category": "fiscal_issue",
        "role_target": "all",
        "country_target": "KR",
        "body": (
            "\ud55c\uad6d\uc5d0\uc11c HispaloShop\uc744 \ud1b5\ud574 \ubc1c\uc0dd\ud55c \uc18c\ub4dd\uc740 \uc0ac\uc5c5\uc18c\ub4dd \ub610\ub294 \uae30\ud0c0\uc18c\ub4dd\uc73c\ub85c \uc2e0\uace0\ud574\uc57c \ud569\ub2c8\ub2e4.\n\n"
            "**\uc8fc\uc694 \uc0ac\ud56d:**\n"
            "- HispaloShop LLC(\ubbf8\uad6d \ubc95\uc778)\ub294 \ud55c\uad6d \uc138\uae08\uc744 \uc6d0\ucc9c\uc9d5\uc218\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4\n"
            "- \uc18c\ub4dd \uc804\uc561\uc744 \uc218\ub839\ud558\uba70, \ud55c\uad6d \uc138\ubc95\uc5d0 \ub530\ub77c \uc2e0\uace0\ud560 \ucc45\uc784\uc774 \uc788\uc2b5\ub2c8\ub2e4\n"
            "- \ud55c\ubbf8 \uc870\uc138\uc870\uc57d\uc774 \uc801\uc6a9\ub429\ub2c8\ub2e4\n\n"
            "\uc138\ubb34\uc0ac\uc640 \uc0c1\ub2f4\ud558\uc2dc\uae30 \ubc14\ub78d\ub2c8\ub2e4."
        ),
        "body_en": (
            "Income from HispaloShop in South Korea must be reported as business or other income. "
            "HispaloShop LLC (USA) does not withhold Korean taxes. The US-Korea tax treaty applies."
        ),
        "body_ko": (
            "\ud55c\uad6d\uc5d0\uc11c HispaloShop\uc744 \ud1b5\ud574 \ubc1c\uc0dd\ud55c \uc18c\ub4dd\uc740 \uc0ac\uc5c5\uc18c\ub4dd \ub610\ub294 \uae30\ud0c0\uc18c\ub4dd\uc73c\ub85c \uc2e0\uace0\ud574\uc57c \ud569\ub2c8\ub2e4."
        ),
    },
    {
        "slug": "korean-business-registration",
        "title": "\uc0ac\uc5c5\uc790\ub4f1\ub85d \uac00\uc774\ub4dc",
        "title_en": "Business registration guide for Korean sellers",
        "title_ko": "\uc0ac\uc5c5\uc790\ub4f1\ub85d \uac00\uc774\ub4dc",
        "category": "fiscal_issue",
        "role_target": "producer",
        "country_target": "KR",
        "body": (
            "\ud55c\uad6d\uc5d0\uc11c HispaloShop\uc744 \ud1b5\ud574 \uc815\uae30\uc801\uc73c\ub85c \uc0c1\ud488\uc744 \ud310\ub9e4\ud558\ub294 \uacbd\uc6b0, \uc0ac\uc5c5\uc790\ub4f1\ub85d\uc774 \ud544\uc694\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.\n\n"
            "**\ud544\uc694 \uc11c\ub958:**\n"
            "- \uc0ac\uc5c5\uc790\ub4f1\ub85d\uc2e0\uccad\uc11c\n"
            "- \uc2e0\ubd84\uc99d\n"
            "- \uc784\ub300\ucc28\uacc4\uc57d\uc11c (\ud574\ub2f9 \uc2dc)\n\n"
            "\uc138\ubb34\uc11c \ub610\ub294 \ud648\ud0dd\uc2a4(www.hometax.go.kr)\uc5d0\uc11c \uc2e0\uccad \uac00\ub2a5\ud569\ub2c8\ub2e4."
        ),
        "body_en": (
            "If you sell regularly on HispaloShop from Korea, you may need a business registration. "
            "Apply at your local tax office or via HomeTax."
        ),
        "body_ko": (
            "\ud55c\uad6d\uc5d0\uc11c HispaloShop\uc744 \ud1b5\ud574 \uc815\uae30\uc801\uc73c\ub85c \uc0c1\ud488\uc744 \ud310\ub9e4\ud558\ub294 \uacbd\uc6b0, \uc0ac\uc5c5\uc790\ub4f1\ub85d\uc774 \ud544\uc694\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4."
        ),
    },
    {
        "slug": "us-self-employment-taxes",
        "title": "Self-employment taxes for HispaloShop sellers in the US",
        "title_en": "Self-employment taxes for HispaloShop sellers in the US",
        "category": "fiscal_issue",
        "role_target": "all",
        "country_target": "US",
        "body": (
            "If you earn income through HispaloShop in the United States, you are responsible for reporting it on your tax return.\n\n"
            "**Key forms:**\n"
            "- **Schedule C** (Form 1040): Report business income and expenses\n"
            "- **Schedule SE**: Calculate self-employment tax (15.3%)\n"
            "- **Estimated payments**: Quarterly estimated tax payments (Form 1040-ES) if you expect to owe $1,000+\n\n"
            "HispaloShop will issue a **1099-NEC** if your annual earnings exceed $600.\n\n"
            "Consult a tax professional for your specific situation."
        ),
        "body_en": (
            "If you earn income through HispaloShop in the US, report it as self-employment income on Schedule C."
        ),
    },
    {
        "slug": "understanding-1099-nec",
        "title": "Understanding your 1099-NEC from HispaloShop",
        "title_en": "Understanding your 1099-NEC from HispaloShop",
        "category": "fiscal_issue",
        "role_target": "all",
        "country_target": "US",
        "body": (
            "If you are a US person and earn $600 or more from HispaloShop in a calendar year, you will receive a **1099-NEC** form.\n\n"
            "**What is it?** A 1099-NEC reports non-employee compensation paid to you by HispaloShop LLC.\n\n"
            "**When does it arrive?** By January 31 of the following year.\n\n"
            "**How to report it:** Include the amount on Schedule C of your Form 1040.\n\n"
            "**Important:** You must have a valid W-9 on file to receive payouts. If your 1099-NEC has errors, contact support@hispaloshop.com."
        ),
        "body_en": (
            "The 1099-NEC reports non-employee compensation from HispaloShop. Include it on Schedule C."
        ),
    },
]


async def seed_kb_articles() -> None:
    """Insert seed articles only if their slug is not present yet (idempotent)."""
    now = _now_iso()
    inserted = 0
    for art in SEED_ARTICLES:
        existing = await db.support_articles.find_one({"slug": art["slug"]}, {"_id": 0, "slug": 1})
        if existing:
            continue
        doc = {
            "slug": art["slug"],
            "title": art.get("title"),
            "title_en": art.get("title_en"),
            "title_ko": art.get("title_ko"),
            "body": art.get("body", ""),
            "body_en": art.get("body_en", ""),
            "body_ko": art.get("body_ko", ""),
            "category": art.get("category", "other"),
            "role_target": art.get("role_target", "all"),
            "country_target": art.get("country_target", "all"),
            "published": True,
            "view_count": 0,
            "created_at": now,
            "updated_at": now,
        }
        await db.support_articles.insert_one(doc)
        inserted += 1
    if inserted:
        import logging
        logging.getLogger(__name__).info("[SUPPORT] Seeded %d KB articles", inserted)

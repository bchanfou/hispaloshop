"""
Modelo 190 quarterly report service.
Generates internal PDF reports listing withholdings applied to Spanish influencers.
"""
import io
import logging
import time
import cloudinary
import cloudinary.uploader
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)

from core.database import db

logger = logging.getLogger(__name__)

QUARTER_MONTHS = {
    1: "enero–febrero–marzo",
    2: "abril–mayo–junio",
    3: "julio–agosto–septiembre",
    4: "octubre–noviembre–diciembre",
}


async def generate_quarterly_report(year: int, quarter: int) -> dict:
    """
    Generate quarterly withholding report PDF for Modelo 190.
    Returns { pdf_url, total_gross, total_withheld, total_net, perceptors_count }.
    """

    # 1. Fetch all Spanish influencers with withholdings in this quarter
    influencers = await db.influencers.find(
        {"fiscal_status.tax_country": "ES"},
        {"_id": 0},
    ).to_list(2000)

    perceptors = []
    total_gross = 0
    total_withheld = 0
    total_net = 0

    for inf in influencers:
        records = inf.get("withholding_records", [])
        qr = next(
            (r for r in records
             if r.get("year") == year and r.get("quarter") == quarter
             and r.get("amount_withheld", 0) > 0),
            None,
        )
        if not qr:
            continue

        gross = round(qr.get("amount_gross", 0), 2)
        withheld = round(qr.get("amount_withheld", 0), 2)
        net = round(qr.get("amount_paid", 0), 2)

        # Get NIF from user doc
        user_doc = await db.users.find_one(
            {"user_id": inf.get("user_id")},
            {"_id": 0, "vat_cif": 1, "name": 1},
        ) if inf.get("user_id") else None

        nif = (user_doc or {}).get("vat_cif", inf.get("fiscal_status", {}).get("entity_name", "—"))
        name = inf.get("full_name") or (user_doc or {}).get("name", "—")

        perceptors.append({
            "nif": nif or "—",
            "name": name,
            "gross": gross,
            "withheld": withheld,
            "net": net,
            "influencer_id": inf.get("influencer_id"),
        })

        total_gross += gross
        total_withheld += withheld
        total_net += net

    # Sort by NIF
    perceptors.sort(key=lambda p: p["nif"])

    # 2. Generate PDF
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
    )

    black = colors.HexColor("#0A0A0A")
    stone = colors.HexColor("#8A8881")
    border_c = colors.HexColor("#E5E2DA")
    surface = colors.HexColor("#F0EDE8")

    styles = getSampleStyleSheet()
    style_title = ParagraphStyle(
        "title190", parent=styles["Title"],
        fontName="Helvetica-Bold", fontSize=22,
        textColor=black, spaceAfter=4,
    )
    style_subtitle = ParagraphStyle(
        "sub190", parent=styles["Normal"],
        fontName="Helvetica", fontSize=12,
        textColor=stone, spaceAfter=6,
    )
    style_heading = ParagraphStyle(
        "heading190", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=11,
        textColor=black, spaceAfter=8, spaceBefore=16,
    )
    style_body = ParagraphStyle(
        "body190", parent=styles["Normal"],
        fontName="Helvetica", fontSize=9,
        textColor=stone, spaceAfter=4,
    )
    style_footer = ParagraphStyle(
        "footer190", parent=styles["Normal"],
        fontName="Helvetica-Oblique", fontSize=8,
        textColor=stone, spaceAfter=4, spaceBefore=16,
        alignment=TA_CENTER,
    )

    elements = []

    # -- Portada --
    elements.append(Paragraph("HISPALOSHOP", style_title))
    elements.append(Paragraph("Informe de Retenciones — Modelo 190", style_subtitle))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("HispaloShop LLC", ParagraphStyle(
        "co", parent=styles["Normal"], fontName="Helvetica-Bold",
        fontSize=10, textColor=black,
    )))
    months_label = QUARTER_MONTHS.get(quarter, "")
    elements.append(Paragraph(
        f"Período: Q{quarter} {year} ({months_label})", style_body,
    ))
    gen_date = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    elements.append(Paragraph(f"Fecha de generación: {gen_date}", style_body))
    elements.append(Spacer(1, 20))

    # -- Resumen ejecutivo --
    elements.append(Paragraph("RESUMEN EJECUTIVO", style_heading))

    summary_data = [
        ["Concepto", "Importe"],
        ["Total comisiones brutas pagadas", f"{total_gross:,.2f}€"],
        ["Total retenciones practicadas (15%)", f"{total_withheld:,.2f}€"],
        ["Total comisiones netas transferidas", f"{total_net:,.2f}€"],
        ["Número de perceptores", str(len(perceptors))],
    ]
    summary_table = Table(summary_data, colWidths=[12 * cm, 5 * cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), surface),
        ("TEXTCOLOR", (0, 0), (-1, 0), black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), black),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, border_c),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    # -- Detalle por perceptor --
    elements.append(Paragraph("DETALLE POR PERCEPTOR", style_heading))

    if perceptors:
        detail_data = [["NIF", "Nombre", "Comisión bruta", "Retención (15%)", "Neto pagado"]]
        for p in perceptors:
            detail_data.append([
                p["nif"],
                p["name"],
                f"{p['gross']:,.2f}€",
                f"{p['withheld']:,.2f}€",
                f"{p['net']:,.2f}€",
            ])

        detail_table = Table(detail_data, colWidths=[3 * cm, 5.5 * cm, 3 * cm, 3 * cm, 3 * cm])
        detail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), surface),
            ("TEXTCOLOR", (0, 0), (-1, 0), black),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("TEXTCOLOR", (0, 1), (-1, -1), black),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, border_c),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(detail_table)
    else:
        elements.append(Paragraph("No hay perceptores con retención en este período.", style_body))

    # -- Footer --
    elements.append(Paragraph(
        "Este documento es un informe interno de apoyo para la presentación del "
        "Modelo 190 ante la AEAT. No sustituye al modelo oficial.",
        style_footer,
    ))

    doc.build(elements)
    pdf_bytes = buf.getvalue()
    buf.close()

    # 3. Upload to Cloudinary
    try:
        result = cloudinary.uploader.upload(
            pdf_bytes,
            folder="hispaloshop/tax_reports",
            public_id=f"modelo190_Q{quarter}_{year}",
            resource_type="raw",
            type="authenticated",
        )
        pdf_url = result["secure_url"]
    except Exception as e:
        logger.error(f"Modelo 190 Cloudinary upload failed: {e}")
        raise

    # 4. Mark records as filed
    for p in perceptors:
        inf_id = p["influencer_id"]
        inf_doc = await db.influencers.find_one(
            {"influencer_id": inf_id}, {"_id": 0, "withholding_records": 1}
        )
        if not inf_doc:
            continue
        records = inf_doc.get("withholding_records", [])
        for i, r in enumerate(records):
            if r.get("year") == year and r.get("quarter") == quarter:
                await db.influencers.update_one(
                    {"influencer_id": inf_id},
                    {"$set": {
                        f"withholding_records.{i}.model_190_filed": True,
                        f"withholding_records.{i}.filed_at": datetime.now(timezone.utc).isoformat(),
                    }},
                )
                break

    # 5. Save report record
    report_doc = {
        "report_id": f"tax_{year}_Q{quarter}_{int(time.time())}",
        "year": year,
        "quarter": quarter,
        "pdf_url": pdf_url,
        "total_gross": round(total_gross, 2),
        "total_withheld": round(total_withheld, 2),
        "total_net": round(total_net, 2),
        "perceptors_count": len(perceptors),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tax_reports.insert_one(report_doc)

    return {
        "pdf_url": pdf_url,
        "total_gross": round(total_gross, 2),
        "total_withheld": round(total_withheld, 2),
        "total_net": round(total_net, 2),
        "perceptors_count": len(perceptors),
    }

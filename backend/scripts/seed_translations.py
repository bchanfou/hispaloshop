"""
Pre-seed the translation_cache collection with ~200 standard food terms.

Covers the V1 launch scope (ES → EN, ES → KO):
- 14 EU allergens
- 20 nutrition labels
- 16 product categories
- 10 certifications
- ~100 common food ingredients

These entries are marked confidence="high" and category-tagged so the
HispaloTranslate cache engine starts with a strong baseline on day 1.

Usage:
    cd backend
    python scripts/seed_translations.py
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

_backend_dir = Path(__file__).resolve().parents[1]
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_translations")

# ═══════════════════════════════════════════════════════════════════════════
# SEED DATA — ES source with EN + KO translations
# ═══════════════════════════════════════════════════════════════════════════

ALLERGENS = {
    "gluten": {"en": "gluten", "ko": "글루텐"},
    "crustáceos": {"en": "crustaceans", "ko": "갑각류"},
    "huevo": {"en": "egg", "ko": "달걀"},
    "pescado": {"en": "fish", "ko": "생선"},
    "cacahuete": {"en": "peanut", "ko": "땅콩"},
    "soja": {"en": "soy", "ko": "대두"},
    "leche": {"en": "milk", "ko": "우유"},
    "frutos secos": {"en": "tree nuts", "ko": "견과류"},
    "apio": {"en": "celery", "ko": "셀러리"},
    "mostaza": {"en": "mustard", "ko": "겨자"},
    "sésamo": {"en": "sesame", "ko": "참깨"},
    "sulfitos": {"en": "sulfites", "ko": "아황산염"},
    "altramuces": {"en": "lupin", "ko": "루핀"},
    "moluscos": {"en": "molluscs", "ko": "연체동물"},
}

NUTRITION_LABELS = {
    "energía": {"en": "energy", "ko": "에너지"},
    "calorías": {"en": "calories", "ko": "칼로리"},
    "grasas": {"en": "fat", "ko": "지방"},
    "grasas saturadas": {"en": "saturated fat", "ko": "포화지방"},
    "hidratos de carbono": {"en": "carbohydrates", "ko": "탄수화물"},
    "azúcares": {"en": "sugars", "ko": "당류"},
    "fibra alimentaria": {"en": "dietary fibre", "ko": "식이섬유"},
    "proteínas": {"en": "protein", "ko": "단백질"},
    "sal": {"en": "salt", "ko": "나트륨(소금)"},
    "por 100g": {"en": "per 100g", "ko": "100g당"},
    "por 100ml": {"en": "per 100ml", "ko": "100ml당"},
    "valor energético": {"en": "energy value", "ko": "열량"},
    "grasas monoinsaturadas": {"en": "monounsaturated fat", "ko": "단일불포화지방"},
    "grasas poliinsaturadas": {"en": "polyunsaturated fat", "ko": "다가불포화지방"},
    "colesterol": {"en": "cholesterol", "ko": "콜레스테롤"},
    "sodio": {"en": "sodium", "ko": "나트륨"},
    "vitamina A": {"en": "vitamin A", "ko": "비타민 A"},
    "vitamina C": {"en": "vitamin C", "ko": "비타민 C"},
    "calcio": {"en": "calcium", "ko": "칼슘"},
    "hierro": {"en": "iron", "ko": "철분"},
}

CATEGORIES = {
    "aceites": {"en": "olive oils", "ko": "올리브 오일"},
    "miel": {"en": "honey", "ko": "꿀"},
    "conservas": {"en": "preserves", "ko": "보존식품"},
    "panadería": {"en": "bakery", "ko": "빵"},
    "quesos": {"en": "cheeses", "ko": "치즈"},
    "embutidos": {"en": "cured meats", "ko": "육가공품"},
    "salsas": {"en": "sauces", "ko": "소스"},
    "especias": {"en": "spices", "ko": "향신료"},
    "legumbres": {"en": "legumes", "ko": "콩류"},
    "frutos secos": {"en": "nuts", "ko": "견과류"},
    "infusiones": {"en": "herbal teas", "ko": "허브차"},
    "vinos": {"en": "wines", "ko": "와인"},
    "frutas": {"en": "fruits", "ko": "과일"},
    "verduras": {"en": "vegetables", "ko": "채소"},
    "repostería": {"en": "pastry", "ko": "디저트"},
    "bebidas": {"en": "beverages", "ko": "음료"},
}

CERTIFICATIONS = {
    "orgánico": {"en": "organic", "ko": "유기농"},
    "ecológico": {"en": "ecological", "ko": "친환경"},
    "km0": {"en": "km0 (local)", "ko": "km0 (로컬)"},
    "sin gluten": {"en": "gluten-free", "ko": "글루텐 프리"},
    "vegano": {"en": "vegan", "ko": "비건"},
    "halal": {"en": "halal", "ko": "할랄"},
    "denominación de origen": {"en": "designation of origin", "ko": "원산지 지정"},
    "DOP": {"en": "PDO", "ko": "원산지 보호 지정"},
    "IGP": {"en": "PGI", "ko": "지리적 표시 보호"},
    "producción integrada": {"en": "integrated production", "ko": "통합 생산"},
}

INGREDIENTS = {
    "aceite de oliva": {"en": "olive oil", "ko": "올리브 오일"},
    "aceite de oliva virgen extra": {"en": "extra virgin olive oil", "ko": "엑스트라 버진 올리브 오일"},
    "sal": {"en": "salt", "ko": "소금"},
    "azúcar": {"en": "sugar", "ko": "설탕"},
    "harina de trigo": {"en": "wheat flour", "ko": "밀가루"},
    "agua": {"en": "water", "ko": "물"},
    "leche": {"en": "milk", "ko": "우유"},
    "huevo": {"en": "egg", "ko": "달걀"},
    "tomate": {"en": "tomato", "ko": "토마토"},
    "ajo": {"en": "garlic", "ko": "마늘"},
    "cebolla": {"en": "onion", "ko": "양파"},
    "pimiento": {"en": "pepper", "ko": "피망"},
    "aceite de girasol": {"en": "sunflower oil", "ko": "해바라기유"},
    "vinagre": {"en": "vinegar", "ko": "식초"},
    "mantequilla": {"en": "butter", "ko": "버터"},
    "nata": {"en": "cream", "ko": "크림"},
    "levadura": {"en": "yeast", "ko": "효모"},
    "almendra": {"en": "almond", "ko": "아몬드"},
    "nuez": {"en": "walnut", "ko": "호두"},
    "avellana": {"en": "hazelnut", "ko": "헤이즐넛"},
    "miel": {"en": "honey", "ko": "꿀"},
    "canela": {"en": "cinnamon", "ko": "계피"},
    "pimentón": {"en": "paprika", "ko": "파프리카"},
    "oregano": {"en": "oregano", "ko": "오레가노"},
    "tomillo": {"en": "thyme", "ko": "타임"},
    "romero": {"en": "rosemary", "ko": "로즈마리"},
    "perejil": {"en": "parsley", "ko": "파슬리"},
    "laurel": {"en": "bay leaf", "ko": "월계수 잎"},
    "pimienta negra": {"en": "black pepper", "ko": "후추"},
    "comino": {"en": "cumin", "ko": "커민"},
    "cúrcuma": {"en": "turmeric", "ko": "강황"},
    "jengibre": {"en": "ginger", "ko": "생강"},
    "leche de cabra": {"en": "goat milk", "ko": "염소유"},
    "leche de oveja": {"en": "sheep milk", "ko": "양유"},
    "cuajo": {"en": "rennet", "ko": "레닛"},
    "cerdo": {"en": "pork", "ko": "돼지고기"},
    "ternera": {"en": "beef", "ko": "소고기"},
    "pollo": {"en": "chicken", "ko": "닭고기"},
    "cordero": {"en": "lamb", "ko": "양고기"},
    "salmón": {"en": "salmon", "ko": "연어"},
    "atún": {"en": "tuna", "ko": "참치"},
    "bacalao": {"en": "cod", "ko": "대구"},
    "gamba": {"en": "shrimp", "ko": "새우"},
    "pulpo": {"en": "octopus", "ko": "문어"},
    "arroz": {"en": "rice", "ko": "쌀"},
    "maíz": {"en": "corn", "ko": "옥수수"},
    "garbanzo": {"en": "chickpea", "ko": "병아리콩"},
    "lenteja": {"en": "lentil", "ko": "렌틸콩"},
    "alubia": {"en": "bean", "ko": "강낭콩"},
    "patata": {"en": "potato", "ko": "감자"},
    "zanahoria": {"en": "carrot", "ko": "당근"},
    "calabacín": {"en": "zucchini", "ko": "애호박"},
    "espárrago": {"en": "asparagus", "ko": "아스파라거스"},
    "berenjena": {"en": "eggplant", "ko": "가지"},
    "espinaca": {"en": "spinach", "ko": "시금치"},
    "lechuga": {"en": "lettuce", "ko": "상추"},
    "limón": {"en": "lemon", "ko": "레몬"},
    "naranja": {"en": "orange", "ko": "오렌지"},
    "manzana": {"en": "apple", "ko": "사과"},
    "fresa": {"en": "strawberry", "ko": "딸기"},
    "uva": {"en": "grape", "ko": "포도"},
    "melocotón": {"en": "peach", "ko": "복숭아"},
    "higo": {"en": "fig", "ko": "무화과"},
    "granada": {"en": "pomegranate", "ko": "석류"},
    "chocolate": {"en": "chocolate", "ko": "초콜릿"},
    "cacao": {"en": "cocoa", "ko": "카카오"},
    "café": {"en": "coffee", "ko": "커피"},
    "té": {"en": "tea", "ko": "차"},
    "cerveza": {"en": "beer", "ko": "맥주"},
    "vino tinto": {"en": "red wine", "ko": "레드 와인"},
    "vino blanco": {"en": "white wine", "ko": "화이트 와인"},
    "aceite de sésamo": {"en": "sesame oil", "ko": "참기름"},
    "salsa de soja": {"en": "soy sauce", "ko": "간장"},
    "kimchi": {"en": "kimchi", "ko": "김치"},
    "gochujang": {"en": "gochujang", "ko": "고추장"},
}


async def main():
    # Import after path setup
    os.environ.setdefault("JWT_SECRET", "seed-script-dummy-32chars-ok!!!!!")
    os.environ.setdefault("MONGO_URL", os.environ.get("MONGO_URL", "mongodb://localhost:27017/hispaloshop"))

    from core.database import db

    now = datetime.now(timezone.utc).isoformat()
    all_entries = []

    for source_dict, category in [
        (ALLERGENS, "allergen"),
        (NUTRITION_LABELS, "nutrition_label"),
        (CATEGORIES, "category"),
        (CERTIFICATIONS, "certification"),
        (INGREDIENTS, "ingredient"),
    ]:
        for es_text, translations in source_dict.items():
            all_entries.append({
                "source_text": es_text,
                "source_lang": "es",
                "translations": translations,
                "category": category,
                "confidence": "high",
                "usage_count": 0,
                "first_seen": now,
                "last_used": now,
                "verified_by": "pre-seed",
            })

    # Upsert to avoid duplicates on re-run
    inserted = 0
    updated = 0
    for entry in all_entries:
        result = await db.translation_cache.update_one(
            {"source_text": entry["source_text"], "source_lang": entry["source_lang"]},
            {"$set": entry},
            upsert=True,
        )
        if result.upserted_id:
            inserted += 1
        else:
            updated += 1

    # Create index for fast lookups
    await db.translation_cache.create_index(
        [("source_text", 1), ("source_lang", 1)],
        unique=True,
    )
    await db.translation_cache.create_index("category")

    # Also create index for certificate_scans analytics
    await db.certificate_scans.create_index([("product_id", 1), ("scanned_at", -1)])
    await db.certificate_scans.create_index("language")
    await db.certificate_scans.create_index("country")

    total = inserted + updated
    logger.info(
        "[SEED] Done: %d entries (%d inserted, %d updated). "
        "Categories: %d allergens, %d nutrition, %d categories, %d certs, %d ingredients.",
        total, inserted, updated,
        len(ALLERGENS), len(NUTRITION_LABELS), len(CATEGORIES),
        len(CERTIFICATIONS), len(INGREDIENTS),
    )


if __name__ == "__main__":
    asyncio.run(main())

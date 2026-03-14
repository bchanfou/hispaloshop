"""
Translation service for product certificates.
- Static translations for known labels (certifications, allergens, nutrition fields)
- Dynamic translations via Claude Haiku for free-text (name, description, ingredients)
- MongoDB cache to avoid repeated API calls
"""

import os
import logging
from typing import List, Optional

from core.database import db

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'pt': 'Portuguese', 'ar': 'Arabic', 'hi': 'Hindi', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian'
}

# ── Static translations ─────────────────────────────────────────────
# Certifications
CERT_TRANSLATIONS = {
    "Ecológico": {"en": "Organic", "fr": "Biologique", "de": "Ökologisch", "pt": "Orgânico", "ar": "عضوي", "hi": "जैविक", "zh": "有机", "ja": "オーガニック", "ko": "유기농", "ru": "Органический"},
    "Bio": {"en": "Organic", "fr": "Bio", "de": "Bio", "pt": "Bio", "ar": "عضوي", "hi": "जैविक", "zh": "有机", "ja": "オーガニック", "ko": "유기농", "ru": "Био"},
    "Denominación de Origen": {"en": "Protected Designation of Origin", "fr": "Appellation d'Origine Protégée", "de": "Geschützte Ursprungsbezeichnung", "pt": "Denominação de Origem Protegida", "ar": "تسمية المنشأ المحمية", "hi": "संरक्षित मूल पदनाम", "zh": "受保护原产地名称", "ja": "原産地呼称保護", "ko": "원산지 명칭 보호", "ru": "Защищённое наименование места происхождения"},
    "Comercio Justo": {"en": "Fair Trade", "fr": "Commerce Équitable", "de": "Fairer Handel", "pt": "Comércio Justo", "ar": "التجارة العادلة", "hi": "निष्पक्ष व्यापार", "zh": "公平贸易", "ja": "フェアトレード", "ko": "공정무역", "ru": "Справедливая торговля"},
    "Sin Gluten": {"en": "Gluten-Free", "fr": "Sans Gluten", "de": "Glutenfrei", "pt": "Sem Glúten", "ar": "خالٍ من الغلوتين", "hi": "ग्लूटेन-मुक्त", "zh": "无麸质", "ja": "グルテンフリー", "ko": "글루텐 프리", "ru": "Без глютена"},
    "Vegano": {"en": "Vegan", "fr": "Végan", "de": "Vegan", "pt": "Vegano", "ar": "نباتي", "hi": "शाकाहारी", "zh": "纯素", "ja": "ヴィーガン", "ko": "비건", "ru": "Веганский"},
    "Vegetariano": {"en": "Vegetarian", "fr": "Végétarien", "de": "Vegetarisch", "pt": "Vegetariano", "ar": "نباتي", "hi": "शाकाहारी", "zh": "素食", "ja": "ベジタリアン", "ko": "채식", "ru": "Вегетарианский"},
    "Sin Lactosa": {"en": "Lactose-Free", "fr": "Sans Lactose", "de": "Laktosefrei", "pt": "Sem Lactose", "ar": "خالٍ من اللاكتوز", "hi": "लैक्टोज-मुक्त", "zh": "无乳糖", "ja": "ラクトースフリー", "ko": "유당 프리", "ru": "Без лактозы"},
    "Kosher": {"en": "Kosher", "fr": "Casher", "de": "Koscher", "pt": "Kosher", "ar": "حلال يهودي", "hi": "कोषर", "zh": "犹太洁食", "ja": "コーシャ", "ko": "코셔", "ru": "Кошерный"},
    "Halal": {"en": "Halal", "fr": "Halal", "de": "Halal", "pt": "Halal", "ar": "حلال", "hi": "हलाल", "zh": "清真", "ja": "ハラール", "ko": "할랄", "ru": "Халяль"},
}

# Allergens
ALLERGEN_TRANSLATIONS = {
    "Gluten": {"en": "Gluten", "fr": "Gluten", "de": "Gluten", "pt": "Glúten", "ar": "غلوتين", "hi": "ग्लूटेन", "zh": "麸质", "ja": "グルテン", "ko": "글루텐", "ru": "Глютен"},
    "Lácteos": {"en": "Dairy", "fr": "Produits Laitiers", "de": "Milchprodukte", "pt": "Laticínios", "ar": "ألبان", "hi": "डेयरी", "zh": "乳制品", "ja": "乳製品", "ko": "유제품", "ru": "Молочные"},
    "Leche": {"en": "Milk", "fr": "Lait", "de": "Milch", "pt": "Leite", "ar": "حليب", "hi": "दूध", "zh": "牛奶", "ja": "乳", "ko": "우유", "ru": "Молоко"},
    "Huevos": {"en": "Eggs", "fr": "Œufs", "de": "Eier", "pt": "Ovos", "ar": "بيض", "hi": "अंडे", "zh": "鸡蛋", "ja": "卵", "ko": "달걀", "ru": "Яйца"},
    "Frutos secos": {"en": "Tree Nuts", "fr": "Fruits à Coque", "de": "Schalenfrüchte", "pt": "Frutos Secos", "ar": "مكسرات", "hi": "मेवे", "zh": "坚果", "ja": "ナッツ類", "ko": "견과류", "ru": "Орехи"},
    "Cacahuetes": {"en": "Peanuts", "fr": "Arachides", "de": "Erdnüsse", "pt": "Amendoins", "ar": "فول سوداني", "hi": "मूंगफली", "zh": "花生", "ja": "ピーナッツ", "ko": "땅콩", "ru": "Арахис"},
    "Soja": {"en": "Soy", "fr": "Soja", "de": "Soja", "pt": "Soja", "ar": "صويا", "hi": "सोया", "zh": "大豆", "ja": "大豆", "ko": "대두", "ru": "Соя"},
    "Pescado": {"en": "Fish", "fr": "Poisson", "de": "Fisch", "pt": "Peixe", "ar": "سمك", "hi": "मछली", "zh": "鱼", "ja": "魚", "ko": "생선", "ru": "Рыба"},
    "Mariscos": {"en": "Shellfish", "fr": "Crustacés", "de": "Schalentiere", "pt": "Mariscos", "ar": "محار", "hi": "शंख", "zh": "贝类", "ja": "甲殻類", "ko": "갑각류", "ru": "Моллюски"},
    "Sésamo": {"en": "Sesame", "fr": "Sésame", "de": "Sesam", "pt": "Sésamo", "ar": "سمسم", "hi": "तिल", "zh": "芝麻", "ja": "ゴマ", "ko": "참깨", "ru": "Кунжут"},
    "Mostaza": {"en": "Mustard", "fr": "Moutarde", "de": "Senf", "pt": "Mostarda", "ar": "خردل", "hi": "सरसों", "zh": "芥末", "ja": "マスタード", "ko": "겨자", "ru": "Горчица"},
    "Apio": {"en": "Celery", "fr": "Céleri", "de": "Sellerie", "pt": "Aipo", "ar": "كرفس", "hi": "अजवाइन", "zh": "芹菜", "ja": "セロリ", "ko": "셀러리", "ru": "Сельдерей"},
    "Sulfitos": {"en": "Sulphites", "fr": "Sulfites", "de": "Sulfite", "pt": "Sulfitos", "ar": "كبريتيت", "hi": "सल्फाइट", "zh": "亚硫酸盐", "ja": "亜硫酸塩", "ko": "아황산염", "ru": "Сульфиты"},
    "Altramuces": {"en": "Lupin", "fr": "Lupin", "de": "Lupinen", "pt": "Tremoços", "ar": "ترمس", "hi": "ल्यूपिन", "zh": "羽扇豆", "ja": "ルピナス", "ko": "루핀", "ru": "Люпин"},
    "Moluscos": {"en": "Molluscs", "fr": "Mollusques", "de": "Weichtiere", "pt": "Moluscos", "ar": "رخويات", "hi": "मोलस्क", "zh": "软体动物", "ja": "軟体動物", "ko": "연체동물", "ru": "Моллюски"},
}

# Nutritional info field labels
NUTRITION_LABELS = {
    "Calorías": {"en": "Calories", "fr": "Calories", "de": "Kalorien", "pt": "Calorias", "ar": "سعرات حرارية", "hi": "कैलोरी", "zh": "热量", "ja": "カロリー", "ko": "칼로리", "ru": "Калории"},
    "Grasas": {"en": "Fat", "fr": "Matières Grasses", "de": "Fett", "pt": "Gorduras", "ar": "دهون", "hi": "वसा", "zh": "脂肪", "ja": "脂質", "ko": "지방", "ru": "Жиры"},
    "Grasas saturadas": {"en": "Saturated Fat", "fr": "Acides Gras Saturés", "de": "Gesättigte Fettsäuren", "pt": "Gorduras Saturadas", "ar": "دهون مشبعة", "hi": "संतृप्त वसा", "zh": "饱和脂肪", "ja": "飽和脂肪酸", "ko": "포화지방", "ru": "Насыщенные жиры"},
    "Carbohidratos": {"en": "Carbohydrates", "fr": "Glucides", "de": "Kohlenhydrate", "pt": "Carboidratos", "ar": "كربوهيدرات", "hi": "कार्बोहाइड्रेट", "zh": "碳水化合物", "ja": "炭水化物", "ko": "탄수화물", "ru": "Углеводы"},
    "Azúcares": {"en": "Sugars", "fr": "Sucres", "de": "Zucker", "pt": "Açúcares", "ar": "سكريات", "hi": "शर्करा", "zh": "糖", "ja": "糖類", "ko": "당류", "ru": "Сахара"},
    "Proteínas": {"en": "Protein", "fr": "Protéines", "de": "Eiweiß", "pt": "Proteínas", "ar": "بروتين", "hi": "प्रोटीन", "zh": "蛋白质", "ja": "たんぱく質", "ko": "단백질", "ru": "Белки"},
    "Sal": {"en": "Salt", "fr": "Sel", "de": "Salz", "pt": "Sal", "ar": "ملح", "hi": "नमक", "zh": "盐", "ja": "食塩相当量", "ko": "나트륨", "ru": "Соль"},
    "Fibra": {"en": "Fibre", "fr": "Fibres", "de": "Ballaststoffe", "pt": "Fibra", "ar": "ألياف", "hi": "फाइबर", "zh": "膳食纤维", "ja": "食物繊維", "ko": "식이섬유", "ru": "Клетчатка"},
}

# Certificate UI labels
CERT_UI_LABELS = {
    "es": {
        "certificate_title": "Certificado Digital de Producto",
        "certificate_id": "Nº Certificado",
        "issued": "Emitido",
        "product": "Producto",
        "producer": "Productor",
        "origin": "Origen",
        "certifications": "Certificaciones",
        "ingredients": "Ingredientes",
        "allergens": "Alérgenos",
        "nutrition": "Información Nutricional",
        "per_100g": "por 100g",
        "verified": "Verificado por Hispaloshop",
        "scan_qr": "Escanea el QR para verificar",
        "status_active": "Activo",
        "status_revoked": "Revocado",
    },
    "en": {
        "certificate_title": "Digital Product Certificate",
        "certificate_id": "Certificate No.",
        "issued": "Issued",
        "product": "Product",
        "producer": "Producer",
        "origin": "Origin",
        "certifications": "Certifications",
        "ingredients": "Ingredients",
        "allergens": "Allergens",
        "nutrition": "Nutritional Information",
        "per_100g": "per 100g",
        "verified": "Verified by Hispaloshop",
        "scan_qr": "Scan QR to verify",
        "status_active": "Active",
        "status_revoked": "Revoked",
    },
    "fr": {
        "certificate_title": "Certificat Numérique de Produit",
        "certificate_id": "N° Certificat",
        "issued": "Émis",
        "product": "Produit",
        "producer": "Producteur",
        "origin": "Origine",
        "certifications": "Certifications",
        "ingredients": "Ingrédients",
        "allergens": "Allergènes",
        "nutrition": "Informations Nutritionnelles",
        "per_100g": "pour 100g",
        "verified": "Vérifié par Hispaloshop",
        "scan_qr": "Scannez le QR pour vérifier",
        "status_active": "Actif",
        "status_revoked": "Révoqué",
    },
    "de": {
        "certificate_title": "Digitales Produktzertifikat",
        "certificate_id": "Zertifikat Nr.",
        "issued": "Ausgestellt",
        "product": "Produkt",
        "producer": "Hersteller",
        "origin": "Herkunft",
        "certifications": "Zertifizierungen",
        "ingredients": "Zutaten",
        "allergens": "Allergene",
        "nutrition": "Nährwertinformationen",
        "per_100g": "pro 100g",
        "verified": "Verifiziert von Hispaloshop",
        "scan_qr": "QR scannen zur Verifizierung",
        "status_active": "Aktiv",
        "status_revoked": "Widerrufen",
    },
    "pt": {
        "certificate_title": "Certificado Digital de Produto",
        "certificate_id": "Nº Certificado",
        "issued": "Emitido",
        "product": "Produto",
        "producer": "Produtor",
        "origin": "Origem",
        "certifications": "Certificações",
        "ingredients": "Ingredientes",
        "allergens": "Alérgenos",
        "nutrition": "Informação Nutricional",
        "per_100g": "por 100g",
        "verified": "Verificado pela Hispaloshop",
        "scan_qr": "Escaneie o QR para verificar",
        "status_active": "Ativo",
        "status_revoked": "Revogado",
    },
    "ar": {
        "certificate_title": "شهادة المنتج الرقمية",
        "certificate_id": "رقم الشهادة",
        "issued": "صدر بتاريخ",
        "product": "المنتج",
        "producer": "المنتِج",
        "origin": "المنشأ",
        "certifications": "الشهادات",
        "ingredients": "المكونات",
        "allergens": "مسببات الحساسية",
        "nutrition": "المعلومات الغذائية",
        "per_100g": "لكل 100غ",
        "verified": "تم التحقق من قبل Hispaloshop",
        "scan_qr": "امسح رمز QR للتحقق",
        "status_active": "نشط",
        "status_revoked": "ملغى",
    },
    "hi": {
        "certificate_title": "डिजिटल उत्पाद प्रमाणपत्र",
        "certificate_id": "प्रमाणपत्र संख्या",
        "issued": "जारी",
        "product": "उत्पाद",
        "producer": "उत्पादक",
        "origin": "मूल",
        "certifications": "प्रमाणन",
        "ingredients": "सामग्री",
        "allergens": "एलर्जी कारक",
        "nutrition": "पोषण संबंधी जानकारी",
        "per_100g": "प्रति 100 ग्राम",
        "verified": "Hispaloshop द्वारा सत्यापित",
        "scan_qr": "सत्यापित करने के लिए QR स्कैन करें",
        "status_active": "सक्रिय",
        "status_revoked": "रद्द",
    },
    "zh": {
        "certificate_title": "数字产品证书",
        "certificate_id": "证书编号",
        "issued": "签发日期",
        "product": "产品",
        "producer": "生产商",
        "origin": "产地",
        "certifications": "认证",
        "ingredients": "配料",
        "allergens": "过敏原",
        "nutrition": "营养信息",
        "per_100g": "每100克",
        "verified": "由Hispaloshop验证",
        "scan_qr": "扫描二维码验证",
        "status_active": "有效",
        "status_revoked": "已撤销",
    },
    "ja": {
        "certificate_title": "デジタル製品証明書",
        "certificate_id": "証明書番号",
        "issued": "発行日",
        "product": "製品",
        "producer": "生産者",
        "origin": "原産地",
        "certifications": "認証",
        "ingredients": "原材料",
        "allergens": "アレルゲン",
        "nutrition": "栄養情報",
        "per_100g": "100gあたり",
        "verified": "Hispaloshopにより検証済み",
        "scan_qr": "QRをスキャンして検証",
        "status_active": "有効",
        "status_revoked": "取消済み",
    },
    "ko": {
        "certificate_title": "디지털 제품 인증서",
        "certificate_id": "인증서 번호",
        "issued": "발행일",
        "product": "제품",
        "producer": "생산자",
        "origin": "원산지",
        "certifications": "인증",
        "ingredients": "성분",
        "allergens": "알레르기 유발 물질",
        "nutrition": "영양 정보",
        "per_100g": "100g당",
        "verified": "Hispaloshop 인증",
        "scan_qr": "QR을 스캔하여 인증",
        "status_active": "활성",
        "status_revoked": "취소됨",
    },
    "ru": {
        "certificate_title": "Цифровой сертификат продукта",
        "certificate_id": "№ Сертификата",
        "issued": "Выдан",
        "product": "Продукт",
        "producer": "Производитель",
        "origin": "Происхождение",
        "certifications": "Сертификации",
        "ingredients": "Ингредиенты",
        "allergens": "Аллергены",
        "nutrition": "Пищевая ценность",
        "per_100g": "на 100г",
        "verified": "Проверено Hispaloshop",
        "scan_qr": "Отсканируйте QR для проверки",
        "status_active": "Активен",
        "status_revoked": "Отозван",
    },
}


def translate_static(value: str, table: dict, target_lang: str) -> str:
    """Look up a static translation. Falls back to original value."""
    entry = table.get(value)
    if entry and target_lang in entry:
        return entry[target_lang]
    return value


def translate_certifications(certs: list, target_lang: str) -> list:
    return [translate_static(c, CERT_TRANSLATIONS, target_lang) for c in certs]


def translate_allergens(allergens: list, target_lang: str) -> list:
    return [translate_static(a, ALLERGEN_TRANSLATIONS, target_lang) for a in allergens]


def translate_nutrition_labels(nutrition: dict, target_lang: str) -> dict:
    """Translate nutrition field keys, keep values as-is."""
    translated = {}
    for key, value in nutrition.items():
        translated_key = translate_static(key, NUTRITION_LABELS, target_lang)
        translated[translated_key] = value
    return translated


# ── Dynamic translation via Claude Haiku ─────────────────────────────

async def _translate_with_haiku(text: str, source_lang: str, target_lang: str) -> str:
    """Translate free-text using Claude Haiku, with MongoDB cache."""
    if not text or not text.strip():
        return text

    # Check cache first
    cached = await db.translation_cache.find_one({
        "source_text": text,
        "source_lang": source_lang,
        "target_lang": target_lang,
    }, {"_id": 0, "translated_text": 1})

    if cached:
        return cached["translated_text"]

    # Call Claude Haiku
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("[TRANSLATION] No ANTHROPIC_API_KEY — returning original text")
        return text

    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)

        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(target_lang, target_lang)

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": f"Translate the following text from {source_name} to {target_name}. Return ONLY the translated text, nothing else.\n\n{text}"
            }]
        )

        translated = response.content[0].text.strip()

        # Cache result
        await db.translation_cache.update_one(
            {"source_text": text, "source_lang": source_lang, "target_lang": target_lang},
            {"$set": {"translated_text": translated}},
            upsert=True,
        )

        return translated
    except Exception as e:
        logger.error(f"[TRANSLATION] Haiku translation failed: {e}")
        return text


async def _translate_list_with_haiku(items: list, source_lang: str, target_lang: str) -> list:
    """Translate a list of strings, each individually cached."""
    results = []
    for item in items:
        results.append(await _translate_with_haiku(item, source_lang, target_lang))
    return results


# ── Public API (TranslationService) ──────────────────────────────────

class TranslationService:

    @staticmethod
    async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang:
            return text
        return await _translate_with_haiku(text, source_lang, target_lang)

    @staticmethod
    async def translate_list(items: List[str], source_lang: str, target_lang: str) -> List[str]:
        if source_lang == target_lang:
            return items
        return await _translate_list_with_haiku(items, source_lang, target_lang)

    @staticmethod
    async def translate_product_fields(product: dict, source_lang: str, target_lang: str) -> dict:
        if source_lang == target_lang:
            return {}

        translated = {}

        # Dynamic fields via Haiku
        if product.get("name"):
            translated["name"] = await _translate_with_haiku(product["name"], source_lang, target_lang)
        if product.get("description"):
            translated["description"] = await _translate_with_haiku(product["description"], source_lang, target_lang)

        # Static translations for known labels
        if product.get("ingredients"):
            translated["ingredients"] = await _translate_list_with_haiku(product["ingredients"], source_lang, target_lang)
        if product.get("allergens"):
            translated["allergens"] = translate_allergens(product["allergens"], target_lang)
        if product.get("certifications"):
            translated["certifications"] = translate_certifications(product["certifications"], target_lang)

        return translated

    @staticmethod
    async def translate_certificate_data(cert_data: dict, source_lang: str, target_lang: str) -> dict:
        if source_lang == target_lang:
            return cert_data

        translated = dict(cert_data)

        # Dynamic: product name
        if translated.get("product_name"):
            translated["product_name"] = await _translate_with_haiku(translated["product_name"], source_lang, target_lang)

        # Static: certifications, allergens, nutrition labels
        if translated.get("certifications"):
            translated["certifications"] = translate_certifications(translated["certifications"], target_lang)
        if translated.get("allergens"):
            translated["allergens"] = translate_allergens(translated["allergens"], target_lang)
        if translated.get("nutritional_info"):
            translated["nutritional_info"] = translate_nutrition_labels(translated["nutritional_info"], target_lang)

        # Dynamic: ingredients
        if translated.get("ingredients"):
            translated["ingredients"] = await _translate_list_with_haiku(translated["ingredients"], source_lang, target_lang)

        # Add UI labels for the target language
        translated["ui_labels"] = CERT_UI_LABELS.get(target_lang, CERT_UI_LABELS["en"])

        return translated

    @staticmethod
    async def get_product_in_language(product_id: str, target_lang: str):
        product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
        if not product:
            return None

        source_lang = product.get("source_language", "es")
        if target_lang == source_lang:
            return product

        # Check if we have cached translated fields
        cached_translations = product.get("translated_fields", {}).get(target_lang)
        if cached_translations:
            product.update(cached_translations)
            return product

        # Translate and cache
        translated_fields = await TranslationService.translate_product_fields(product, source_lang, target_lang)
        if translated_fields:
            await db.products.update_one(
                {"product_id": product_id},
                {"$set": {f"translated_fields.{target_lang}": translated_fields}}
            )
            product.update(translated_fields)

        return product

    @staticmethod
    async def get_certificate_in_language(certificate_id: str, target_lang: str):
        cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
        if not cert:
            # Also try product_certificates collection
            cert = await db.product_certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
        if not cert:
            return None

        source_lang = cert.get("source_language", "es")
        if target_lang == source_lang:
            cert["ui_labels"] = CERT_UI_LABELS.get(target_lang, CERT_UI_LABELS["es"])
            return cert

        # Check cached translation
        cached = cert.get("translated_fields", {}).get(target_lang)
        if cached:
            cert.update(cached)
            cert["ui_labels"] = CERT_UI_LABELS.get(target_lang, CERT_UI_LABELS["en"])
            return cert

        # Translate and cache
        translated = await TranslationService.translate_certificate_data(cert, source_lang, target_lang)
        cache_fields = {k: v for k, v in translated.items() if k not in ("ui_labels",)}
        collection = db.certificates if await db.certificates.find_one({"certificate_id": certificate_id}) else db.product_certificates
        await collection.update_one(
            {"certificate_id": certificate_id},
            {"$set": {f"translated_fields.{target_lang}": cache_fields}}
        )

        return translated

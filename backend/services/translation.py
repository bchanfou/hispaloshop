"""
Translation service for HispaloShop.
- Static translations for known labels (certifications, allergens, nutrition fields)
- Dynamic translations via Google Cloud Translation API for free-text
- 3-tier cache: Redis (hot) → MongoDB (permanent) → Google API
"""

import json
import hashlib
import logging
import os
from typing import List, Optional, Tuple

from core.database import db
from core.constants import SUPPORTED_LANGUAGES, TRANSLATION_LANGUAGES

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {code: info["name"] for code, info in SUPPORTED_LANGUAGES.items()}

RTL_LANGUAGES = {"ar", "fa", "ur"}

# ── Static translations ─────────────────────────────────────────────
# Certifications
CERT_TRANSLATIONS = {
    "Ecológico": {"en": "Organic", "fr": "Biologique", "de": "Ökologisch", "pt": "Orgânico", "ar": "عضوي", "hi": "जैविक", "zh": "有机", "ja": "オーガニック", "ko": "유기농", "ru": "Органический", "it": "Biologico", "nl": "Biologisch", "pl": "Ekologiczny", "tr": "Organik", "sv": "Ekologisk", "ro": "Ecologic", "cs": "Ekologický", "el": "Βιολογικό", "hu": "Ökológiai", "uk": "Органічний", "th": "ออร์แกนิก", "vi": "Hữu cơ", "id": "Organik", "tl": "Organiko", "bn": "জৈব", "ta": "கரிம", "ur": "نامیاتی", "fa": "ارگانیک", "sw": "Hai kemikali"},
    "Bio": {"en": "Organic", "fr": "Bio", "de": "Bio", "pt": "Bio", "ar": "عضوي", "hi": "जैविक", "zh": "有机", "ja": "オーガニック", "ko": "유기농", "ru": "Био", "it": "Bio", "nl": "Bio", "pl": "Bio", "tr": "Bio", "sv": "Bio", "ro": "Bio", "cs": "Bio", "el": "Βιο", "hu": "Bio", "uk": "Біо", "th": "ไบโอ", "vi": "Bio", "id": "Bio", "tl": "Bio", "bn": "বায়ো", "ta": "பயோ", "ur": "بائیو", "fa": "بیو", "sw": "Bio"},
    "Denominación de Origen": {"en": "Protected Designation of Origin", "fr": "Appellation d'Origine Protégée", "de": "Geschützte Ursprungsbezeichnung", "pt": "Denominação de Origem Protegida", "ar": "تسمية المنشأ المحمية", "hi": "संरक्षित मूल पदनाम", "zh": "受保护原产地名称", "ja": "原産地呼称保護", "ko": "원산지 명칭 보호", "ru": "Защищённое наименование места происхождения", "it": "Denominazione di Origine Protetta", "nl": "Beschermde Oorsprongsbenaming", "pl": "Chroniona Nazwa Pochodzenia", "tr": "Korunan Menşe Adı", "sv": "Skyddad Ursprungsbeteckning", "ro": "Denumire de Origine Protejată", "cs": "Chráněné označení původu", "el": "Προστατευόμενη Ονομασία Προέλευσης", "hu": "Oltalom alatt álló eredetmegjelölés", "uk": "Захищене найменування місця походження", "th": "สิ่งบ่งชี้ทางภูมิศาสตร์", "vi": "Chỉ dẫn địa lý được bảo hộ", "id": "Indikasi Geografis Terlindungi", "tl": "Protektadong Pangalan ng Pinagmulan", "bn": "সুরক্ষিত উৎস পদবী", "ta": "பாதுகாக்கப்பட்ட மூல பெயர்", "ur": "محفوظ نام اصل", "fa": "نام مبدأ محافظت‌شده", "sw": "Jina la Asili Linalolindwa"},
    "Comercio Justo": {"en": "Fair Trade", "fr": "Commerce Équitable", "de": "Fairer Handel", "pt": "Comércio Justo", "ar": "التجارة العادلة", "hi": "निष्पक्ष व्यापार", "zh": "公平贸易", "ja": "フェアトレード", "ko": "공정무역", "ru": "Справедливая торговля", "it": "Commercio Equo", "nl": "Eerlijke Handel", "pl": "Sprawiedliwy Handel", "tr": "Adil Ticaret", "sv": "Rättvis Handel", "ro": "Comerț Echitabil", "cs": "Spravedlivý obchod", "el": "Δίκαιο Εμπόριο", "hu": "Méltányos kereskedelem", "uk": "Справедлива торгівля", "th": "การค้าที่เป็นธรรม", "vi": "Thương mại công bằng", "id": "Perdagangan Adil", "tl": "Patas na Kalakalan", "bn": "ন্যায্য বাণিজ্য", "ta": "நியாயமான வர்த்தகம்", "ur": "منصفانہ تجارت", "fa": "تجارت عادلانه", "sw": "Biashara ya Haki"},
    "Sin Gluten": {"en": "Gluten-Free", "fr": "Sans Gluten", "de": "Glutenfrei", "pt": "Sem Glúten", "ar": "خالٍ من الغلوتين", "hi": "ग्लूटेन-मुक्त", "zh": "无麸质", "ja": "グルテンフリー", "ko": "글루텐 프리", "ru": "Без глютена", "it": "Senza Glutine", "nl": "Glutenvrij", "pl": "Bezglutenowy", "tr": "Glütensiz", "sv": "Glutenfri", "ro": "Fără Gluten", "cs": "Bezlepkový", "el": "Χωρίς Γλουτένη", "hu": "Gluténmentes", "uk": "Без глютену", "th": "ปราศจากกลูเตน", "vi": "Không chứa Gluten", "id": "Bebas Gluten", "tl": "Walang Gluten", "bn": "গ্লুটেন-মুক্ত", "ta": "குளூட்டன் இல்லாத", "ur": "گلوٹین سے پاک", "fa": "بدون گلوتن", "sw": "Bila Gluteni"},
    "Vegano": {"en": "Vegan", "fr": "Végan", "de": "Vegan", "pt": "Vegano", "ar": "نباتي", "hi": "शाकाहारी", "zh": "纯素", "ja": "ヴィーガン", "ko": "비건", "ru": "Веганский", "it": "Vegano", "nl": "Veganistisch", "pl": "Wegański", "tr": "Vegan", "sv": "Vegansk", "ro": "Vegan", "cs": "Veganský", "el": "Βίγκαν", "hu": "Vegán", "uk": "Веганський", "th": "วีแกน", "vi": "Thuần chay", "id": "Vegan", "tl": "Vegan", "bn": "ভেগান", "ta": "வீகன்", "ur": "ویگن", "fa": "وگان", "sw": "Vegan"},
    "Vegetariano": {"en": "Vegetarian", "fr": "Végétarien", "de": "Vegetarisch", "pt": "Vegetariano", "ar": "نباتي", "hi": "शाकाहारी", "zh": "素食", "ja": "ベジタリアン", "ko": "채식", "ru": "Вегетарианский", "it": "Vegetariano", "nl": "Vegetarisch", "pl": "Wegetariański", "tr": "Vejetaryen", "sv": "Vegetarisk", "ro": "Vegetarian", "cs": "Vegetariánský", "el": "Χορτοφαγικό", "hu": "Vegetáriánus", "uk": "Вегетаріанський", "th": "มังสวิรัติ", "vi": "Chay", "id": "Vegetarian", "tl": "Vegetarian", "bn": "নিরামিষ", "ta": "சைவம்", "ur": "سبزی خور", "fa": "گیاهخوار", "sw": "Mboga tu"},
    "Sin Lactosa": {"en": "Lactose-Free", "fr": "Sans Lactose", "de": "Laktosefrei", "pt": "Sem Lactose", "ar": "خالٍ من اللاكتوز", "hi": "लैक्टोज-मुक्त", "zh": "无乳糖", "ja": "ラクトースフリー", "ko": "유당 프리", "ru": "Без лактозы", "it": "Senza Lattosio", "nl": "Lactosevrij", "pl": "Bez Laktozy", "tr": "Laktozsuz", "sv": "Laktosfri", "ro": "Fără Lactoză", "cs": "Bez Laktózy", "el": "Χωρίς Λακτόζη", "hu": "Laktózmentes", "uk": "Без лактози", "th": "ปราศจากแลคโตส", "vi": "Không Lactose", "id": "Bebas Laktosa", "tl": "Walang Lactose", "bn": "ল্যাক্টোজ-মুক্ত", "ta": "லாக்டோஸ் இல்லாத", "ur": "لیکٹوز سے پاک", "fa": "بدون لاکتوز", "sw": "Bila Laktosi"},
    "Kosher": {"en": "Kosher", "fr": "Casher", "de": "Koscher", "pt": "Kosher", "ar": "حلال يهودي", "hi": "कोषर", "zh": "犹太洁食", "ja": "コーシャ", "ko": "코셔", "ru": "Кошерный", "it": "Kosher", "nl": "Koosjer", "pl": "Koszerny", "tr": "Koşer", "sv": "Kosher", "ro": "Kosher", "cs": "Košer", "el": "Κόσερ", "hu": "Kóser", "uk": "Кошерний", "th": "โคเชอร์", "vi": "Kosher", "id": "Kosher", "tl": "Kosher", "bn": "কোশার", "ta": "கோஷர்", "ur": "کوشر", "fa": "کوشر", "sw": "Kosher"},
    "Halal": {"en": "Halal", "fr": "Halal", "de": "Halal", "pt": "Halal", "ar": "حلال", "hi": "हलाल", "zh": "清真", "ja": "ハラール", "ko": "할랄", "ru": "Халяль", "it": "Halal", "nl": "Halal", "pl": "Halal", "tr": "Helal", "sv": "Halal", "ro": "Halal", "cs": "Halal", "el": "Χαλάλ", "hu": "Halal", "uk": "Халяль", "th": "ฮาลาล", "vi": "Halal", "id": "Halal", "tl": "Halal", "bn": "হালাল", "ta": "ஹலால்", "ur": "حلال", "fa": "حلال", "sw": "Halali"},
}

# Allergens
ALLERGEN_TRANSLATIONS = {
    "Gluten": {"en": "Gluten", "fr": "Gluten", "de": "Gluten", "pt": "Glúten", "ar": "غلوتين", "hi": "ग्लूटेन", "zh": "麸质", "ja": "グルテン", "ko": "글루텐", "ru": "Глютен", "it": "Glutine", "nl": "Gluten", "pl": "Gluten", "tr": "Glüten", "sv": "Gluten", "ro": "Gluten", "cs": "Lepek", "el": "Γλουτένη", "hu": "Glutén", "uk": "Глютен", "th": "กลูเตน", "vi": "Gluten", "id": "Gluten", "tl": "Gluten", "bn": "গ্লুটেন", "ta": "குளூட்டன்", "ur": "گلوٹین", "fa": "گلوتن", "sw": "Gluteni"},
    "Lácteos": {"en": "Dairy", "fr": "Produits Laitiers", "de": "Milchprodukte", "pt": "Laticínios", "ar": "ألبان", "hi": "डेयरी", "zh": "乳制品", "ja": "乳製品", "ko": "유제품", "ru": "Молочные", "it": "Latticini", "nl": "Zuivel", "pl": "Nabiał", "tr": "Süt Ürünleri", "sv": "Mejeriprodukter", "ro": "Lactate", "cs": "Mléčné výrobky", "el": "Γαλακτοκομικά", "hu": "Tejtermékek", "uk": "Молочні", "th": "ผลิตภัณฑ์นม", "vi": "Sữa", "id": "Susu", "tl": "Gatas", "bn": "দুগ্ধ", "ta": "பால் பொருட்கள்", "ur": "دودھ کی مصنوعات", "fa": "لبنیات", "sw": "Maziwa"},
    "Leche": {"en": "Milk", "fr": "Lait", "de": "Milch", "pt": "Leite", "ar": "حليب", "hi": "दूध", "zh": "牛奶", "ja": "乳", "ko": "우유", "ru": "Молоко", "it": "Latte", "nl": "Melk", "pl": "Mleko", "tr": "Süt", "sv": "Mjölk", "ro": "Lapte", "cs": "Mléko", "el": "Γάλα", "hu": "Tej", "uk": "Молоко", "th": "นม", "vi": "Sữa", "id": "Susu", "tl": "Gatas", "bn": "দুধ", "ta": "பால்", "ur": "دودھ", "fa": "شیر", "sw": "Maziwa"},
    "Huevos": {"en": "Eggs", "fr": "Œufs", "de": "Eier", "pt": "Ovos", "ar": "بيض", "hi": "अंडे", "zh": "鸡蛋", "ja": "卵", "ko": "달걀", "ru": "Яйца", "it": "Uova", "nl": "Eieren", "pl": "Jajka", "tr": "Yumurta", "sv": "Ägg", "ro": "Ouă", "cs": "Vejce", "el": "Αυγά", "hu": "Tojás", "uk": "Яйця", "th": "ไข่", "vi": "Trứng", "id": "Telur", "tl": "Itlog", "bn": "ডিম", "ta": "முட்டை", "ur": "انڈے", "fa": "تخم‌مرغ", "sw": "Mayai"},
    "Frutos secos": {"en": "Tree Nuts", "fr": "Fruits à Coque", "de": "Schalenfrüchte", "pt": "Frutos Secos", "ar": "مكسرات", "hi": "मेवे", "zh": "坚果", "ja": "ナッツ類", "ko": "견과류", "ru": "Орехи", "it": "Frutta a guscio", "nl": "Noten", "pl": "Orzechy", "tr": "Kabuklu Yemişler", "sv": "Nötter", "ro": "Fructe cu coajă", "cs": "Ořechy", "el": "Ξηροί Καρποί", "hu": "Diófélék", "uk": "Горіхи", "th": "ถั่วเปลือกแข็ง", "vi": "Quả hạch", "id": "Kacang Pohon", "tl": "Mga Mani", "bn": "বাদাম", "ta": "கொட்டைகள்", "ur": "خشک میوے", "fa": "آجیل", "sw": "Karanga"},
    "Cacahuetes": {"en": "Peanuts", "fr": "Arachides", "de": "Erdnüsse", "pt": "Amendoins", "ar": "فول سوداني", "hi": "मूंगफली", "zh": "花生", "ja": "ピーナッツ", "ko": "땅콩", "ru": "Арахис", "it": "Arachidi", "nl": "Pinda's", "pl": "Orzeszki ziemne", "tr": "Yer Fıstığı", "sv": "Jordnötter", "ro": "Arahide", "cs": "Arašídy", "el": "Φιστίκια", "hu": "Földimogyoró", "uk": "Арахіс", "th": "ถั่วลิสง", "vi": "Đậu phộng", "id": "Kacang Tanah", "tl": "Mani", "bn": "চিনাবাদাম", "ta": "நிலக்கடலை", "ur": "مونگ پھلی", "fa": "بادام‌زمینی", "sw": "Karanga"},
    "Soja": {"en": "Soy", "fr": "Soja", "de": "Soja", "pt": "Soja", "ar": "صويا", "hi": "सोया", "zh": "大豆", "ja": "大豆", "ko": "대두", "ru": "Соя", "it": "Soia", "nl": "Soja", "pl": "Soja", "tr": "Soya", "sv": "Soja", "ro": "Soia", "cs": "Sója", "el": "Σόγια", "hu": "Szója", "uk": "Соя", "th": "ถั่วเหลือง", "vi": "Đậu nành", "id": "Kedelai", "tl": "Soya", "bn": "সয়া", "ta": "சோயா", "ur": "سویا", "fa": "سویا", "sw": "Soya"},
    "Pescado": {"en": "Fish", "fr": "Poisson", "de": "Fisch", "pt": "Peixe", "ar": "سمك", "hi": "मछली", "zh": "鱼", "ja": "魚", "ko": "생선", "ru": "Рыба", "it": "Pesce", "nl": "Vis", "pl": "Ryby", "tr": "Balık", "sv": "Fisk", "ro": "Pește", "cs": "Ryby", "el": "Ψάρι", "hu": "Hal", "uk": "Риба", "th": "ปลา", "vi": "Cá", "id": "Ikan", "tl": "Isda", "bn": "মাছ", "ta": "மீன்", "ur": "مچھلی", "fa": "ماهی", "sw": "Samaki"},
    "Mariscos": {"en": "Shellfish", "fr": "Crustacés", "de": "Schalentiere", "pt": "Mariscos", "ar": "محار", "hi": "शंख", "zh": "贝类", "ja": "甲殻類", "ko": "갑각류", "ru": "Моллюски", "it": "Crostacei", "nl": "Schaaldieren", "pl": "Skorupiaki", "tr": "Kabuklu Deniz Ürünleri", "sv": "Skaldjur", "ro": "Fructe de mare", "cs": "Korýši", "el": "Οστρακοειδή", "hu": "Rákfélék", "uk": "Молюски", "th": "อาหารทะเล", "vi": "Hải sản có vỏ", "id": "Kerang", "tl": "Kabibe", "bn": "শেলফিশ", "ta": "கடல் உணவு", "ur": "شیلفش", "fa": "صدف", "sw": "Kamba"},
    "Sésamo": {"en": "Sesame", "fr": "Sésame", "de": "Sesam", "pt": "Sésamo", "ar": "سمسم", "hi": "तिल", "zh": "芝麻", "ja": "ゴマ", "ko": "참깨", "ru": "Кунжут", "it": "Sesamo", "nl": "Sesam", "pl": "Sezam", "tr": "Susam", "sv": "Sesam", "ro": "Susan", "cs": "Sezam", "el": "Σουσάμι", "hu": "Szezám", "uk": "Кунжут", "th": "งา", "vi": "Vừng", "id": "Wijen", "tl": "Sesame", "bn": "তিল", "ta": "எள்", "ur": "تل", "fa": "کنجد", "sw": "Ufuta"},
    "Mostaza": {"en": "Mustard", "fr": "Moutarde", "de": "Senf", "pt": "Mostarda", "ar": "خردل", "hi": "सरसों", "zh": "芥末", "ja": "マスタード", "ko": "겨자", "ru": "Горчица", "it": "Senape", "nl": "Mosterd", "pl": "Gorczyca", "tr": "Hardal", "sv": "Senap", "ro": "Muștar", "cs": "Hořčice", "el": "Μουστάρδα", "hu": "Mustár", "uk": "Гірчиця", "th": "มัสตาร์ด", "vi": "Mù tạt", "id": "Mustard", "tl": "Mustasa", "bn": "সরিষা", "ta": "கடுகு", "ur": "سرسوں", "fa": "خردل", "sw": "Haradali"},
    "Apio": {"en": "Celery", "fr": "Céleri", "de": "Sellerie", "pt": "Aipo", "ar": "كرفس", "hi": "अजवाइन", "zh": "芹菜", "ja": "セロリ", "ko": "셀러리", "ru": "Сельдерей", "it": "Sedano", "nl": "Selderij", "pl": "Seler", "tr": "Kereviz", "sv": "Selleri", "ro": "Țelină", "cs": "Celer", "el": "Σέλινο", "hu": "Zeller", "uk": "Селера", "th": "ขึ้นฉ่าย", "vi": "Cần tây", "id": "Seledri", "tl": "Kintsay", "bn": "সেলারি", "ta": "செலரி", "ur": "اجوائن", "fa": "کرفس", "sw": "Seleri"},
    "Sulfitos": {"en": "Sulphites", "fr": "Sulfites", "de": "Sulfite", "pt": "Sulfitos", "ar": "كبريتيت", "hi": "सल्फाइट", "zh": "亚硫酸盐", "ja": "亜硫酸塩", "ko": "아황산염", "ru": "Сульфиты", "it": "Solfiti", "nl": "Sulfieten", "pl": "Siarczyny", "tr": "Sülfitler", "sv": "Sulfiter", "ro": "Sulfiți", "cs": "Oxid siřičitý", "el": "Θειώδη", "hu": "Szulfitok", "uk": "Сульфіти", "th": "ซัลไฟต์", "vi": "Sulfit", "id": "Sulfit", "tl": "Sulpito", "bn": "সালফাইট", "ta": "சல்பைட்", "ur": "سلفائٹ", "fa": "سولفیت", "sw": "Sulfaiti"},
    "Altramuces": {"en": "Lupin", "fr": "Lupin", "de": "Lupinen", "pt": "Tremoços", "ar": "ترمس", "hi": "ल्यूपिन", "zh": "羽扇豆", "ja": "ルピナス", "ko": "루핀", "ru": "Люпин", "it": "Lupini", "nl": "Lupine", "pl": "Łubin", "tr": "Acı Bakla", "sv": "Lupin", "ro": "Lupin", "cs": "Lupina", "el": "Λούπινο", "hu": "Csillagfürt", "uk": "Люпин", "th": "ลูปิน", "vi": "Lupin", "id": "Lupin", "tl": "Lupin", "bn": "লুপিন", "ta": "லூபின்", "ur": "لوپن", "fa": "لوپین", "sw": "Lupini"},
    "Moluscos": {"en": "Molluscs", "fr": "Mollusques", "de": "Weichtiere", "pt": "Moluscos", "ar": "رخويات", "hi": "मोलस्क", "zh": "软体动物", "ja": "軟体動物", "ko": "연체동물", "ru": "Моллюски", "it": "Molluschi", "nl": "Weekdieren", "pl": "Mięczaki", "tr": "Yumuşakçalar", "sv": "Blötdjur", "ro": "Moluște", "cs": "Měkkýši", "el": "Μαλάκια", "hu": "Puhatestűek", "uk": "Молюски", "th": "หอย", "vi": "Nhuyễn thể", "id": "Moluska", "tl": "Molusco", "bn": "মোলাস্ক", "ta": "மெல்லுடலி", "ur": "مولسک", "fa": "نرم‌تنان", "sw": "Wanyama laini"},
}

# Nutritional info field labels
NUTRITION_LABELS = {
    "Calorías": {"en": "Calories", "fr": "Calories", "de": "Kalorien", "pt": "Calorias", "ar": "سعرات حرارية", "hi": "कैलोरी", "zh": "热量", "ja": "カロリー", "ko": "칼로리", "ru": "Калории", "it": "Calorie", "nl": "Calorieën", "pl": "Kalorie", "tr": "Kalori", "sv": "Kalorier", "ro": "Calorii", "cs": "Kalorie", "el": "Θερμίδες", "hu": "Kalória", "uk": "Калорії", "th": "แคลอรี", "vi": "Calo", "id": "Kalori", "tl": "Calories", "bn": "ক্যালোরি", "ta": "கலோரிகள்", "ur": "کیلوریز", "fa": "کالری", "sw": "Kalori"},
    "Grasas": {"en": "Fat", "fr": "Matières Grasses", "de": "Fett", "pt": "Gorduras", "ar": "دهون", "hi": "वसा", "zh": "脂肪", "ja": "脂質", "ko": "지방", "ru": "Жиры", "it": "Grassi", "nl": "Vetten", "pl": "Tłuszcze", "tr": "Yağ", "sv": "Fett", "ro": "Grăsimi", "cs": "Tuky", "el": "Λιπαρά", "hu": "Zsír", "uk": "Жири", "th": "ไขมัน", "vi": "Chất béo", "id": "Lemak", "tl": "Taba", "bn": "চর্বি", "ta": "கொழுப்பு", "ur": "چربی", "fa": "چربی", "sw": "Mafuta"},
    "Grasas saturadas": {"en": "Saturated Fat", "fr": "Acides Gras Saturés", "de": "Gesättigte Fettsäuren", "pt": "Gorduras Saturadas", "ar": "دهون مشبعة", "hi": "संतृप्त वसा", "zh": "饱和脂肪", "ja": "飽和脂肪酸", "ko": "포화지방", "ru": "Насыщенные жиры", "it": "Grassi Saturi", "nl": "Verzadigde Vetzuren", "pl": "Tłuszcze Nasycone", "tr": "Doymuş Yağ", "sv": "Mättat Fett", "ro": "Grăsimi Saturate", "cs": "Nasycené tuky", "el": "Κορεσμένα Λιπαρά", "hu": "Telített zsírsav", "uk": "Насичені жири", "th": "ไขมันอิ่มตัว", "vi": "Chất béo bão hòa", "id": "Lemak Jenuh", "tl": "Saturated na Taba", "bn": "সম্পৃক্ত চর্বি", "ta": "நிறைவுற்ற கொழுப்பு", "ur": "سیر شدہ چربی", "fa": "چربی اشباع", "sw": "Mafuta yaliyojaa"},
    "Carbohidratos": {"en": "Carbohydrates", "fr": "Glucides", "de": "Kohlenhydrate", "pt": "Carboidratos", "ar": "كربوهيدرات", "hi": "कार्बोहाइड्रेट", "zh": "碳水化合物", "ja": "炭水化物", "ko": "탄수화물", "ru": "Углеводы", "it": "Carboidrati", "nl": "Koolhydraten", "pl": "Węglowodany", "tr": "Karbonhidrat", "sv": "Kolhydrater", "ro": "Carbohidrați", "cs": "Sacharidy", "el": "Υδατάνθρακες", "hu": "Szénhidrát", "uk": "Вуглеводи", "th": "คาร์โบไฮเดรต", "vi": "Carbohydrate", "id": "Karbohidrat", "tl": "Carbohydrates", "bn": "কার্বোহাইড্রেট", "ta": "கார்போஹைட்ரேட்", "ur": "کاربوہائیڈریٹ", "fa": "کربوهیدرات", "sw": "Kabohaidreti"},
    "Azúcares": {"en": "Sugars", "fr": "Sucres", "de": "Zucker", "pt": "Açúcares", "ar": "سكريات", "hi": "शर्करा", "zh": "糖", "ja": "糖類", "ko": "당류", "ru": "Сахара", "it": "Zuccheri", "nl": "Suikers", "pl": "Cukry", "tr": "Şekerler", "sv": "Sockerarter", "ro": "Zaharuri", "cs": "Cukry", "el": "Σάκχαρα", "hu": "Cukrok", "uk": "Цукри", "th": "น้ำตาล", "vi": "Đường", "id": "Gula", "tl": "Asukal", "bn": "চিনি", "ta": "சர்க்கரை", "ur": "شکر", "fa": "قند", "sw": "Sukari"},
    "Proteínas": {"en": "Protein", "fr": "Protéines", "de": "Eiweiß", "pt": "Proteínas", "ar": "بروتين", "hi": "प्रोटीन", "zh": "蛋白质", "ja": "たんぱく質", "ko": "단백질", "ru": "Белки", "it": "Proteine", "nl": "Eiwitten", "pl": "Białko", "tr": "Protein", "sv": "Protein", "ro": "Proteine", "cs": "Bílkoviny", "el": "Πρωτεΐνες", "hu": "Fehérje", "uk": "Білки", "th": "โปรตีน", "vi": "Protein", "id": "Protein", "tl": "Protein", "bn": "প্রোটিন", "ta": "புரதம்", "ur": "پروٹین", "fa": "پروتئین", "sw": "Protini"},
    "Sal": {"en": "Salt", "fr": "Sel", "de": "Salz", "pt": "Sal", "ar": "ملح", "hi": "नमक", "zh": "盐", "ja": "食塩相当量", "ko": "나트륨", "ru": "Соль", "it": "Sale", "nl": "Zout", "pl": "Sól", "tr": "Tuz", "sv": "Salt", "ro": "Sare", "cs": "Sůl", "el": "Αλάτι", "hu": "Só", "uk": "Сіль", "th": "เกลือ", "vi": "Muối", "id": "Garam", "tl": "Asin", "bn": "লবণ", "ta": "உப்பு", "ur": "نمک", "fa": "نمک", "sw": "Chumvi"},
    "Fibra": {"en": "Fibre", "fr": "Fibres", "de": "Ballaststoffe", "pt": "Fibra", "ar": "ألياف", "hi": "फाइबर", "zh": "膳食纤维", "ja": "食物繊維", "ko": "식이섬유", "ru": "Клетчатка", "it": "Fibre", "nl": "Vezels", "pl": "Błonnik", "tr": "Lif", "sv": "Fiber", "ro": "Fibre", "cs": "Vláknina", "el": "Φυτικές Ίνες", "hu": "Rost", "uk": "Клітковина", "th": "ใยอาหาร", "vi": "Chất xơ", "id": "Serat", "tl": "Fiber", "bn": "ফাইবার", "ta": "நார்ச்சத்து", "ur": "فائبر", "fa": "فیبر", "sw": "Nyuzinyuzi"},
}

# Certificate UI labels — existing 11 + 19 new languages
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
    "fr": {"certificate_title": "Certificat Numérique de Produit", "certificate_id": "N° Certificat", "issued": "Émis", "product": "Produit", "producer": "Producteur", "origin": "Origine", "certifications": "Certifications", "ingredients": "Ingrédients", "allergens": "Allergènes", "nutrition": "Informations Nutritionnelles", "per_100g": "pour 100g", "verified": "Vérifié par Hispaloshop", "scan_qr": "Scannez le QR pour vérifier", "status_active": "Actif", "status_revoked": "Révoqué"},
    "de": {"certificate_title": "Digitales Produktzertifikat", "certificate_id": "Zertifikat Nr.", "issued": "Ausgestellt", "product": "Produkt", "producer": "Hersteller", "origin": "Herkunft", "certifications": "Zertifizierungen", "ingredients": "Zutaten", "allergens": "Allergene", "nutrition": "Nährwertinformationen", "per_100g": "pro 100g", "verified": "Verifiziert von Hispaloshop", "scan_qr": "QR scannen zur Verifizierung", "status_active": "Aktiv", "status_revoked": "Widerrufen"},
    "pt": {"certificate_title": "Certificado Digital de Produto", "certificate_id": "Nº Certificado", "issued": "Emitido", "product": "Produto", "producer": "Produtor", "origin": "Origem", "certifications": "Certificações", "ingredients": "Ingredientes", "allergens": "Alérgenos", "nutrition": "Informação Nutricional", "per_100g": "por 100g", "verified": "Verificado pela Hispaloshop", "scan_qr": "Escaneie o QR para verificar", "status_active": "Ativo", "status_revoked": "Revogado"},
    "ar": {"certificate_title": "شهادة المنتج الرقمية", "certificate_id": "رقم الشهادة", "issued": "صدر بتاريخ", "product": "المنتج", "producer": "المنتِج", "origin": "المنشأ", "certifications": "الشهادات", "ingredients": "المكونات", "allergens": "مسببات الحساسية", "nutrition": "المعلومات الغذائية", "per_100g": "لكل 100غ", "verified": "تم التحقق من قبل Hispaloshop", "scan_qr": "امسح رمز QR للتحقق", "status_active": "نشط", "status_revoked": "ملغى"},
    "hi": {"certificate_title": "डिजिटल उत्पाद प्रमाणपत्र", "certificate_id": "प्रमाणपत्र संख्या", "issued": "जारी", "product": "उत्पाद", "producer": "उत्पादक", "origin": "मूल", "certifications": "प्रमाणन", "ingredients": "सामग्री", "allergens": "एलर्जी कारक", "nutrition": "पोषण संबंधी जानकारी", "per_100g": "प्रति 100 ग्राम", "verified": "Hispaloshop द्वारा सत्यापित", "scan_qr": "सत्यापित करने के लिए QR स्कैन करें", "status_active": "सक्रिय", "status_revoked": "रद्द"},
    "zh": {"certificate_title": "数字产品证书", "certificate_id": "证书编号", "issued": "签发日期", "product": "产品", "producer": "生产商", "origin": "产地", "certifications": "认证", "ingredients": "配料", "allergens": "过敏原", "nutrition": "营养信息", "per_100g": "每100克", "verified": "由Hispaloshop验证", "scan_qr": "扫描二维码验证", "status_active": "有效", "status_revoked": "已撤销"},
    "ja": {"certificate_title": "デジタル製品証明書", "certificate_id": "証明書番号", "issued": "発行日", "product": "製品", "producer": "生産者", "origin": "原産地", "certifications": "認証", "ingredients": "原材料", "allergens": "アレルゲン", "nutrition": "栄養情報", "per_100g": "100gあたり", "verified": "Hispaloshopにより検証済み", "scan_qr": "QRをスキャンして検証", "status_active": "有効", "status_revoked": "取消済み"},
    "ko": {"certificate_title": "디지털 제품 인증서", "certificate_id": "인증서 번호", "issued": "발행일", "product": "제품", "producer": "생산자", "origin": "원산지", "certifications": "인증", "ingredients": "성분", "allergens": "알레르기 유발 물질", "nutrition": "영양 정보", "per_100g": "100g당", "verified": "Hispaloshop 인증", "scan_qr": "QR을 스캔하여 인증", "status_active": "활성", "status_revoked": "취소됨"},
    "ru": {"certificate_title": "Цифровой сертификат продукта", "certificate_id": "№ Сертификата", "issued": "Выдан", "product": "Продукт", "producer": "Производитель", "origin": "Происхождение", "certifications": "Сертификации", "ingredients": "Ингредиенты", "allergens": "Аллергены", "nutrition": "Пищевая ценность", "per_100g": "на 100г", "verified": "Проверено Hispaloshop", "scan_qr": "Отсканируйте QR для проверки", "status_active": "Активен", "status_revoked": "Отозван"},
    "it": {"certificate_title": "Certificato Digitale del Prodotto", "certificate_id": "N° Certificato", "issued": "Emesso", "product": "Prodotto", "producer": "Produttore", "origin": "Origine", "certifications": "Certificazioni", "ingredients": "Ingredienti", "allergens": "Allergeni", "nutrition": "Informazioni Nutrizionali", "per_100g": "per 100g", "verified": "Verificato da Hispaloshop", "scan_qr": "Scansiona il QR per verificare", "status_active": "Attivo", "status_revoked": "Revocato"},
    "nl": {"certificate_title": "Digitaal Productcertificaat", "certificate_id": "Certificaatnr.", "issued": "Uitgegeven", "product": "Product", "producer": "Producent", "origin": "Herkomst", "certifications": "Certificeringen", "ingredients": "Ingrediënten", "allergens": "Allergenen", "nutrition": "Voedingsinformatie", "per_100g": "per 100g", "verified": "Geverifieerd door Hispaloshop", "scan_qr": "Scan QR om te verifiëren", "status_active": "Actief", "status_revoked": "Ingetrokken"},
    "pl": {"certificate_title": "Cyfrowy Certyfikat Produktu", "certificate_id": "Nr Certyfikatu", "issued": "Wydano", "product": "Produkt", "producer": "Producent", "origin": "Pochodzenie", "certifications": "Certyfikaty", "ingredients": "Składniki", "allergens": "Alergeny", "nutrition": "Informacje Żywieniowe", "per_100g": "na 100g", "verified": "Zweryfikowano przez Hispaloshop", "scan_qr": "Zeskanuj QR aby zweryfikować", "status_active": "Aktywny", "status_revoked": "Cofnięty"},
    "tr": {"certificate_title": "Dijital Ürün Sertifikası", "certificate_id": "Sertifika No.", "issued": "Düzenlenme", "product": "Ürün", "producer": "Üretici", "origin": "Menşei", "certifications": "Sertifikalar", "ingredients": "İçindekiler", "allergens": "Alerjenler", "nutrition": "Besin Değerleri", "per_100g": "100g başına", "verified": "Hispaloshop tarafından doğrulanmış", "scan_qr": "Doğrulamak için QR'ı tarayın", "status_active": "Aktif", "status_revoked": "İptal edildi"},
    "sv": {"certificate_title": "Digitalt Produktcertifikat", "certificate_id": "Certifikatnr.", "issued": "Utfärdat", "product": "Produkt", "producer": "Producent", "origin": "Ursprung", "certifications": "Certifieringar", "ingredients": "Ingredienser", "allergens": "Allergener", "nutrition": "Näringsinformation", "per_100g": "per 100g", "verified": "Verifierat av Hispaloshop", "scan_qr": "Skanna QR för att verifiera", "status_active": "Aktiv", "status_revoked": "Återkallat"},
    "ro": {"certificate_title": "Certificat Digital de Produs", "certificate_id": "Nr. Certificat", "issued": "Emis", "product": "Produs", "producer": "Producător", "origin": "Origine", "certifications": "Certificări", "ingredients": "Ingrediente", "allergens": "Alergeni", "nutrition": "Informații Nutriționale", "per_100g": "la 100g", "verified": "Verificat de Hispaloshop", "scan_qr": "Scanați QR pentru verificare", "status_active": "Activ", "status_revoked": "Revocat"},
    "cs": {"certificate_title": "Digitální certifikát produktu", "certificate_id": "Č. certifikátu", "issued": "Vydáno", "product": "Produkt", "producer": "Výrobce", "origin": "Původ", "certifications": "Certifikace", "ingredients": "Složení", "allergens": "Alergeny", "nutrition": "Nutriční informace", "per_100g": "na 100g", "verified": "Ověřeno Hispaloshop", "scan_qr": "Naskenujte QR k ověření", "status_active": "Aktivní", "status_revoked": "Odvoláno"},
    "el": {"certificate_title": "Ψηφιακό Πιστοποιητικό Προϊόντος", "certificate_id": "Αρ. Πιστοποιητικού", "issued": "Εκδόθηκε", "product": "Προϊόν", "producer": "Παραγωγός", "origin": "Προέλευση", "certifications": "Πιστοποιήσεις", "ingredients": "Συστατικά", "allergens": "Αλλεργιογόνα", "nutrition": "Διατροφικές Πληροφορίες", "per_100g": "ανά 100g", "verified": "Επαληθευμένο από Hispaloshop", "scan_qr": "Σαρώστε QR για επαλήθευση", "status_active": "Ενεργό", "status_revoked": "Ανακληθέν"},
    "hu": {"certificate_title": "Digitális Terméktanúsítvány", "certificate_id": "Tanúsítvány sz.", "issued": "Kiállítva", "product": "Termék", "producer": "Gyártó", "origin": "Eredet", "certifications": "Tanúsítványok", "ingredients": "Összetevők", "allergens": "Allergének", "nutrition": "Tápérték", "per_100g": "100g-onként", "verified": "Hispaloshop által ellenőrizve", "scan_qr": "Olvassa be a QR-t az ellenőrzéshez", "status_active": "Aktív", "status_revoked": "Visszavonva"},
    "uk": {"certificate_title": "Цифровий сертифікат продукту", "certificate_id": "№ Сертифіката", "issued": "Видано", "product": "Продукт", "producer": "Виробник", "origin": "Походження", "certifications": "Сертифікації", "ingredients": "Інгредієнти", "allergens": "Алергени", "nutrition": "Харчова цінність", "per_100g": "на 100г", "verified": "Перевірено Hispaloshop", "scan_qr": "Скануйте QR для перевірки", "status_active": "Активний", "status_revoked": "Відкликано"},
    "th": {"certificate_title": "ใบรับรองสินค้าดิจิทัล", "certificate_id": "เลขที่ใบรับรอง", "issued": "ออกเมื่อ", "product": "สินค้า", "producer": "ผู้ผลิต", "origin": "แหล่งกำเนิด", "certifications": "การรับรอง", "ingredients": "ส่วนประกอบ", "allergens": "สารก่อภูมิแพ้", "nutrition": "ข้อมูลโภชนาการ", "per_100g": "ต่อ 100 กรัม", "verified": "ตรวจสอบโดย Hispaloshop", "scan_qr": "สแกน QR เพื่อตรวจสอบ", "status_active": "ใช้งานอยู่", "status_revoked": "ถูกเพิกถอน"},
    "vi": {"certificate_title": "Chứng nhận sản phẩm số", "certificate_id": "Số chứng nhận", "issued": "Ngày cấp", "product": "Sản phẩm", "producer": "Nhà sản xuất", "origin": "Xuất xứ", "certifications": "Chứng nhận", "ingredients": "Thành phần", "allergens": "Chất gây dị ứng", "nutrition": "Thông tin dinh dưỡng", "per_100g": "trên 100g", "verified": "Được xác minh bởi Hispaloshop", "scan_qr": "Quét QR để xác minh", "status_active": "Hoạt động", "status_revoked": "Đã thu hồi"},
    "id": {"certificate_title": "Sertifikat Produk Digital", "certificate_id": "No. Sertifikat", "issued": "Diterbitkan", "product": "Produk", "producer": "Produsen", "origin": "Asal", "certifications": "Sertifikasi", "ingredients": "Bahan", "allergens": "Alergen", "nutrition": "Informasi Gizi", "per_100g": "per 100g", "verified": "Diverifikasi oleh Hispaloshop", "scan_qr": "Pindai QR untuk verifikasi", "status_active": "Aktif", "status_revoked": "Dicabut"},
    "tl": {"certificate_title": "Digital na Sertipiko ng Produkto", "certificate_id": "Blg. ng Sertipiko", "issued": "Inilabas", "product": "Produkto", "producer": "Prodyuser", "origin": "Pinagmulan", "certifications": "Mga Sertipikasyon", "ingredients": "Mga Sangkap", "allergens": "Mga Allergen", "nutrition": "Impormasyon sa Nutrisyon", "per_100g": "bawat 100g", "verified": "Na-verify ng Hispaloshop", "scan_qr": "I-scan ang QR para ma-verify", "status_active": "Aktibo", "status_revoked": "Binawi"},
    "bn": {"certificate_title": "ডিজিটাল পণ্য সনদ", "certificate_id": "সনদ নং", "issued": "জারি", "product": "পণ্য", "producer": "উৎপাদক", "origin": "উৎস", "certifications": "সনদপত্র", "ingredients": "উপকরণ", "allergens": "অ্যালার্জেন", "nutrition": "পুষ্টি তথ্য", "per_100g": "প্রতি ১০০ গ্রাম", "verified": "Hispaloshop দ্বারা যাচাইকৃত", "scan_qr": "যাচাই করতে QR স্ক্যান করুন", "status_active": "সক্রিয়", "status_revoked": "প্রত্যাহৃত"},
    "ta": {"certificate_title": "டிஜிட்டல் தயாரிப்பு சான்றிதழ்", "certificate_id": "சான்றிதழ் எண்", "issued": "வழங்கப்பட்டது", "product": "தயாரிப்பு", "producer": "உற்பத்தியாளர்", "origin": "தோற்றம்", "certifications": "சான்றிதழ்கள்", "ingredients": "பொருட்கள்", "allergens": "ஒவ்வாமை", "nutrition": "ஊட்டச்சத்து தகவல்", "per_100g": "100 கிராமுக்கு", "verified": "Hispaloshop மூலம் சரிபார்க்கப்பட்டது", "scan_qr": "சரிபார்க்க QR ஸ்கேன் செய்யவும்", "status_active": "செயலில்", "status_revoked": "ரத்து செய்யப்பட்டது"},
    "ur": {"certificate_title": "ڈیجیٹل پروڈکٹ سرٹیفکیٹ", "certificate_id": "سرٹیفکیٹ نمبر", "issued": "جاری", "product": "پروڈکٹ", "producer": "پروڈیوسر", "origin": "اصل", "certifications": "سرٹیفیکیشنز", "ingredients": "اجزا", "allergens": "الرجینز", "nutrition": "غذائی معلومات", "per_100g": "فی 100 گرام", "verified": "Hispaloshop سے تصدیق شدہ", "scan_qr": "تصدیق کے لیے QR اسکین کریں", "status_active": "فعال", "status_revoked": "منسوخ"},
    "fa": {"certificate_title": "گواهی دیجیتال محصول", "certificate_id": "شماره گواهی", "issued": "صادر شده", "product": "محصول", "producer": "تولیدکننده", "origin": "مبدأ", "certifications": "گواهینامه‌ها", "ingredients": "مواد تشکیل‌دهنده", "allergens": "آلرژن‌ها", "nutrition": "اطلاعات تغذیه‌ای", "per_100g": "در هر 100 گرم", "verified": "تأیید شده توسط Hispaloshop", "scan_qr": "QR را اسکن کنید", "status_active": "فعال", "status_revoked": "لغو شده"},
    "sw": {"certificate_title": "Cheti cha Kidijitali cha Bidhaa", "certificate_id": "Namba ya Cheti", "issued": "Imetolewa", "product": "Bidhaa", "producer": "Mzalishaji", "origin": "Asili", "certifications": "Vyeti", "ingredients": "Viungo", "allergens": "Vizio", "nutrition": "Taarifa ya Lishe", "per_100g": "kwa 100g", "verified": "Imethibitishwa na Hispaloshop", "scan_qr": "Changanua QR kuthibitisha", "status_active": "Hai", "status_revoked": "Imefutwa"},
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


# ── Google Cloud Translation API ─────────────────────────────────────

def _get_google_client():
    """Lazy-init Google Translate client."""
    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
    if not api_key:
        return None, None
    return api_key, True


async def _translate_with_google(text: str, source_lang: str, target_lang: str) -> Tuple[str, str]:
    """
    Translate free-text using Google Cloud Translation API v2, with 3-tier cache.
    Returns (translated_text, detected_source_language).
    """
    if not text or not text.strip():
        return text, source_lang

    # ── Tier 1: Redis hot cache ──
    redis_key = f"tr:text:{hashlib.md5(text.encode()).hexdigest()[:16]}:{target_lang}"
    try:
        from core.redis_client import redis_manager
        cached_redis = await redis_manager.get_cache(redis_key)
        if cached_redis:
            return cached_redis, source_lang
    except Exception:
        pass  # Redis unavailable, continue

    # ── Tier 2: MongoDB permanent cache ──
    query = {"source_text": text, "target_lang": target_lang}
    if source_lang:
        query["source_lang"] = source_lang

    cached = await db.translation_cache.find_one(query, {"_id": 0, "translated_text": 1, "detected_lang": 1})
    if cached:
        translated = cached["translated_text"]
        detected = cached.get("detected_lang", source_lang)
        # Warm Redis
        try:
            from core.redis_client import redis_manager
            await redis_manager.set_cache(redis_key, translated, ttl=2592000)  # 30 days
        except Exception:
            pass
        return translated, detected

    # ── Tier 3: Google Cloud Translation API ──
    api_key, _ = _get_google_client()
    if not api_key:
        logger.warning("[TRANSLATION] No GOOGLE_TRANSLATE_API_KEY — returning original text")
        return text, source_lang

    try:
        import urllib.request
        import urllib.parse

        url = f"https://translation.googleapis.com/language/translate/v2?key={api_key}"
        payload = json.dumps({
            "q": [text],
            "source": source_lang if source_lang else None,
            "target": target_lang,
            "format": "text"
        }).encode("utf-8")

        # Remove None source for auto-detection
        payload_dict = json.loads(payload)
        if payload_dict.get("source") is None:
            del payload_dict["source"]
        payload = json.dumps(payload_dict).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

        import asyncio
        loop = asyncio.get_event_loop()
        response_data = await loop.run_in_executor(None, lambda: urllib.request.urlopen(req).read())
        data = json.loads(response_data.decode("utf-8"))

        translation = data["data"]["translations"][0]
        translated = translation["translatedText"]
        detected = translation.get("detectedSourceLanguage", source_lang)

        # Cache in MongoDB (permanent)
        await db.translation_cache.update_one(
            {"source_text": text, "source_lang": source_lang or detected, "target_lang": target_lang},
            {"$set": {"translated_text": translated, "detected_lang": detected}},
            upsert=True,
        )

        # Cache in Redis (30 days)
        try:
            from core.redis_client import redis_manager
            await redis_manager.set_cache(redis_key, translated, ttl=2592000)
        except Exception:
            pass

        return translated, detected

    except Exception as e:
        logger.error(f"[TRANSLATION] Google Translation failed: {e}")
        return text, source_lang


async def _translate_batch_with_google(items: list, source_lang: str, target_lang: str) -> list:
    """Translate a list of strings with Google, each individually cached."""
    results = []
    for item in items:
        translated, _ = await _translate_with_google(item, source_lang, target_lang)
        results.append(translated)
    return results


# ── Public API (TranslationService) ──────────────────────────────────

class TranslationService:

    @staticmethod
    async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang:
            return text
        translated, _ = await _translate_with_google(text, source_lang, target_lang)
        return translated

    @staticmethod
    async def translate_with_detection(text: str, target_lang: str) -> Tuple[str, str]:
        """Translate text with automatic source language detection.
        Returns (translated_text, detected_source_lang).
        """
        translated, detected = await _translate_with_google(text, None, target_lang)
        return translated, detected

    @staticmethod
    async def translate_list(items: List[str], source_lang: str, target_lang: str) -> List[str]:
        if source_lang == target_lang:
            return items
        return await _translate_batch_with_google(items, source_lang, target_lang)

    @staticmethod
    async def translate_product_fields(product: dict, source_lang: str, target_lang: str) -> dict:
        if source_lang == target_lang:
            return {}

        translated = {}

        # Dynamic fields via Google Translation
        if product.get("name"):
            translated["name"], _ = await _translate_with_google(product["name"], source_lang, target_lang)
        if product.get("description"):
            translated["description"], _ = await _translate_with_google(product["description"], source_lang, target_lang)

        # Static translations for known labels
        if product.get("ingredients"):
            translated["ingredients"] = await _translate_batch_with_google(product["ingredients"], source_lang, target_lang)
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
            translated["product_name"], _ = await _translate_with_google(translated["product_name"], source_lang, target_lang)

        # Static: certifications, allergens, nutrition labels
        if translated.get("certifications"):
            translated["certifications"] = translate_certifications(translated["certifications"], target_lang)
        if translated.get("allergens"):
            translated["allergens"] = translate_allergens(translated["allergens"], target_lang)
        if translated.get("nutritional_info"):
            translated["nutritional_info"] = translate_nutrition_labels(translated["nutritional_info"], target_lang)

        # Dynamic: ingredients
        if translated.get("ingredients"):
            translated["ingredients"] = await _translate_batch_with_google(translated["ingredients"], source_lang, target_lang)

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

    @staticmethod
    async def translate_document_fields(
        collection_name: str,
        doc_id_field: str,
        doc_id: str,
        fields_to_translate: List[str],
        target_lang: str,
        document: dict,
    ) -> dict:
        """
        Generic translate-and-cache for any MongoDB document.
        Returns dict with translated field values.
        """
        source_lang = document.get("source_language", "es")
        if target_lang == source_lang:
            return {}

        # Check cached
        cached = document.get("translations", {}).get(target_lang)
        if cached:
            return cached

        # Translate each field
        translated = {}
        for field in fields_to_translate:
            value = document.get(field)
            if not value:
                continue
            if isinstance(value, str):
                translated[field], _ = await _translate_with_google(value, source_lang, target_lang)
            elif isinstance(value, list) and all(isinstance(v, str) for v in value):
                translated[field] = await _translate_batch_with_google(value, source_lang, target_lang)

        # Cache on document
        if translated:
            collection = db[collection_name]
            await collection.update_one(
                {doc_id_field: doc_id},
                {"$set": {f"translations.{target_lang}": translated}}
            )

        return translated

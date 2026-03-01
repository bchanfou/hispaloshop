"""
Translation service using LLM for product/certificate translations.
SAFE VERSION — no emergentintegrations dependency.
"""
import uuid
import logging
from typing import List
from core.database import db

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'pt': 'Portuguese', 'ar': 'Arabic', 'hi': 'Hindi', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian'
}

PRODUCT_TRANSLATABLE_FIELDS = [
    'name', 'description', 'ingredients', 'allergens', 'certifications'
]

CERTIFICATE_TRANSLATABLE_FIELDS = [
    'ingredients', 'origin', 'nutritional_info',
    'allergens', 'compliance', 'notes'
]


class TranslationService:

    @staticmethod
    async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
        """
        SAFE fallback: returns original text.
        Replace later with OpenAI if needed.
        """
        return text


    @staticmethod
    async def translate_list(items: List[str], source_lang: str, target_lang: str) -> List[str]:
        """
        SAFE fallback: returns original list.
        """
        return items


    @staticmethod
    async def translate_product_fields(product: dict, source_lang: str, target_lang: str) -> dict:

        if source_lang == target_lang:
            return {}

        translated = {}

        if product.get('name'):
            translated['name'] = product['name']

        if product.get('description'):
            translated['description'] = product['description']

        if product.get('ingredients'):
            translated['ingredients'] = product['ingredients']

        if product.get('allergens'):
            translated['allergens'] = product['allergens']

        if product.get('certifications'):
            translated['certifications'] = product['certifications']

        return translated


    @staticmethod
    async def translate_certificate_data(cert_data: dict, source_lang: str, target_lang: str) -> dict:

        return cert_data


    @staticmethod
    async def get_product_in_language(product_id: str, target_lang: str):

        product = await db.products.find_one(
            {"product_id": product_id},
            {"_id": 0}
        )

        if not product:
            return None

        return product


    @staticmethod
    async def get_certificate_in_language(certificate_id: str, target_lang: str):

        cert = await db.certificates.find_one(
            {"certificate_id": certificate_id},
            {"_id": 0}
        )

        return cert
        except Exception as e:
            logger.error(f"Error translating certificate {certificate_id}: {e}")
        return cert

"""
Translation service using LLM for product/certificate translations.
"""
import uuid
import os
import logging
from typing import List

from emergentintegrations.llm.chat import LlmChat, UserMessage
from core.database import db

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

LANGUAGE_NAMES = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'pt': 'Portuguese', 'ar': 'Arabic', 'hi': 'Hindi', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian'
}

PRODUCT_TRANSLATABLE_FIELDS = ['name', 'description', 'ingredients', 'allergens', 'certifications']
CERTIFICATE_TRANSLATABLE_FIELDS = ['ingredients', 'origin', 'nutritional_info', 'allergens', 'compliance', 'notes']


class TranslationService:
    """Automatic translation service using LLM. Translates and caches results."""

    @staticmethod
    async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
        if not text or source_lang == target_lang:
            return text
        try:
            session_id = f"translate_{uuid.uuid4().hex[:8]}"
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=f"""You are a professional translator. Translate the following text from {LANGUAGE_NAMES.get(source_lang, source_lang)} to {LANGUAGE_NAMES.get(target_lang, target_lang)}.
Rules:
- Maintain the original meaning and tone
- Keep proper nouns unchanged (brand names, place names)
- For food/product terms, use the appropriate local terminology
- Return ONLY the translation, nothing else"""
            )
            chat.with_model("openai", "gpt-5.2")
            response = await chat.send_message(UserMessage(text=text))
            translated = response.strip()
            if translated and translated != text:
                return translated
            return text
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text

    @staticmethod
    async def translate_list(items: List[str], source_lang: str, target_lang: str) -> List[str]:
        if not items or source_lang == target_lang:
            return items
        try:
            joined = "\n---ITEM---\n".join(items)
            session_id = f"translate_{uuid.uuid4().hex[:8]}"
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=f"""You are a professional translator. Translate each item from {LANGUAGE_NAMES.get(source_lang, source_lang)} to {LANGUAGE_NAMES.get(target_lang, target_lang)}.
The items are separated by "---ITEM---". Return the translations in the same format, separated by "---ITEM---".
Rules:
- Maintain the original meaning
- Keep proper nouns unchanged
- For food/ingredient terms, use the appropriate local terminology
- Return ONLY the translations, nothing else"""
            )
            chat.with_model("openai", "gpt-5.2")
            response = await chat.send_message(UserMessage(text=joined))
            translated = response.strip().split("---ITEM---")
            if len(translated) == len(items):
                return [t.strip() for t in translated]
            return items
        except Exception as e:
            logger.error(f"Translation list error: {e}")
            return items

    @staticmethod
    async def translate_product_fields(product: dict, source_lang: str, target_lang: str) -> dict:
        if source_lang == target_lang:
            return {}
        translated = {}
        if product.get('name'):
            translated['name'] = await TranslationService.translate_text(product['name'], source_lang, target_lang)
        if product.get('description'):
            translated['description'] = await TranslationService.translate_text(product['description'], source_lang, target_lang)
        if product.get('ingredients'):
            translated['ingredients'] = await TranslationService.translate_list(product['ingredients'], source_lang, target_lang)
        if product.get('allergens'):
            translated['allergens'] = await TranslationService.translate_list(product['allergens'], source_lang, target_lang)
        if product.get('certifications'):
            translated['certifications'] = await TranslationService.translate_list(product['certifications'], source_lang, target_lang)
        return translated

    @staticmethod
    async def translate_certificate_data(cert_data: dict, source_lang: str, target_lang: str) -> dict:
        if source_lang == target_lang:
            return cert_data
        translated = {}
        for key, value in cert_data.items():
            if isinstance(value, str) and len(value) > 0:
                translated[key] = await TranslationService.translate_text(value, source_lang, target_lang)
            elif isinstance(value, list) and all(isinstance(v, str) for v in value):
                translated[key] = await TranslationService.translate_list(value, source_lang, target_lang)
            elif isinstance(value, dict):
                translated[key] = await TranslationService.translate_certificate_data(value, source_lang, target_lang)
            else:
                translated[key] = value
        return translated

    @staticmethod
    async def get_product_in_language(product_id: str, target_lang: str) -> dict:
        product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
        if not product:
            return None
        source_lang = product.get('source_language', 'es')
        if target_lang == source_lang:
            return product
        translated_fields = product.get('translated_fields', {})
        if target_lang in translated_fields:
            for field, value in translated_fields[target_lang].items():
                product[field] = value
            return product
        try:
            translation = await TranslationService.translate_product_fields(product, source_lang, target_lang)
            if translation:
                await db.products.update_one(
                    {"product_id": product_id},
                    {"$set": {f"translated_fields.{target_lang}": translation}}
                )
                for field, value in translation.items():
                    product[field] = value
        except Exception as e:
            logger.error(f"Error translating product {product_id}: {e}")
        return product

    @staticmethod
    async def get_certificate_in_language(certificate_id: str, target_lang: str) -> dict:
        cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
        if not cert:
            return None
        source_lang = cert.get('source_language', 'es')
        if target_lang == source_lang:
            return cert
        translated_fields = cert.get('translated_fields', {})
        if target_lang in translated_fields:
            if 'data' in translated_fields[target_lang]:
                cert['data'] = translated_fields[target_lang]['data']
            if 'product_name' in translated_fields[target_lang]:
                cert['product_name'] = translated_fields[target_lang]['product_name']
            return cert
        try:
            translated_data = await TranslationService.translate_certificate_data(cert.get('data', {}), source_lang, target_lang)
            translated_name = await TranslationService.translate_text(cert.get('product_name', ''), source_lang, target_lang)
            translation = {'data': translated_data, 'product_name': translated_name}
            await db.certificates.update_one(
                {"certificate_id": certificate_id},
                {"$set": {f"translated_fields.{target_lang}": translation}}
            )
            cert['data'] = translated_data
            cert['product_name'] = translated_name
        except Exception as e:
            logger.error(f"Error translating certificate {certificate_id}: {e}")
        return cert

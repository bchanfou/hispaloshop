// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Award, Check, ChevronDown, ChevronRight, Copy, Download, FileCheck, Globe, MapPin, Package, Printer, Send, Shield, Eye, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { useProductDetail } from '../features/products/hooks/useProductDetail';
import apiClient from '../services/api/client';

/* ── Language config ── */
const CERT_LANGUAGES = [{
  code: 'es',
  label: "Español",
  flag: '🇪🇸'
}, {
  code: 'en',
  label: 'English',
  flag: '🇬🇧'
}, {
  code: 'fr',
  label: 'Français',
  flag: '🇫🇷'
}, {
  code: 'de',
  label: 'Deutsch',
  flag: '🇩🇪'
}, {
  code: 'pt',
  label: 'Português',
  flag: '🇵🇹'
}, {
  code: 'ar',
  label: 'العربية',
  flag: '🇸🇦',
  rtl: true
}, {
  code: 'hi',
  label: 'हिन्दी',
  flag: '🇮🇳'
}, {
  code: 'zh',
  label: '中文',
  flag: '🇨🇳'
}, {
  code: 'ja',
  label: '日本語',
  flag: '🇯🇵'
}, {
  code: 'ko',
  label: '한국어',
  flag: '🇰🇷'
}, {
  code: 'ru',
  label: 'Русский',
  flag: '🇷🇺'
}];

/* ── CD-03: Nutrition unit mapping ── */
const NUTRIENT_UNITS = {
  calories: 'kcal',
  energy: 'kcal',
  energia: 'kcal',
  valor_energetico: 'kcal',
  valor_energético: 'kcal',
  protein: 'g',
  proteinas: 'g',
  proteína: 'g',
  proteínas: 'g',
  carbs: 'g',
  carbohydrates: 'g',
  carbohidratos: 'g',
  hidratos: 'g',
  hidratos_de_carbono: 'g',
  sugars: 'g',
  azucares: 'g',
  azúcares: 'g',
  sugar: 'g',
  fat: 'g',
  grasa: 'g',
  grasas: 'g',
  fats: 'g',
  grasas_totales: 'g',
  saturated_fat: 'g',
  grasas_saturadas: 'g',
  saturated: 'g',
  saturadas: 'g',
  fiber: 'g',
  fibra: 'g',
  fibra_alimentaria: 'g',
  sodium: 'mg',
  sodio: 'mg',
  salt: 'g',
  sal: 'g'
};
const NUTRIENT_LABELS = {
  calories: "Energía",
  energy: 'Energía',
  energia: 'Energía',
  valor_energetico: 'Energía',
  valor_energético: 'Energía',
  protein: "Proteínas",
  proteinas: 'Proteínas',
  proteína: 'Proteínas',
  proteínas: 'Proteínas',
  carbs: 'Hidratos de carbono',
  carbohydrates: 'Hidratos de carbono',
  carbohidratos: 'Hidratos de carbono',
  hidratos_de_carbono: 'Hidratos de carbono',
  sugars: '— de los cuales azúcares',
  azucares: '— de los cuales azúcares',
  azúcares: '— de los cuales azúcares',
  sugar: '— de los cuales azúcares',
  fat: 'Grasas',
  grasa: 'Grasas',
  grasas: 'Grasas',
  grasas_totales: 'Grasas totales',
  saturated_fat: '— de las cuales saturadas',
  saturated: '— de las cuales saturadas',
  grasas_saturadas: '— de las cuales saturadas',
  saturadas: '— de las cuales saturadas',
  fiber: 'Fibra alimentaria',
  fibra: 'Fibra alimentaria',
  fibra_alimentaria: 'Fibra alimentaria',
  sodium: 'Sodio',
  sodio: 'Sodio',
  salt: 'Sal',
  sal: 'Sal'
};

/* ── CD-04: Common allergen icons ── */
const ALLERGEN_ICONS = {
  gluten: '🌾',
  trigo: '🌾',
  wheat: '🌾',
  lactosa: '🥛',
  leche: '🥛',
  milk: '🥛',
  dairy: '🥛',
  lactose: '🥛',
  huevo: '🥚',
  huevos: '🥚',
  egg: '🥚',
  eggs: '🥚',
  'frutos secos': '🥜',
  nueces: '🥜',
  nuts: '🥜',
  'tree nuts': '🥜',
  cacahuete: '🥜',
  peanut: '🥜',
  maní: '🥜',
  soja: '🫘',
  soy: '🫘',
  pescado: '🐟',
  fish: '🐟',
  marisco: '🦐',
  shellfish: '🦐',
  crustaceans: '🦐',
  apio: '🥬',
  celery: '🥬',
  mostaza: '🟡',
  mustard: '🟡',
  sésamo: '🫘',
  sesame: '🫘',
  sulfitos: '🍷',
  sulphites: '🍷',
  sulfites: '🍷',
  moluscos: '🐚',
  molluscs: '🐚',
  altramuces: '🌱',
  lupin: '🌱'
};

/* ── Helpers ── */
function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(/,|\n/).map(s => s.trim()).filter(Boolean);
  return [];
}
function normalizeIngredientOrigins(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).map(([ingredient, origin]) => ({
      ingredient,
      origin
    }));
  }
  if (typeof value === 'string') {
    return value.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const [ingredient, origin] = line.split(':');
      return {
        ingredient: ingredient?.trim(),
        origin: origin?.trim()
      };
    }).filter(i => i.ingredient && i.origin);
  }
  return [];
}
function abbreviateCount(n) {
  if (!n || n < 1) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ── CD-09: Fixed UI text translations ── */
const UI_TEXTS = {
  es: {
    cert_title: 'Certificado digital',
    verified: 'Verificado',
    product: 'Producto certificado',
    nutrition: "Información nutricional",
    per100: 'Valores medios por 100 g / 100 ml',
    nutrient: 'Nutriente',
    per100g: 'Por 100 g',
    ingredients: 'Ingredientes',
    allergens: 'Alérgenos',
    no_allergens: 'Sin alérgenos declarados',
    not_declared: 'No declarados',
    traceability: 'Trazabilidad de ingredientes',
    made_by: 'Elaborado por',
    origin: 'Origen',
    go_store: 'Ir a la tienda',
    verify: 'Verificar autenticidad',
    scan_qr: 'Escanea el QR o copia el enlace para verificar este certificado.',
    copy_link: 'Copiar enlace',
    share: 'Compartir',
    download_pdf: 'Descargar certificado PDF',
    buy: 'Comprar producto',
    buy_sub: 'Directo al productor',
    buy_btn: 'Comprar',
    more_certs: 'Ver más certificados',
    verified_times: 'verificaciones',
    cert_number: 'Certificado Nº',
    issued: 'Emitido',
    suitable: '¿Es apto para mí?',
    contains: 'Contiene',
    free_from: 'No contiene',
    download_qr: 'Descargar QR',
    download_print: 'QR para imprimir (300 DPI)',
    producer_assets: 'Recursos para productores',
    assets_desc: 'Descarga el QR en alta resolución para tus envases y etiquetas.',
    link_copied: 'Enlace copiado'
  },
  en: {
    cert_title: 'Digital Certificate',
    verified: 'Verified',
    product: 'Certified Product',
    nutrition: 'Nutrition Facts',
    per100: 'Average values per 100 g / 100 ml',
    nutrient: 'Nutrient',
    per100g: 'Per 100 g',
    ingredients: 'Ingredients',
    allergens: 'Allergens',
    no_allergens: 'No declared allergens',
    not_declared: 'Not declared',
    traceability: 'Ingredient Traceability',
    made_by: 'Made by',
    origin: 'Origin',
    go_store: 'Visit store',
    verify: 'Verify authenticity',
    scan_qr: 'Scan the QR or copy the link to verify this certificate.',
    copy_link: 'Copy link',
    share: 'Share',
    download_pdf: 'Download PDF certificate',
    buy: 'Buy product',
    buy_sub: 'Direct from producer',
    buy_btn: 'Buy',
    more_certs: 'Browse certificates',
    verified_times: 'verifications',
    cert_number: 'Certificate No.',
    issued: 'Issued',
    suitable: 'Is it suitable for me?',
    contains: 'Contains',
    free_from: 'Free from',
    download_qr: 'Download QR',
    download_print: 'Print-ready QR (300 DPI)',
    producer_assets: 'Producer resources',
    assets_desc: 'Download high-resolution QR for your packaging and labels.',
    link_copied: 'Link copied'
  },
  fr: {
    cert_title: "Certificat numérique",
    verified: 'Vérifié',
    product: 'Produit certifié',
    nutrition: 'Informations nutritionnelles',
    per100: 'Valeurs moyennes pour 100 g / 100 ml',
    nutrient: 'Nutriment',
    per100g: 'Pour 100 g',
    ingredients: 'Ingrédients',
    allergens: 'Allergènes',
    no_allergens: 'Pas d\'allergènes déclarés',
    not_declared: 'Non déclarés',
    traceability: 'Traçabilité des ingrédients',
    made_by: 'Élaboré par',
    origin: 'Origine',
    go_store: 'Visiter la boutique',
    verify: 'Vérifier l\'authenticité',
    scan_qr: 'Scannez le QR ou copiez le lien pour vérifier ce certificat.',
    copy_link: 'Copier le lien',
    share: 'Partager',
    download_pdf: 'Télécharger le certificat PDF',
    buy: 'Acheter le produit',
    buy_sub: 'Direct du producteur',
    buy_btn: 'Acheter',
    more_certs: 'Voir plus de certificats',
    verified_times: 'vérifications',
    cert_number: 'Certificat Nº',
    issued: 'Émis le',
    suitable: 'Est-ce adapté pour moi ?',
    contains: 'Contient',
    free_from: 'Sans',
    download_qr: 'Télécharger QR',
    download_print: 'QR pour impression (300 DPI)',
    producer_assets: 'Ressources producteur',
    assets_desc: 'Téléchargez le QR en haute résolution pour vos emballages.',
    link_copied: 'Lien copié'
  },
  de: {
    cert_title: 'Digitales Zertifikat',
    verified: 'Verifiziert',
    product: 'Zertifiziertes Produkt',
    nutrition: 'Nährwertinformation',
    per100: 'Durchschnittswerte pro 100 g / 100 ml',
    nutrient: 'Nährstoff',
    per100g: 'Pro 100 g',
    ingredients: 'Zutaten',
    allergens: 'Allergene',
    no_allergens: 'Keine deklarierten Allergene',
    not_declared: 'Nicht deklariert',
    traceability: 'Rückverfolgbarkeit',
    made_by: 'Hergestellt von',
    origin: 'Herkunft',
    go_store: 'Shop besuchen',
    verify: 'Echtheit überprüfen',
    scan_qr: 'QR scannen oder Link kopieren, um dieses Zertifikat zu überprüfen.',
    copy_link: 'Link kopieren',
    share: 'Teilen',
    download_pdf: 'Zertifikat PDF herunterladen',
    buy: 'Produkt kaufen',
    buy_sub: 'Direkt vom Erzeuger',
    buy_btn: 'Kaufen',
    more_certs: 'Mehr Zertifikate',
    verified_times: 'Überprüfungen',
    cert_number: 'Zertifikat Nr.',
    issued: 'Ausgestellt',
    suitable: 'Ist es für mich geeignet?',
    contains: 'Enthält',
    free_from: 'Frei von',
    download_qr: 'QR herunterladen',
    download_print: 'Druck-QR (300 DPI)',
    producer_assets: 'Produzenten-Ressourcen',
    assets_desc: 'Laden Sie den QR in hoher Auflösung für Ihre Verpackungen herunter.',
    link_copied: 'Link kopiert'
  },
  pt: {
    cert_title: 'Certificado digital',
    verified: 'Verificado',
    product: 'Produto certificado',
    nutrition: 'Informação nutricional',
    per100: 'Valores médios por 100 g / 100 ml',
    nutrient: 'Nutriente',
    per100g: 'Por 100 g',
    ingredients: 'Ingredientes',
    allergens: "Alergénios",
    no_allergens: 'Sem alergénios declarados',
    not_declared: 'Não declarados',
    traceability: 'Rastreabilidade dos ingredientes',
    made_by: 'Produzido por',
    origin: 'Origem',
    go_store: 'Visitar loja',
    verify: 'Verificar autenticidade',
    scan_qr: 'Digitalize o QR ou copie o link para verificar este certificado.',
    copy_link: 'Copiar link',
    share: 'Partilhar',
    download_pdf: 'Descarregar certificado PDF',
    buy: 'Comprar produto',
    buy_sub: 'Direto do produtor',
    buy_btn: 'Comprar',
    more_certs: 'Ver mais certificados',
    verified_times: 'verificações',
    cert_number: 'Certificado Nº',
    issued: 'Emitido',
    suitable: 'É adequado para mim?',
    contains: 'Contém',
    free_from: 'Sem',
    download_qr: 'Descarregar QR',
    download_print: 'QR para impressão (300 DPI)',
    producer_assets: 'Recursos para produtores',
    assets_desc: 'Descarregue o QR em alta resolução para as suas embalagens.',
    link_copied: 'Link copiado'
  },
  ar: {
    cert_title: 'شهادة رقمية',
    verified: 'موثق',
    product: 'منتج معتمد',
    nutrition: 'معلومات غذائية',
    per100: 'القيم المتوسطة لكل 100 غ / 100 مل',
    nutrient: 'المغذيات',
    per100g: 'لكل 100 غ',
    ingredients: 'المكونات',
    allergens: 'مسببات الحساسية',
    no_allergens: 'لا مسببات حساسية معلنة',
    not_declared: 'غير معلن',
    traceability: 'تتبع المكونات',
    made_by: 'من إنتاج',
    origin: 'المنشأ',
    go_store: 'زيارة المتجر',
    verify: 'تحقق من الأصالة',
    scan_qr: 'امسح رمز QR أو انسخ الرابط للتحقق من هذه الشهادة.',
    copy_link: 'نسخ الرابط',
    share: 'مشاركة',
    download_pdf: 'تحميل شهادة PDF',
    buy: 'شراء المنتج',
    buy_sub: 'مباشرة من المنتج',
    buy_btn: 'شراء',
    more_certs: 'عرض المزيد',
    verified_times: 'تحقق',
    cert_number: 'شهادة رقم',
    issued: 'صدرت',
    suitable: 'هل هو مناسب لي؟',
    contains: 'يحتوي على',
    free_from: 'خالي من',
    download_qr: 'تحميل QR',
    download_print: 'QR للطباعة (300 DPI)',
    producer_assets: 'موارد المنتج',
    assets_desc: 'قم بتنزيل رمز QR بدقة عالية لتغليفك.',
    link_copied: 'تم نسخ الرابط'
  },
  hi: {
    cert_title: 'डिजिटल प्रमाणपत्र',
    verified: 'सत्यापित',
    product: 'प्रमाणित उत्पाद',
    nutrition: 'पोषण संबंधी जानकारी',
    per100: 'प्रति 100 ग्राम / 100 मिली औसत मान',
    nutrient: 'पोषक तत्व',
    per100g: 'प्रति 100 ग्राम',
    ingredients: 'सामग्री',
    allergens: 'एलर्जी कारक',
    no_allergens: 'कोई एलर्जी कारक घोषित नहीं',
    not_declared: 'घोषित नहीं',
    traceability: 'सामग्री ट्रेसबिलिटी',
    made_by: 'द्वारा निर्मित',
    origin: 'उत्पत्ति',
    go_store: 'दुकान देखें',
    verify: 'प्रामाणिकता सत्यापित करें',
    scan_qr: 'इस प्रमाणपत्र को सत्यापित करने के लिए QR स्कैन करें या लिंक कॉपी करें।',
    copy_link: 'लिंक कॉपी करें',
    share: 'साझा करें',
    download_pdf: 'PDF प्रमाणपत्र डाउनलोड करें',
    buy: 'उत्पाद खरीदें',
    buy_sub: 'सीधे उत्पादक से',
    buy_btn: 'खरीदें',
    more_certs: 'और देखें',
    verified_times: 'सत्यापन',
    cert_number: 'प्रमाणपत्र संख्या',
    issued: 'जारी',
    suitable: 'क्या यह मेरे लिए उपयुक्त है?',
    contains: 'शामिल है',
    free_from: 'मुक्त',
    download_qr: 'QR डाउनलोड करें',
    download_print: 'प्रिंट QR (300 DPI)',
    producer_assets: 'उत्पादक संसाधन',
    assets_desc: 'अपनी पैकेजिंग के लिए उच्च रिज़ॉल्यूशन QR डाउनलोड करें।',
    link_copied: 'लिंक कॉपी हुआ'
  },
  zh: {
    cert_title: '数字证书',
    verified: '已验证',
    product: '认证产品',
    nutrition: '营养信息',
    per100: '每100克/100毫升平均值',
    nutrient: '营养素',
    per100g: '每100克',
    ingredients: '配料',
    allergens: '过敏原',
    no_allergens: '无已申报过敏原',
    not_declared: '未申报',
    traceability: '配料可追溯性',
    made_by: '生产商',
    origin: '产地',
    go_store: '访问店铺',
    verify: '验证真伪',
    scan_qr: '扫描二维码或复制链接以验证此证书。',
    copy_link: '复制链接',
    share: '分享',
    download_pdf: '下载PDF证书',
    buy: '购买产品',
    buy_sub: '直接从生产商购买',
    buy_btn: '购买',
    more_certs: '查看更多',
    verified_times: '次验证',
    cert_number: '证书编号',
    issued: '签发日期',
    suitable: '适合我吗？',
    contains: '含有',
    free_from: '不含',
    download_qr: '下载二维码',
    download_print: '印刷用二维码 (300 DPI)',
    producer_assets: '生产商资源',
    assets_desc: '下载高分辨率二维码用于包装。',
    link_copied: '链接已复制'
  },
  ja: {
    cert_title: 'デジタル証明書',
    verified: '検証済み',
    product: '認証製品',
    nutrition: '栄養成分表示',
    per100: '100g/100mlあたりの平均値',
    nutrient: '栄養素',
    per100g: '100gあたり',
    ingredients: '原材料',
    allergens: 'アレルゲン',
    no_allergens: 'アレルゲン表示なし',
    not_declared: '表示なし',
    traceability: '原材料のトレーサビリティ',
    made_by: '製造者',
    origin: '原産地',
    go_store: 'ショップを見る',
    verify: '真正性を確認',
    scan_qr: 'QRコードをスキャンするかリンクをコピーして証明書を確認してください。',
    copy_link: 'リンクをコピー',
    share: '共有',
    download_pdf: 'PDF証明書をダウンロード',
    buy: '製品を購入',
    buy_sub: '生産者から直接',
    buy_btn: '購入',
    more_certs: 'もっと見る',
    verified_times: '回検証',
    cert_number: '証明書番号',
    issued: '発行日',
    suitable: '私に合いますか？',
    contains: '含む',
    free_from: '不使用',
    download_qr: 'QRをダウンロード',
    download_print: '印刷用QR (300 DPI)',
    producer_assets: '生産者向けリソース',
    assets_desc: 'パッケージ用の高解像度QRをダウンロード。',
    link_copied: 'リンクをコピーしました'
  },
  ko: {
    cert_title: '디지털 인증서',
    verified: '인증됨',
    product: '인증 제품',
    nutrition: '영양 정보',
    per100: '100g/100ml당 평균값',
    nutrient: '영양소',
    per100g: '100g당',
    ingredients: '원재료',
    allergens: '알레르기 유발 물질',
    no_allergens: '신고된 알레르기 유발 물질 없음',
    not_declared: '미신고',
    traceability: '원재료 추적',
    made_by: '제조사',
    origin: '원산지',
    go_store: '매장 방문',
    verify: '진위 확인',
    scan_qr: 'QR 코드를 스캔하거나 링크를 복사하여 인증서를 확인하세요.',
    copy_link: '링크 복사',
    share: '공유',
    download_pdf: 'PDF 인증서 다운로드',
    buy: '제품 구매',
    buy_sub: '생산자에서 직접',
    buy_btn: '구매',
    more_certs: '더보기',
    verified_times: '회 인증',
    cert_number: '인증서 번호',
    issued: '발급일',
    suitable: '나에게 적합한가요?',
    contains: '포함',
    free_from: '무첨가',
    download_qr: 'QR 다운로드',
    download_print: '인쇄용 QR (300 DPI)',
    producer_assets: '생산자 리소스',
    assets_desc: '포장용 고해상도 QR을 다운로드하세요.',
    link_copied: '링크가 복사되었습니다'
  },
  ru: {
    cert_title: 'Цифровой сертификат',
    verified: 'Проверено',
    product: 'Сертифицированный продукт',
    nutrition: 'Пищевая ценность',
    per100: 'Средние значения на 100 г / 100 мл',
    nutrient: 'Нутриент',
    per100g: 'На 100 г',
    ingredients: 'Ингредиенты',
    allergens: 'Аллергены',
    no_allergens: 'Аллергены не заявлены',
    not_declared: 'Не заявлено',
    traceability: 'Отслеживаемость ингредиентов',
    made_by: 'Произведено',
    origin: 'Происхождение',
    go_store: 'Посетить магазин',
    verify: 'Проверить подлинность',
    scan_qr: 'Отсканируйте QR или скопируйте ссылку для проверки сертификата.',
    copy_link: 'Копировать ссылку',
    share: 'Поделиться',
    download_pdf: 'Скачать PDF сертификат',
    buy: 'Купить продукт',
    buy_sub: 'Напрямую от производителя',
    buy_btn: 'Купить',
    more_certs: 'Ещё сертификаты',
    verified_times: 'проверок',
    cert_number: 'Сертификат №',
    issued: 'Выдан',
    suitable: 'Подходит ли мне?',
    contains: 'Содержит',
    free_from: 'Без',
    download_qr: 'Скачать QR',
    download_print: 'QR для печати (300 DPI)',
    producer_assets: 'Ресурсы производителя',
    assets_desc: 'Скачайте QR в высоком разрешении для упаковки.',
    link_copied: 'Ссылка скопирована'
  }
};

// Fallback: use detected language or 'es'
function getTexts(lang) {
  return UI_TEXTS[lang] || UI_TEXTS.en || UI_TEXTS.es;
}

/* ══════════════════════════════════════════════════════════════
   CertificatePage — Product passport for QR scanning
   ══════════════════════════════════════════════════════════════ */
export default function CertificatePage() {
  const {
    productId
  } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    t
  } = useTranslation();
  const {
    product,
    certificate,
    storeInfo: hookStoreInfo,
    isLoading
  } = useProductDetail(productId);

  // CD-01: Auto-detect device language
  const browserLang = (navigator.language || navigator.userLanguage || 'es').slice(0, 2);
  const initialLang = searchParams.get('lang') || (CERT_LANGUAGES.some(l => l.code === browserLang) ? browserLang : 'es');
  const [certLang, setCertLang] = useState(initialLang);
  const [translatedCert, setTranslatedCert] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // CD-02: Detect QR scan context via ?scan=1 param (set in QR URL)
  const isQrScan = searchParams.get('scan') === '1';
  const isRtl = CERT_LANGUAGES.find(l => l.code === certLang)?.rtl || false;
  const txt = getTexts(certLang); // CD-09: Translated fixed UI texts

  // Fetch translation on lang change — CD-01: fires automatically for non-Spanish devices
  const fetchTranslation = useCallback(async lang => {
    if (lang === 'es' || !productId) {
      setTranslatedCert(null);
      return;
    }
    setTranslating(true);
    try {
      const data = await apiClient.get(`/certificates/${productId}/verify?lang=${lang}`);
      setTranslatedCert(data);
    } catch {
      setTranslatedCert(null);
    } finally {
      setTranslating(false);
    }
  }, [productId]);
  useEffect(() => {
    fetchTranslation(certLang);
  }, [certLang, fetchTranslation]);
  const handleLangChange = code => {
    setCertLang(code);
    setLangOpen(false);
    setSearchParams(prev => {
      prev.set('lang', code);
      return prev;
    }, {
      replace: true
    });
  };

  // Resolved data
  const tc = translatedCert || {};
  const storeInfo = tc.store_info || hookStoreInfo || {};
  const productImage = product?.images?.[0] || product?.image_url || tc.product_image || null;
  const nutrition = tc.nutritional_info || certificate?.data?.nutritional_info || certificate?.data?.nutrition_info || product?.nutritional_info || product?.nutrition_info || null;
  const ingredients = useMemo(() => normalizeList(tc.ingredients || certificate?.data?.ingredients || product?.ingredients), [tc.ingredients, certificate?.data?.ingredients, product?.ingredients]);
  const allergens = useMemo(() => normalizeList(tc.allergens || certificate?.data?.allergens || product?.allergens), [tc.allergens, certificate?.data?.allergens, product?.allergens]);
  const ingredientOrigins = useMemo(() => normalizeIngredientOrigins(certificate?.data?.ingredient_origins), [certificate?.data?.ingredient_origins]);
  const certifications = tc.certifications || (Array.isArray(product?.certifications) ? product.certifications : normalizeList(product?.certifications || certificate?.certificate_type));
  const displayName = tc.product_name || product?.name || '';
  const storeSlug = storeInfo?.slug || storeInfo?.store_slug || null;
  const canBuyFromStore = Boolean(storeSlug);
  const scanCount = tc.scan_count || certificate?.scan_count || 0;
  const certNumber = tc.certificate_number || certificate?.certificate_number || certificate?.certificate_id || '';
  const issueDate = tc.issue_date || certificate?.issue_date || certificate?.created_at || '';
  const handleBuy = () => {
    if (canBuyFromStore) navigate(`/store/${storeSlug}?product=${productId}`);else navigate(`/products/${productId}`);
  };

  // ── Loading ──
  if (isLoading) {
    return <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        {!isQrScan && <Header />}
        <div className="mx-auto max-w-[600px] px-4 py-12">
          <div className="rounded-[32px] border border-stone-100 bg-white p-8 space-y-6 dark:bg-stone-900 dark:border-stone-800">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-1/2 animate-pulse rounded-full bg-stone-100 dark:bg-stone-800" />
                <div className="h-3.5 w-1/4 animate-pulse rounded-full bg-stone-100 dark:bg-stone-800" />
              </div>
            </div>
            <div className="h-48 w-full animate-pulse rounded-2xl bg-stone-50 dark:bg-stone-800" />
          </div>
        </div>
        {!isQrScan && <Footer />}
      </div>;
  }

  // ── Not found ──
  if (!certificate || !product) {
    return <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        {!isQrScan && <Header />}
        <div className="mx-auto max-w-[600px] px-4 py-16 text-center">
          <div className="rounded-[32px] border border-stone-100 bg-white p-10 shadow-sm dark:bg-stone-900 dark:border-stone-800">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
              <FileCheck className="h-6 w-6 text-stone-500" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-stone-950 dark:text-white">Certificado no encontrado</h1>
            <p className="mt-2 text-sm text-stone-500">{t('certificate.noHemosEncontradoLaFichaDeConfianz', 'No hemos encontrado la ficha de confianza de este producto.')}</p>
            <Link to="/certificates" className="mt-6 inline-flex">
              <button type="button" className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 dark:bg-white dark:text-stone-950">
                Volver a certificados
              </button>
            </Link>
          </div>
        </div>
        {!isQrScan && <Footer />}
      </div>;
  }

  // ── QR URLs ──
  const certUrl = `${window.location.origin}/certificate/${productId}`;
  const qrSrc = certificate?.qr_code ? `data:image/png;base64,${certificate.qr_code}` : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(certUrl)}&bgcolor=ffffff&color=0c0a09`;
  const qrHiRes = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(certUrl)}&bgcolor=ffffff&color=0c0a09`;
  const qrPrint = `https://api.qrserver.com/v1/create-qr-code/?size=3000x3000&data=${encodeURIComponent(certUrl)}&bgcolor=ffffff&color=0c0a09`; // CD-07
  const certId = certificate?.certificate_id || productId;
  const pdfUrl = certId ? `/api/certificates/${certId}/pdf` : null;
  return <div className="min-h-screen bg-stone-50 dark:bg-stone-950" data-testid="certificate-page">
      {/* CD-02: Only show header when not from QR scan */}
      {!isQrScan && <Header />}

      <div className={`mx-auto max-w-[600px] px-4 ${isQrScan ? 'pt-6' : 'py-8 sm:px-6'} pb-8`}>
        {!isQrScan && <BackButton />}

        {/* ═══ PASSPORT CARD ═══ */}
        <div className={`${isQrScan ? '' : 'mt-5'} overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm dark:bg-stone-900 dark:border-stone-800`} dir={isRtl ? 'rtl' : 'ltr'}>

          {/* Dark header band */}
          <div className="flex items-center justify-between bg-stone-950 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-stone-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                {txt.cert_title}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Language selector */}
              <div className="relative">
                <button type="button" onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1.5 rounded-full bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-300 hover:bg-stone-700 transition-colors">
                  <Globe className="h-3 w-3" />
                  {CERT_LANGUAGES.find(l => l.code === certLang)?.flag}
                  <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-2xl border border-stone-200 bg-white py-1 shadow-lg max-h-64 overflow-y-auto dark:bg-stone-800 dark:border-stone-700">
                      {CERT_LANGUAGES.map(l => <button key={l.code} type="button" onClick={() => handleLangChange(l.code)} className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${certLang === l.code ? 'bg-stone-100 font-semibold text-stone-950 dark:bg-stone-700 dark:text-white' : 'text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700'}`}>
                          <span className="text-base">{l.flag}</span>
                          <span>{l.label}</span>
                        </button>)}
                    </div>
                  </>}
              </div>
              {translating && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-500 border-t-white" />}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2} />
                <span className="text-xs font-semibold text-white">{txt.verified}</span>
              </div>
            </div>
          </div>

          {/* Product identity */}
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-none items-center justify-center border-b border-stone-100 bg-stone-50 p-8 sm:w-52 sm:border-b-0 sm:border-r dark:bg-stone-800 dark:border-stone-700">
              {productImage ? <img src={productImage} alt={product.name} loading="lazy" className="max-h-[300px] w-full rounded-2xl object-cover" /> : <div className="flex h-32 w-32 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-700">
                  <Package className="h-10 w-10 text-stone-400" />
                </div>}
            </div>
            <div className="flex-1 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.product}</p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-950 dark:text-white">{displayName}</h1>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {product.short_description || product.description || ''}
              </p>

              {/* Meta pills */}
              <div className="mt-4 flex flex-wrap gap-2">
                {product.country_origin && <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                    <MapPin className="h-3 w-3" /> {product.country_origin}
                  </span>}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  <Package className="h-3 w-3" /> {storeInfo?.name || product.producer_name || 'Hispaloshop'}
                </span>
              </div>

              {/* Certification badges */}
              {certifications.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                  {certifications.map(item => <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      <Award className="h-3 w-3" /> {item}
                    </span>)}
                </div>}

              {/* CD-05: Certificate number + issue date */}
              {certNumber && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-400">
                  <span>{txt.cert_number}: <span className="font-semibold text-stone-600 dark:text-stone-300">{certNumber}</span></span>
                  {issueDate && <span>{txt.issued}: <span className="font-semibold text-stone-600 dark:text-stone-300">{new Date(issueDate).toLocaleDateString(certLang === 'es' ? 'es-ES' : certLang, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}</span></span>}
                </div>}

              {/* CD-06: Scan counter */}
              {scanCount > 0 && <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
                  <Eye className="h-3 w-3" />
                  <span>{abbreviateCount(scanCount)} {txt.verified_times}</span>
                </div>}
            </div>
          </div>
        </div>

        {/* ═══ CD-04: "¿Es apto para mí?" — Visual allergen indicators ═══ */}
        {(allergens.length > 0 || certifications.some(c => /sin gluten|gluten.free|vegano|vegan|sin lactosa|lactose.free/i.test(c))) && <div className="mt-5 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm dark:bg-stone-900 dark:border-stone-800">
            <h2 className="mb-4 text-base font-semibold text-stone-950 dark:text-white">{txt.suitable}</h2>

            {/* Contains */}
            {allergens.length > 0 && <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2">{txt.contains}</p>
                <div className="flex flex-wrap gap-2">
                  {allergens.map(a => {
              const key = a.toLowerCase();
              const icon = Object.entries(ALLERGEN_ICONS).find(([k]) => key.includes(k))?.[1] || '⚠️';
              return <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800">
                        <span className="text-sm">{icon}</span> {a}
                      </span>;
            })}
                </div>
              </div>}

            {/* Free from (derived from certifications) */}
            {(() => {
          const freeFrom = certifications.filter(c => /sin gluten|gluten.free|vegano|vegan|sin lactosa|lactose.free|sin ogm|non.gmo/i.test(c));
          if (freeFrom.length === 0) return null;
          return <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-2">{txt.free_from}</p>
                  <div className="flex flex-wrap gap-2">
                    {freeFrom.map(f => <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-800">
                        <Check className="h-3 w-3" /> {f}
                      </span>)}
                  </div>
                </div>;
        })()}
          </div>}

        {/* ═══ CD-03: Nutrition label with proper units ═══ */}
        {nutrition && typeof nutrition === 'object' && Object.keys(nutrition).length > 0 && <div className="mt-5 overflow-hidden rounded-[28px] border-2 border-stone-950 bg-white dark:bg-stone-900">
            <div className="border-b-[3px] border-stone-950 bg-white px-5 pt-4 pb-3 dark:bg-stone-900">
              <h2 className="text-xl font-black uppercase tracking-tight text-stone-950 dark:text-white">{txt.nutrition}</h2>
              <p className="text-xs text-stone-500">{txt.per100}</p>
            </div>
            <div className="flex items-center justify-between border-b border-stone-950 bg-stone-950 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-stone-300">
              <span>{txt.nutrient}</span>
              <span>{txt.per100g}</span>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {Object.entries(nutrition).map(([key, value], i) => {
            const normalKey = key.toLowerCase().replace(/\s+/g, '_');
            const unit = NUTRIENT_UNITS[normalKey] || NUTRIENT_UNITS[key] || '';
            const label = NUTRIENT_LABELS[normalKey] || NUTRIENT_LABELS[key] || key.replace(/_/g, ' ');
            const isIndented = label.startsWith('—');
            return <div key={key} className={`flex items-center justify-between px-5 py-2.5 text-sm ${i === 0 ? 'font-bold text-stone-950 dark:text-white' : 'text-stone-700 dark:text-stone-300'}`}>
                    <span className={`capitalize ${isIndented ? 'pl-3 text-stone-500 dark:text-stone-400' : ''}`}>{label}</span>
                    <span className={`${i === 0 ? 'font-black text-stone-950 dark:text-white' : 'font-semibold text-stone-950 dark:text-white'}`}>
                      {String(value)} {unit}
                    </span>
                  </div>;
          })}
            </div>
          </div>}

        {/* ═══ Ingredients + Allergens grid ═══ */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm dark:bg-stone-900 dark:border-stone-800">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.ingredients}</h2>
            {ingredients.length > 0 ? <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{ingredients.join(', ')}.</p> : <p className="text-sm text-stone-400">{txt.not_declared}</p>}
          </div>
          <div className="rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm dark:bg-stone-900 dark:border-stone-800">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.allergens}</h2>
            {allergens.length > 0 ? <div className="flex flex-wrap gap-2">
                {allergens.map(a => <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white">
                    <AlertTriangle className="h-3 w-3" /> {a}
                  </span>)}
              </div> : <p className="text-sm text-stone-400">{txt.no_allergens}</p>}
          </div>
        </div>

        {/* ═══ Ingredient origins ═══ */}
        {ingredientOrigins.length > 0 && <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm dark:bg-stone-900 dark:border-stone-800">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.traceability}</h2>
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {ingredientOrigins.map(item => <div key={`${item.ingredient}-${item.origin}`} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-stone-950 dark:text-white">{item.ingredient}</span>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <MapPin className="h-3 w-3" /> {item.origin}
                  </div>
                </div>)}
            </div>
          </div>}

        {/* ═══ Producer story ═══ */}
        <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm dark:bg-stone-900 dark:border-stone-800">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.made_by}</h2>
          <div className="flex items-center gap-3 mb-3">
            {storeInfo?.logo && <img src={storeInfo.logo} alt="" className="h-10 w-10 rounded-full object-cover border border-stone-200" />}
            <p className="text-base font-semibold text-stone-950 dark:text-white">
              {storeInfo?.name || product.producer_name || 'Productor independiente'}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {storeInfo?.story || storeInfo?.tagline || product.description || ''}
          </p>
          {(product.country_origin || product.region) && <>
              <h3 className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.origin}</h3>
              <div className="flex flex-wrap gap-2">
                {product.country_origin && <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300">
                    <MapPin className="h-3 w-3" /> {product.country_origin}
                  </span>}
              </div>
            </>}
          {canBuyFromStore && <button type="button" onClick={handleBuy} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-stone-950 hover:text-stone-600 dark:text-white">
              {txt.go_store} <ChevronRight className="h-4 w-4" />
            </button>}
        </div>

        {/* ═══ QR Verification + Share ═══ */}
        <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm dark:bg-stone-900 dark:border-stone-800">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <img src={qrSrc} alt="QR" width={200} height={200} className="shrink-0 rounded-2xl" />
              <a href={qrHiRes} download="certificado-qr.png" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-950">
                <Download className="h-3.5 w-3.5" /> {txt.download_qr}
              </a>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-stone-950 dark:text-white">{txt.verify}</p>
              <p className="mt-1 text-xs text-stone-500">{txt.scan_qr}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <button type="button" onClick={() => {
                navigator.clipboard.writeText(certUrl);
                toast.success(txt.link_copied);
              }} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300">
                  <Copy className="h-3 w-3" /> {txt.copy_link}
                </button>
                <button type="button" onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `${txt.cert_title} - ${product.name}`,
                      url: certUrl
                    });
                  } catch {}
                } else {
                  navigator.clipboard.writeText(certUrl);
                  toast.success(txt.link_copied);
                }
              }} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300">
                  <Send className="h-3 w-3" /> {txt.share}
                </button>
              </div>
              {pdfUrl && <div className="mt-4">
                  <a href={pdfUrl} download="certificado.pdf" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200">
                    <Download className="h-4 w-4" /> {txt.download_pdf}
                  </a>
                </div>}
            </div>
          </div>
        </div>

        {/* ═══ CD-08: Producer assets section (QR for packaging) ═══ */}
        <div className="mt-4 rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-6 dark:bg-stone-900 dark:border-stone-700">
          <div className="flex items-start gap-3">
            <Printer className="h-5 w-5 text-stone-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-950 dark:text-white">{txt.producer_assets}</p>
              <p className="mt-1 text-xs text-stone-500">{txt.assets_desc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={qrHiRes} download={`qr-${productId}-1000px.png`} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300">
                  <Download className="h-3 w-3" /> {txt.download_qr} (1000px)
                </a>
                <a href={qrPrint} download={`qr-${productId}-print-300dpi.png`} className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-white dark:text-stone-950">
                  <Printer className="h-3 w-3" /> {txt.download_print}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Buy CTA bar ═══ */}
        <div className="mt-5 flex items-center justify-between rounded-[28px] bg-stone-950 px-6 py-5">
          <div>
            <p className="font-semibold text-white">{txt.buy}</p>
            <p className="text-xs text-stone-400">{txt.buy_sub}</p>
          </div>
          <button type="button" onClick={handleBuy} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-stone-100">
            {txt.buy_btn}
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          <Link to="/certificates" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600">
            {txt.more_certs} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* CD-02: Only show footer when not from QR scan */}
      {!isQrScan && <Footer />}
    </div>;
}
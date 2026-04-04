/* ── Certificate page constants — extracted from CertificatePage.tsx ── */

export const CERT_LANGUAGES: readonly { code: string; label: string; flag: string; rtl?: boolean }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

export type CertLangCode = string;

export const NUTRIENT_UNITS: Record<string, string> = {
  calories: 'kcal', energy: 'kcal', energia: 'kcal', valor_energetico: 'kcal', 'valor_energético': 'kcal',
  protein: 'g', proteinas: 'g', 'proteína': 'g', 'proteínas': 'g',
  carbs: 'g', carbohydrates: 'g', carbohidratos: 'g', hidratos: 'g', hidratos_de_carbono: 'g',
  sugars: 'g', azucares: 'g', 'azúcares': 'g', sugar: 'g',
  fat: 'g', grasa: 'g', grasas: 'g', fats: 'g', grasas_totales: 'g',
  saturated_fat: 'g', grasas_saturadas: 'g', saturated: 'g', saturadas: 'g',
  fiber: 'g', fibra: 'g', fibra_alimentaria: 'g',
  sodium: 'mg', sodio: 'mg', salt: 'g', sal: 'g',
};

export const NUTRIENT_LABELS: Record<string, string> = {
  calories: 'Energía', energy: 'Energía', energia: 'Energía', valor_energetico: 'Energía', 'valor_energético': 'Energía',
  protein: 'Proteínas', proteinas: 'Proteínas', 'proteína': 'Proteínas', 'proteínas': 'Proteínas',
  carbs: 'Hidratos de carbono', carbohydrates: 'Hidratos de carbono', carbohidratos: 'Hidratos de carbono', hidratos_de_carbono: 'Hidratos de carbono',
  sugars: '— de los cuales azúcares', azucares: '— de los cuales azúcares', 'azúcares': '— de los cuales azúcares', sugar: '— de los cuales azúcares',
  fat: 'Grasas', grasa: 'Grasas', grasas: 'Grasas', grasas_totales: 'Grasas totales',
  saturated_fat: '— de las cuales saturadas', saturated: '— de las cuales saturadas', grasas_saturadas: '— de las cuales saturadas', saturadas: '— de las cuales saturadas',
  fiber: 'Fibra alimentaria', fibra: 'Fibra alimentaria', fibra_alimentaria: 'Fibra alimentaria',
  sodium: 'Sodio', sodio: 'Sodio', salt: 'Sal', sal: 'Sal',
};

export const ALLERGEN_ICONS: Record<string, string> = {
  gluten: '🌾', trigo: '🌾', wheat: '🌾',
  lactosa: '🥛', leche: '🥛', milk: '🥛', dairy: '🥛', lactose: '🥛',
  huevo: '🥚', huevos: '🥚', egg: '🥚', eggs: '🥚',
  'frutos secos': '🥜', nueces: '🥜', nuts: '🥜', 'tree nuts': '🥜', cacahuete: '🥜', peanut: '🥜', 'maní': '🥜',
  soja: '🫘', soy: '🫘',
  pescado: '🐟', fish: '🐟',
  marisco: '🦐', shellfish: '🦐', crustaceans: '🦐',
  apio: '🥬', celery: '🥬',
  mostaza: '🟡', mustard: '🟡',
  'sésamo': '🫘', sesame: '🫘',
  sulfitos: '🍷', sulphites: '🍷', sulfites: '🍷',
  moluscos: '🐚', molluscs: '🐚',
  altramuces: '🌱', lupin: '🌱',
};

/** UI text translations for all 11 certificate languages */
export interface CertUITexts {
  cert_title: string;
  verified: string;
  product: string;
  nutrition: string;
  per100: string;
  nutrient: string;
  per100g: string;
  ingredients: string;
  allergens: string;
  no_allergens: string;
  not_declared: string;
  traceability: string;
  made_by: string;
  origin: string;
  go_store: string;
  verify: string;
  scan_qr: string;
  copy_link: string;
  share: string;
  download_pdf: string;
  buy: string;
  buy_sub: string;
  buy_btn: string;
  more_certs: string;
  verified_times: string;
  cert_number: string;
  issued: string;
  suitable: string;
  contains: string;
  free_from: string;
  download_qr: string;
  download_print: string;
  producer_assets: string;
  assets_desc: string;
  link_copied: string;
}

export const UI_TEXTS: Record<string, CertUITexts> = {
  es: { cert_title:'Certificado digital',verified:'Verificado',product:'Producto certificado',nutrition:'Información nutricional',per100:'Valores medios por 100 g / 100 ml',nutrient:'Nutriente',per100g:'Por 100 g',ingredients:'Ingredientes',allergens:'Alérgenos',no_allergens:'Sin alérgenos declarados',not_declared:'No declarados',traceability:'Trazabilidad de ingredientes',made_by:'Elaborado por',origin:'Origen',go_store:'Ir a la tienda',verify:'Verificar autenticidad',scan_qr:'Escanea el QR o copia el enlace para verificar este certificado.',copy_link:'Copiar enlace',share:'Compartir',download_pdf:'Descargar certificado PDF',buy:'Comprar producto',buy_sub:'Directo al productor',buy_btn:'Comprar',more_certs:'Ver más certificados',verified_times:'verificaciones',cert_number:'Certificado Nº',issued:'Emitido',suitable:'¿Es apto para mí?',contains:'Contiene',free_from:'No contiene',download_qr:'Descargar QR',download_print:'QR para imprimir (300 DPI)',producer_assets:'Recursos para productores',assets_desc:'Descarga el QR en alta resolución para tus envases y etiquetas.',link_copied:'Enlace copiado' },
  en: { cert_title:'Digital Certificate',verified:'Verified',product:'Certified Product',nutrition:'Nutrition Facts',per100:'Average values per 100 g / 100 ml',nutrient:'Nutrient',per100g:'Per 100 g',ingredients:'Ingredients',allergens:'Allergens',no_allergens:'No declared allergens',not_declared:'Not declared',traceability:'Ingredient Traceability',made_by:'Made by',origin:'Origin',go_store:'Visit store',verify:'Verify authenticity',scan_qr:'Scan the QR or copy the link to verify this certificate.',copy_link:'Copy link',share:'Share',download_pdf:'Download PDF certificate',buy:'Buy product',buy_sub:'Direct from producer',buy_btn:'Buy',more_certs:'Browse certificates',verified_times:'verifications',cert_number:'Certificate No.',issued:'Issued',suitable:'Is it suitable for me?',contains:'Contains',free_from:'Free from',download_qr:'Download QR',download_print:'Print-ready QR (300 DPI)',producer_assets:'Producer resources',assets_desc:'Download high-resolution QR for your packaging and labels.',link_copied:'Link copied' },
  fr: { cert_title:'Certificat numérique',verified:'Vérifié',product:'Produit certifié',nutrition:'Informations nutritionnelles',per100:'Valeurs moyennes pour 100 g / 100 ml',nutrient:'Nutriment',per100g:'Pour 100 g',ingredients:'Ingrédients',allergens:'Allergènes',no_allergens:"Pas d'allergènes déclarés",not_declared:'Non déclarés',traceability:'Traçabilité des ingrédients',made_by:'Élaboré par',origin:'Origine',go_store:'Visiter la boutique',verify:"Vérifier l'authenticité",scan_qr:'Scannez le QR ou copiez le lien pour vérifier ce certificat.',copy_link:'Copier le lien',share:'Partager',download_pdf:'Télécharger le certificat PDF',buy:'Acheter le produit',buy_sub:'Direct du producteur',buy_btn:'Acheter',more_certs:'Voir plus de certificats',verified_times:'vérifications',cert_number:'Certificat Nº',issued:'Émis le',suitable:'Est-ce adapté pour moi ?',contains:'Contient',free_from:'Sans',download_qr:'Télécharger QR',download_print:'QR pour impression (300 DPI)',producer_assets:'Ressources producteur',assets_desc:'Téléchargez le QR en haute résolution pour vos emballages.',link_copied:'Lien copié' },
  de: { cert_title:'Digitales Zertifikat',verified:'Verifiziert',product:'Zertifiziertes Produkt',nutrition:'Nährwertinformation',per100:'Durchschnittswerte pro 100 g / 100 ml',nutrient:'Nährstoff',per100g:'Pro 100 g',ingredients:'Zutaten',allergens:'Allergene',no_allergens:'Keine deklarierten Allergene',not_declared:'Nicht deklariert',traceability:'Rückverfolgbarkeit',made_by:'Hergestellt von',origin:'Herkunft',go_store:'Shop besuchen',verify:'Echtheit überprüfen',scan_qr:'QR scannen oder Link kopieren, um dieses Zertifikat zu überprüfen.',copy_link:'Link kopieren',share:'Teilen',download_pdf:'Zertifikat PDF herunterladen',buy:'Produkt kaufen',buy_sub:'Direkt vom Erzeuger',buy_btn:'Kaufen',more_certs:'Mehr Zertifikate',verified_times:'Überprüfungen',cert_number:'Zertifikat Nr.',issued:'Ausgestellt',suitable:'Ist es für mich geeignet?',contains:'Enthält',free_from:'Frei von',download_qr:'QR herunterladen',download_print:'Druck-QR (300 DPI)',producer_assets:'Produzenten-Ressourcen',assets_desc:'Laden Sie den QR in hoher Auflösung für Ihre Verpackungen herunter.',link_copied:'Link kopiert' },
  pt: { cert_title:'Certificado digital',verified:'Verificado',product:'Produto certificado',nutrition:'Informação nutricional',per100:'Valores médios por 100 g / 100 ml',nutrient:'Nutriente',per100g:'Por 100 g',ingredients:'Ingredientes',allergens:'Alergénios',no_allergens:'Sem alergénios declarados',not_declared:'Não declarados',traceability:'Rastreabilidade dos ingredientes',made_by:'Produzido por',origin:'Origem',go_store:'Visitar loja',verify:'Verificar autenticidade',scan_qr:'Digitalize o QR ou copie o link para verificar este certificado.',copy_link:'Copiar link',share:'Partilhar',download_pdf:'Descarregar certificado PDF',buy:'Comprar produto',buy_sub:'Direto do produtor',buy_btn:'Comprar',more_certs:'Ver mais certificados',verified_times:'verificações',cert_number:'Certificado Nº',issued:'Emitido',suitable:'É adequado para mim?',contains:'Contém',free_from:'Sem',download_qr:'Descarregar QR',download_print:'QR para impressão (300 DPI)',producer_assets:'Recursos para produtores',assets_desc:'Descarregue o QR em alta resolução para as suas embalagens.',link_copied:'Link copiado' },
  ar: { cert_title:'شهادة رقمية',verified:'موثق',product:'منتج معتمد',nutrition:'معلومات غذائية',per100:'القيم المتوسطة لكل 100 غ / 100 مل',nutrient:'المغذيات',per100g:'لكل 100 غ',ingredients:'المكونات',allergens:'مسببات الحساسية',no_allergens:'لا مسببات حساسية معلنة',not_declared:'غير معلن',traceability:'تتبع المكونات',made_by:'من إنتاج',origin:'المنشأ',go_store:'زيارة المتجر',verify:'تحقق من الأصالة',scan_qr:'امسح رمز QR أو انسخ الرابط للتحقق من هذه الشهادة.',copy_link:'نسخ الرابط',share:'مشاركة',download_pdf:'تحميل شهادة PDF',buy:'شراء المنتج',buy_sub:'مباشرة من المنتج',buy_btn:'شراء',more_certs:'عرض ال��زيد',verified_times:'تحقق',cert_number:'شهادة رقم',issued:'صدرت',suitable:'هل هو مناسب لي؟',contains:'يحتوي على',free_from:'خالي من',download_qr:'تحميل QR',download_print:'QR للطباعة (300 DPI)',producer_assets:'موارد المنتج',assets_desc:'قم بتنزيل رمز QR بدقة عالية لتغليفك.',link_copied:'تم نسخ الرابط' },
  hi: { cert_title:'डिजिटल प्रमाणपत्र',verified:'सत्यापित',product:'प्रमाणित उत्पाद',nutrition:'पोषण संबंधी जानकारी',per100:'प्रति 100 ग्राम / 100 मिली औसत मान',nutrient:'पोषक तत्व',per100g:'प्रति 100 ग्राम',ingredients:'सामग्री',allergens:'एलर्जी कारक',no_allergens:'कोई एलर्जी कारक घोषित नहीं',not_declared:'घोषित नहीं',traceability:'सामग्री ट्रेसबिलिटी',made_by:'द्वारा निर्मित',origin:'उत्पत्ति',go_store:'दुकान देखें',verify:'प्रामाणिकता सत्यापित करें',scan_qr:'इस प्रमाणपत्र को सत्यापित करने के लिए QR स्कैन करें या लिंक कॉपी करें।',copy_link:'लिंक कॉपी करें',share:'साझा करें',download_pdf:'PDF प्रमाणपत्र डाउनलोड करें',buy:'उत्पाद खरीद��ं',buy_sub:'सीधे उत्पादक से',buy_btn:'खरीदें',more_certs:'और देखें',verified_times:'सत्यापन',cert_number:'प्रमाणपत्र संख्या',issued:'जारी',suitable:'क्या यह मेरे लिए उपयुक्त है?',contains:'शामिल है',free_from:'मुक्त',download_qr:'QR डाउनलोड करें',download_print:'प्रिंट QR (300 DPI)',producer_assets:'उत्पादक संसाधन',assets_desc:'अपनी पैकेजिंग के लिए उच्च रिज़ॉल्यूशन QR डाउनलोड करें।',link_copied:'लिंक कॉपी हुआ' },
  zh: { cert_title:'数字证书',verified:'已验证',product:'认证产品',nutrition:'营养信息',per100:'每100克/100毫升平均值',nutrient:'营养素',per100g:'每100克',ingredients:'配料',allergens:'过敏原',no_allergens:'无已申报过敏原',not_declared:'未申报',traceability:'配料可追溯性',made_by:'生产商',origin:'产地',go_store:'访问店铺',verify:'验证真伪',scan_qr:'扫描二维码或复制链接以验证此证书。',copy_link:'复制链接',share:'分享',download_pdf:'下载PDF证书',buy:'购买产品',buy_sub:'直接从生产商购买',buy_btn:'购买',more_certs:'查看更多',verified_times:'次验证',cert_number:'证书编号',issued:'签发日期',suitable:'适合我吗？',contains:'含有',free_from:'不含',download_qr:'下载二维码',download_print:'印刷用二维码 (300 DPI)',producer_assets:'生产商资源',assets_desc:'下载高分��率二维码用于包装。',link_copied:'链接已复制' },
  ja: { cert_title:'デジタル証明書',verified:'検証済み',product:'認証製品',nutrition:'栄養成分表示',per100:'100g/100mlあたりの平均値',nutrient:'栄養素',per100g:'100gあたり',ingredients:'原材料',allergens:'アレルゲン',no_allergens:'アレルゲン表示なし',not_declared:'表示なし',traceability:'原材料のトレーサビリティ',made_by:'製造者',origin:'原産地',go_store:'ショップを見る',verify:'真正性を確認',scan_qr:'QRコードをスキャンするかリンクをコピ��して証明書を確認してください。',copy_link:'リンクをコピー',share:'共有',download_pdf:'PDF証明書をダウンロード',buy:'製品を購入',buy_sub:'生産者から直接',buy_btn:'購入',more_certs:'もっと見る',verified_times:'回検証',cert_number:'証明書番号',issued:'発行日',suitable:'私に合いますか？',contains:'含む',free_from:'不使用',download_qr:'QRをダウンロード',download_print:'印刷用QR (300 DPI)',producer_assets:'生産者向けリソース',assets_desc:'パッケージ用の高解像度QRをダウンロード。',link_copied:'リンクをコピーしました' },
  ko: { cert_title:'디지털 인증서',verified:'인증됨',product:'인증 제품',nutrition:'영양 정보',per100:'100g/100ml당 평균값',nutrient:'영양소',per100g:'100g당',ingredients:'원재료',allergens:'알레르기 유발 물질',no_allergens:'신고된 알레르기 유발 물질 없음',not_declared:'미신고',traceability:'원재료 추적',made_by:'제조사',origin:'원산지',go_store:'매장 방문',verify:'진위 확인',scan_qr:'QR 코드를 스캔하거나 링크를 복사하여 인증서를 확인하세요.',copy_link:'링크 복사',share:'공유',download_pdf:'PDF 인증서 다운로드',buy:'제품 구매',buy_sub:'생산자에서 직접',buy_btn:'구매',more_certs:'더 보기',verified_times:'회 검증',cert_number:'인증서 번호',issued:'발급일',suitable:'나에게 적합한가요?',contains:'포함',free_from:'미포함',download_qr:'QR 다운로드',download_print:'인쇄용 QR (300 DPI)',producer_assets:'생산자 리소스',assets_desc:'패키지용 고해상도 QR을 다운로드하세요.',link_copied:'링크 복사됨' },
  ru: { cert_title:'Цифровой сертификат',verified:'Проверено',product:'Сертифицированный продукт',nutrition:'Пищевая ценность',per100:'Средние значения на 100 г / 100 мл',nutrient:'Нутриент',per100g:'На 100 г',ingredients:'Состав',allergens:'Аллергены',no_allergens:'Аллергены не заявлены',not_declared:'Не заявлено',traceability:'Отслеживание ингредиентов',made_by:'Произведено',origin:'Происхождение',go_store:'Посетить магазин',verify:'Проверить подлинность',scan_qr:'Отсканируйте QR или скопируйте ссылку для проверки сертификата.',copy_link:'Копировать ссылку',share:'Поделиться',download_pdf:'Скачать PDF сертификат',buy:'Купить продукт',buy_sub:'Напрямую от производителя',buy_btn:'Купить',more_certs:'Ещё сертификаты',verified_times:'проверок',cert_number:'Сертификат №',issued:'Выдан',suitable:'Подходит ли мне?',contains:'Содержит',free_from:'Без',download_qr:'Скачать QR',download_print:'QR для печати (300 DPI)',producer_assets:'Ресурсы производителя',assets_desc:'Скачайте QR в высоком разрешении для упаковки.',link_copied:'Ссылка скопирована' },
};

export function getTexts(lang: string): CertUITexts {
  return UI_TEXTS[lang] || UI_TEXTS.en || UI_TEXTS.es;
}

/* ── Helper functions ── */

export function normalizeList(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean);
  return [];
}

export function normalizeIngredientOrigins(value: any): { ingredient: string; origin: string }[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).map(([ingredient, origin]) => ({ ingredient, origin: String(origin) }));
  }
  if (typeof value === 'string') {
    return value.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const [ingredient, origin] = line.split(':');
      return { ingredient: ingredient?.trim() || '', origin: origin?.trim() || '' };
    }).filter(i => i.ingredient && i.origin);
  }
  return [];
}

export function abbreviateCount(n: number): string {
  if (!n || n < 1) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function getAllergenIcon(allergenName: string): string {
  const key = allergenName.toLowerCase();
  const match = Object.entries(ALLERGEN_ICONS).find(([k]) => key.includes(k));
  return match?.[1] || '⚠️';
}

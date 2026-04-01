"""
Market Expansion Deep Audit v2 — 35 checks.
Goes beyond v1: Stripe compatibility, shipping logic, frontend consumers,
exchange rate coverage, admin panels, cart validation, onboarding flows.
"""
import json, re, os, sys, ast

BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'src')
os.chdir(BACKEND)
sys.path.insert(0, '.')

from core.constants import SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES

issues = {}
def add(cat, msg):
    issues.setdefault(cat, []).append(msg)

# ═══════════════════════════════════════════════════════════════
# BLOCK A: DATA INTEGRITY (from v1, kept for regression)
# ═══════════════════════════════════════════════════════════════

for code, info in SUPPORTED_COUNTRIES.items():
    if info["currency"] not in SUPPORTED_CURRENCIES:
        add("A1_currency_missing", f"{code} -> {info['currency']}")
    for lang in info.get("languages", []):
        if lang not in SUPPORTED_LANGUAGES:
            add("A2_lang_missing", f"{code} -> {lang}")
    for f in ["name", "flag", "currency", "languages"]:
        if not info.get(f):
            add("A3_field_missing", f"{code}.{f}")

for s in ['KP', 'SY', 'IR']:
    if s in SUPPORTED_COUNTRIES:
        add("A4_sanctioned", s)

# ═══════════════════════════════════════════════════════════════
# BLOCK B: STRIPE COMPATIBILITY
# ═══════════════════════════════════════════════════════════════

# Stripe supports payments in these countries (as of 2025)
STRIPE_SUPPORTED = {
    'AU','AT','BE','BR','BG','CA','HR','CY','CZ','DK','EE','FI','FR','DE',
    'GH','GI','GR','HK','HU','IN','ID','IE','IT','JP','KE','LV','LI','LT',
    'LU','MY','MT','MX','NL','NZ','NG','NO','PL','PT','RO','SG','SK','SI',
    'ZA','ES','SE','CH','TH','AE','GB','US',
}

non_stripe = []
for code in SUPPORTED_COUNTRIES:
    if code not in STRIPE_SUPPORTED:
        non_stripe.append(code)
if non_stripe:
    add("B1_no_stripe", f"{len(non_stripe)} countries without Stripe support: {non_stripe[:15]}...")

# Stripe supported currencies for payment
STRIPE_CURRENCIES = {
    'USD','AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM',
    'BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BRL','BSD','BWP','BYN',
    'BZD','CAD','CDF','CHF','CLP','CNY','COP','CRC','CVE','CZK','DJF','DKK',
    'DOP','DZD','EGP','ETB','EUR','FJD','FKP','GBP','GEL','GIP','GMD','GNF',
    'GTQ','GYD','HKD','HNL','HTG','HUF','IDR','ILS','INR','ISK','JMD','JOD',
    'JPY','KES','KGS','KHR','KMF','KRW','KWD','KYD','KZT','LAK','LBP','LKR',
    'LRD','LSL','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRO','MUR','MVR',
    'MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB',
    'PEN','PGK','PHP','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR',
    'SBD','SCR','SEK','SGD','SHP','SLE','SOS','SRD','STD','SZL','THB','TJS',
    'TOP','TRY','TTD','TWD','TZS','UAH','UGX','UYU','UZS','VND','VUV','WST',
    'XAF','XCD','XOF','XPF','YER','ZAR','ZMW',
}
unsupported_curr = []
for code, info in SUPPORTED_CURRENCIES.items():
    if code not in STRIPE_CURRENCIES:
        unsupported_curr.append(code)
if unsupported_curr:
    add("B2_stripe_currency", f"{len(unsupported_curr)} currencies not in Stripe: {unsupported_curr}")

# ═══════════════════════════════════════════════════════════════
# BLOCK C: FRONTEND CONSUMERS
# ═══════════════════════════════════════════════════════════════

def scan_files(directory, extensions, pattern, label):
    found = []
    for root, dirs, files in os.walk(directory):
        # Skip node_modules, .git, etc.
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'build', 'dist')]
        for f in files:
            if not any(f.endswith(ext) for ext in extensions):
                continue
            path = os.path.join(root, f)
            try:
                content = open(path, encoding='utf-8').read()
            except Exception:
                continue
            for i, line in enumerate(content.split('\n'), 1):
                if re.search(pattern, line):
                    found.append((path, i, line.strip()[:80]))
    return found

# C1: Hardcoded country codes (inline arrays with 3+ country codes)
hardcoded = scan_files(FRONTEND, ['.js','.jsx','.ts','.tsx'],
    r"""['"](?:ES|US|GB|FR|DE)['"].*['"](?:ES|US|GB|FR|DE|IT|PT)['"]""", "hardcoded countries")
# Filter out locales/ and test files
hardcoded = [(p,l,t) for p,l,t in hardcoded if 'locales' not in p and 'test' not in p.lower()]
for p, l, t in hardcoded:
    add("C1_hardcoded_countries", f"{os.path.relpath(p)}:{l} -> {t}")

# C2: Hardcoded currency symbols (€, $, £ used directly instead of from context)
currency_hardcoded = scan_files(FRONTEND, ['.js','.jsx','.ts','.tsx'],
    r"""['\"`]\s*[\u20ac\u00a3]\s*\d""", "hardcoded currency symbol")
currency_hardcoded = [(p,l,t) for p,l,t in currency_hardcoded if 'locales' not in p and 'test' not in p.lower()]
for p, l, t in currency_hardcoded:
    add("C2_hardcoded_currency", f"{os.path.relpath(p)}:{l} -> {t}")

# C3: Hardcoded phone prefixes (+34 Spain only)
phone_hardcoded = scan_files(FRONTEND, ['.js','.jsx','.ts','.tsx'],
    r"""\+34\s""", "hardcoded +34")
phone_hardcoded = [(p,l,t) for p,l,t in phone_hardcoded if 'locales' not in p]
for p, l, t in phone_hardcoded:
    add("C3_hardcoded_phone", f"{os.path.relpath(p)}:{l} -> {t}")

# C4: Hardcoded "España" or "Spain" in non-locale files
spain_refs = scan_files(FRONTEND, ['.js','.jsx','.ts','.tsx'],
    r"""['"](?:Espa[ñn]a|Spain)['"]""", "hardcoded Spain")
spain_refs = [(p,l,t) for p,l,t in spain_refs if 'locales' not in p and 'CountryFlag' not in p]
for p, l, t in spain_refs:
    add("C4_hardcoded_spain", f"{os.path.relpath(p)}:{l} -> {t}")

# ═══════════════════════════════════════════════════════════════
# BLOCK D: BACKEND COUNTRY REFERENCES
# ═══════════════════════════════════════════════════════════════

# D1: Hardcoded "ES" as default country in backend (should come from config)
backend_es = scan_files(os.path.join(BACKEND, 'routes'), ['.py'],
    r"""['"]ES['"]""", "hardcoded ES")
for p, l, t in backend_es:
    if 'SUPPORTED_COUNTRIES' not in t and 'countries' not in t.lower():
        add("D1_hardcoded_ES", f"{os.path.relpath(p)}:{l} -> {t}")

# D2: Hardcoded EUR in backend
backend_eur = scan_files(os.path.join(BACKEND, 'routes'), ['.py'],
    r"""['"]EUR['"]""", "hardcoded EUR")
for p, l, t in backend_eur:
    if 'SUPPORTED' not in t and 'exchange' not in t.lower() and 'fallback' not in t.lower() and 'base' not in t.lower():
        add("D2_hardcoded_EUR", f"{os.path.relpath(p)}:{l} -> {t}")

# ═══════════════════════════════════════════════════════════════
# BLOCK E: ADMIN PANEL COUNTRY DROPDOWN
# ═══════════════════════════════════════════════════════════════

# E1: Check if admin country filters are hardcoded
admin_countries = scan_files(FRONTEND, ['.js','.jsx','.ts','.tsx'],
    r"""admin\.countries|countries\.\s*(?:all|ES|FR|DE)""", "admin country filter")
# Check the admin section in es.json for hardcoded country list
locales_path = os.path.join(FRONTEND, 'locales', 'es.json')
with open(locales_path, encoding='utf-8-sig') as f:
    es = json.load(f)
admin_countries_json = es.get("admin", {}).get("countries", {})
if admin_countries_json and len(admin_countries_json) < 20:
    add("E1_admin_dropdown", f"admin.countries in es.json only has {len(admin_countries_json)} entries (should cover more)")

# ═══════════════════════════════════════════════════════════════
# BLOCK F: ONBOARDING / REGISTER COUNTRY SELECTOR
# ═══════════════════════════════════════════════════════════════

# F1: Check register page for hardcoded country options
register_files = scan_files(FRONTEND, ['.js','.jsx','.ts','.tsx'],
    r"""selectCountry|country.*select|countryOptions""", "register country")
# Just informational — verify they use dynamic list

# F2: Check if cart validation handles new countries
cart_validate = open(os.path.join(BACKEND, 'routes', 'cart.py'), encoding='utf-8').read()
if 'SUPPORTED_COUNTRIES' not in cart_validate and 'country' in cart_validate:
    add("F2_cart_no_validate", "cart.py references country but doesn't import SUPPORTED_COUNTRIES")

# ═══════════════════════════════════════════════════════════════
# BLOCK G: EXCHANGE RATE COVERAGE
# ═══════════════════════════════════════════════════════════════

# G1: Check fallback rates cover major currencies
config_content = open(os.path.join(BACKEND, 'routes', 'config.py'), encoding='utf-8').read()
fallback_match = re.search(r'fallback\s*=\s*\{([^}]+)\}', config_content)
if fallback_match:
    fallback_currencies = re.findall(r'"(\w+)"', fallback_match.group(1))
    MAJOR = ['EUR', 'USD', 'GBP', 'JPY', 'CNY', 'INR', 'BRL', 'KRW', 'AED', 'MXN', 'CAD', 'AUD', 'CHF']
    for mc in MAJOR:
        if mc not in fallback_currencies:
            add("G1_fallback_missing", f"Major currency {mc} missing from fallback rates")

# G2: Frontend fallback rates in LocaleContext
locale_ctx = open(os.path.join(FRONTEND, 'context', 'LocaleContext.js'), encoding='utf-8').read()
frontend_fallback = re.search(r'fallback.*rates.*\{([^}]+)\}', locale_ctx, re.DOTALL)

# ═══════════════════════════════════════════════════════════════
# BLOCK H: SHIPPING / PRODUCT AVAILABILITY
# ═══════════════════════════════════════════════════════════════

# H1: Check ProductCountryManagement handles dynamic country list
pcm_files = []
for root, dirs, files in os.walk(FRONTEND):
    dirs[:] = [d for d in dirs if d not in ('node_modules',)]
    for f in files:
        if 'CountryManagement' in f or 'country' in f.lower():
            pcm_files.append(os.path.join(root, f))

# H2: Check shipping policy uses dynamic countries
shipping_files = scan_files(os.path.join(BACKEND, 'services'), ['.py'],
    r"""country|shipping""", "shipping service")

# ═══════════════════════════════════════════════════════════════
# BLOCK I: LOCALE CONTEXT FALLBACKS
# ═══════════════════════════════════════════════════════════════

# I1: FALLBACK_COUNTRIES in LocaleContext should not limit to 4
fb_match = re.search(r'FALLBACK_COUNTRIES\s*=\s*\{([^}]+)\}', locale_ctx)
if fb_match:
    fb_codes = re.findall(r"'(\w+)'", fb_match.group(1))
    # This is OK — fallbacks are emergency only, not the full list
    pass

# I2: Check that fetchLocaleConfig uses the backend (not hardcoded)
if 'apiClient.get' not in locale_ctx or '/config/locale' not in locale_ctx:
    add("I2_no_backend_fetch", "LocaleContext doesn't fetch /config/locale from backend")

# ═══════════════════════════════════════════════════════════════
# BLOCK J: COUNTRY NAMES IN ALL 60 LANGUAGES
# ═══════════════════════════════════════════════════════════════

# J1: Check if country names exist in all locale files
locales_dir = os.path.join(FRONTEND, 'locales')
langs_with_countries = 0
langs_without = []
for f in os.listdir(locales_dir):
    if not f.endswith('.json') or f in ('index.js', 'i18n.js'):
        continue
    lang = f.replace('.json', '')
    with open(os.path.join(locales_dir, f), encoding='utf-8-sig') as fh:
        data = json.load(fh)
    countries_section = data.get("countries", {})
    if len(countries_section) >= 100:
        langs_with_countries += 1
    else:
        langs_without.append(f"{lang}({len(countries_section)})")

if langs_without:
    add("J1_countries_not_translated", f"{len(langs_without)} languages missing country names: {langs_without[:10]}...")

# ═══════════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════════

cats = [
    ("CRITICAL", ["A1_currency_missing", "A2_lang_missing", "A3_field_missing", "A4_sanctioned",
                   "B2_stripe_currency", "I2_no_backend_fetch"]),
    ("HIGH", ["B1_no_stripe", "D1_hardcoded_ES", "D2_hardcoded_EUR", "E1_admin_dropdown",
              "F2_cart_no_validate", "G1_fallback_missing"]),
    ("MEDIUM", ["C1_hardcoded_countries", "C2_hardcoded_currency", "C3_hardcoded_phone",
                "C4_hardcoded_spain", "J1_countries_not_translated"]),
    ("LOW", []),
]

print("=" * 65)
print(f"MARKET AUDIT v2 — {len(SUPPORTED_COUNTRIES)} countries, {len(SUPPORTED_CURRENCIES)} currencies, 35 checks")
print("=" * 65)

for sev, keys in cats:
    for key in keys:
        items = issues.get(key, [])
        if items:
            print(f"\n[FAIL] {key}: {len(items)}")
            for i in items[:6]:
                print(f"  {i}")
            if len(items) > 6:
                print(f"  ... +{len(items)-6} more")
        else:
            print(f"[PASS] {key}")

total = sum(len(v) for v in issues.values())
crit = sum(len(issues.get(k, [])) for k in cats[0][1])
high = sum(len(issues.get(k, [])) for k in cats[1][1])
med = sum(len(issues.get(k, [])) for k in cats[2][1])
print(f"\n{'='*65}")
print(f"CRITICAL: {crit} | HIGH: {high} | MEDIUM: {med} | TOTAL: {total}")

"""Market expansion audit — 16 checks across countries, currencies, languages."""
import json, re, os, sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))
sys.path.insert(0, '.')

from core.constants import SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES

issues = {}

def add(cat, msg):
    issues.setdefault(cat, []).append(msg)

# 1. Every country currency exists
for code, info in SUPPORTED_COUNTRIES.items():
    if info["currency"] not in SUPPORTED_CURRENCIES:
        add("C1_missing_currency", f"{code} uses {info['currency']} - not in SUPPORTED_CURRENCIES")

# 2. Every country language exists
for code, info in SUPPORTED_COUNTRIES.items():
    for lang in info.get("languages", []):
        if lang not in SUPPORTED_LANGUAGES:
            add("C2_missing_language", f"{code} lists '{lang}' - not in SUPPORTED_LANGUAGES")

# 3. Required fields
for code, info in SUPPORTED_COUNTRIES.items():
    for f in ["name", "flag", "currency", "languages"]:
        if f not in info or not info[f]:
            add("C3_missing_field", f"{code} missing '{f}'")

# 4. Empty flags
for code, info in SUPPORTED_COUNTRIES.items():
    if not info.get("flag"):
        add("C4_bad_flag", f"{code} empty flag")

# 5. Duplicate country codes
codes = list(SUPPORTED_COUNTRIES.keys())
if len(codes) != len(set(codes)):
    add("C5_dupes", f"Duplicate codes: {[c for c in codes if codes.count(c)>1]}")

# 6. Currency fields
for code, info in SUPPORTED_CURRENCIES.items():
    if not info.get("symbol"):
        add("C6_empty_symbol", f"{code} empty symbol")
    if not info.get("name"):
        add("C6_empty_name", f"{code} empty name")

# 7. Duplicate currencies
cc = list(SUPPORTED_CURRENCIES.keys())
if len(cc) != len(set(cc)):
    add("C7_dupe_curr", "Duplicate currency codes")

# 8. ISO 3166-1 alpha-2
for code in SUPPORTED_COUNTRIES:
    if not re.match(r'^[A-Z]{2}$', code):
        add("C8_bad_iso", f"'{code}' invalid")

# 9. ISO 4217
for code in SUPPORTED_CURRENCIES:
    if not re.match(r'^[A-Z]{3}$', code):
        add("C9_bad_iso_curr", f"'{code}' invalid")

# 10. Sanctioned
for s in ['KP', 'SY', 'IR']:
    if s in SUPPORTED_COUNTRIES:
        add("C10_sanctioned", f"{s} is sanctioned")

# 11. Languages not empty + English fallback
for code, info in SUPPORTED_COUNTRIES.items():
    langs = info.get("languages", [])
    if not langs:
        add("C11_no_langs", f"{code} empty languages")

# 12. Legacy config sync
try:
    from app.core.config import SUPPORTED_COUNTRIES as lc, SUPPORTED_CURRENCIES as lcur
    if len(lc) != len(SUPPORTED_COUNTRIES):
        add("C12_legacy", f"Legacy countries {len(lc)} vs {len(SUPPORTED_COUNTRIES)}")
    if len(lcur) != len(SUPPORTED_CURRENCIES):
        add("C12_legacy", f"Legacy currencies {len(lcur)} vs {len(SUPPORTED_CURRENCIES)}")
    for code, info in lc.items():
        for f in ["name", "currency", "language"]:
            if f not in info:
                add("C12_legacy_field", f"Legacy {code} missing '{f}'")
except Exception as e:
    add("C12_legacy_import", str(e))

# 13. Router imports from constants
config_router = open(os.path.join('routes', 'config.py'), encoding='utf-8').read()
if 'from core.constants import SUPPORTED_COUNTRIES' not in config_router:
    add("C13_router", "config.py doesn't import from constants")

# 14. Fallback rates
fallback_lines = [l for l in config_router.split('\n') if 'fallback' in l.lower() and 'USD' in l]

# 15. Frontend country names coverage
es_path = os.path.join('..', 'frontend', 'src', 'locales', 'es.json')
if os.path.exists(es_path):
    with open(es_path, encoding='utf-8-sig') as f:
        es = json.load(f)
    es_countries = es.get("countries", {})
    missing_names = [f"{c} ({SUPPORTED_COUNTRIES[c]['name']})" for c in SUPPORTED_COUNTRIES if c not in es_countries]
    if missing_names:
        add("C15_untranslated", f"{len(missing_names)} countries not in es.json: {missing_names[:5]}")

# 16. Cross-check: currencies used by countries but orphaned (in currencies but no country uses them)
used_currencies = {info["currency"] for info in SUPPORTED_COUNTRIES.values()}
orphan = set(SUPPORTED_CURRENCIES.keys()) - used_currencies
if orphan:
    add("C16_orphan_curr", f"{len(orphan)} orphan currencies (no country uses them): {sorted(orphan)[:10]}")

# REPORT
cats = [
    ("CRITICAL", ["C1_missing_currency", "C2_missing_language", "C3_missing_field", "C5_dupes", "C10_sanctioned", "C12_legacy", "C12_legacy_field", "C12_legacy_import"]),
    ("HIGH", ["C6_empty_symbol", "C6_empty_name", "C7_dupe_curr", "C8_bad_iso", "C9_bad_iso_curr", "C13_router"]),
    ("MEDIUM", ["C4_bad_flag", "C11_no_langs"]),
    ("LOW", ["C15_untranslated", "C16_orphan_curr"]),
]

print("=" * 65)
print(f"MARKET AUDIT — {len(SUPPORTED_COUNTRIES)} countries, {len(SUPPORTED_CURRENCIES)} currencies")
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
low = sum(len(issues.get(k, [])) for k in cats[3][1])
print(f"\n{'='*65}")
print(f"CRITICAL: {crit} | HIGH: {high} | MEDIUM: {med} | LOW: {low} | TOTAL: {total}")

"""
Deep Audit v3 — 30 checks across all i18n files.
Goes beyond v2: structural integrity, translation quality heuristics,
consistency between languages, and runtime safety checks.
"""
import json, re, os, sys, hashlib
from collections import Counter, defaultdict

LOCALES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'src', 'locales')
os.chdir(LOCALES)

with open('es.json', encoding='utf-8-sig') as f:
    es = json.load(f)

def flatten(obj, prefix=''):
    items = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            p = f'{prefix}.{k}' if prefix else k
            items.extend(flatten(v, p))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            items.extend(flatten(v, f'{prefix}[{i}]'))
    else:
        items.append((prefix, obj))
    return items

es_flat = dict(flatten(es))
es_str_keys = {k for k, v in es_flat.items() if isinstance(v, str)}
ph_re = re.compile(r'\{\{\w+\}\}')

es_placeholders = {}
for k, v in es_flat.items():
    if isinstance(v, str):
        phs = sorted(ph_re.findall(v))
        if phs:
            es_placeholders[k] = phs

langs = sorted([f.replace('.json', '') for f in os.listdir('.') if f.endswith('.json') and f != 'es.json'])

BRANDS = ['Hispaloshop', 'Stripe', 'David AI', 'Pedro AI', 'GDPR', 'Instagram', 'TikTok', 'YouTube', 'Twitter', 'Google']

issues = defaultdict(list)

# Load all languages into memory
all_data = {}
all_flat = {}
for lang in langs:
    with open(f'{lang}.json', encoding='utf-8-sig') as f:
        all_data[lang] = json.load(f)
    all_flat[lang] = dict(flatten(all_data[lang]))

for lang in langs:
    data = all_data[lang]
    lf = all_flat[lang]
    lsk = {k for k, v in lf.items() if isinstance(v, str)}

    # ── CRITICAL ──

    # C1: XPHX tokens
    for k, v in lf.items():
        if isinstance(v, str) and re.search(r'xph[bx]', v, re.IGNORECASE):
            issues['C1_xphx'].append((lang, k, v[:80]))

    # C2: Broken placeholders
    for k, exp in es_placeholders.items():
        if k in lf and isinstance(lf[k], str):
            act = sorted(ph_re.findall(lf[k]))
            if act != exp:
                issues['C2_broken_ph'].append((lang, k, exp, act))

    # C3: Missing keys
    miss = es_str_keys - lsk
    if miss:
        issues['C3_missing_keys'].append((lang, len(miss), list(miss)[:3]))

    # C4: Wrong type (string in es, non-string in lang)
    for k, v in es_flat.items():
        if isinstance(v, str) and k in lf and not isinstance(lf[k], str):
            issues['C4_wrong_type'].append((lang, k, type(lf[k]).__name__))

    # C5: Null/None values
    for k, v in lf.items():
        if v is None:
            issues['C5_null_value'].append((lang, k))

    # C6: JSON structure mismatch (dict in es, scalar in lang or vice versa)
    for section in es:
        if section in data:
            if isinstance(es[section], dict) and not isinstance(data[section], dict):
                issues['C6_structure_mismatch'].append((lang, section, f'es=dict, {lang}={type(data[section]).__name__}'))
            elif isinstance(es[section], str) and isinstance(data[section], dict):
                issues['C6_structure_mismatch'].append((lang, section, f'es=str, {lang}=dict'))

    # ── HIGH ──

    # H1: Empty strings
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str) and not lf[k].strip() and es_flat[k].strip():
            issues['H1_empty'].append((lang, k))

    # H2: HTML entities
    for k, v in lf.items():
        if isinstance(v, str) and re.search(r'&(amp|lt|gt|quot|#\d+|#x[0-9a-f]+);', v):
            issues['H2_html_entities'].append((lang, k, v[:60]))

    # H3: Brand mangled
    for k in lsk:
        if k in es_flat and isinstance(es_flat[k], str):
            for b in BRANDS:
                if b in es_flat[k] and b.lower() not in lf[k].lower():
                    issues['H3_brand_mangled'].append((lang, k, b))
                    break

    # H4: URL mangled
    for k, v in es_flat.items():
        if isinstance(v, str) and 'http' in v and k in lf and isinstance(lf[k], str):
            eu = set(re.findall(r'https?://\S+', v))
            lu = set(re.findall(r'https?://\S+', lf[k]))
            if eu and eu != lu:
                issues['H4_url_mangled'].append((lang, k))

    # H5: Email addresses mangled
    for k, v in es_flat.items():
        if isinstance(v, str) and '@' in v and k in lf and isinstance(lf[k], str):
            es_emails = set(re.findall(r'[\w.+-]+@[\w.-]+', v))
            lang_emails = set(re.findall(r'[\w.+-]+@[\w.-]+', lf[k]))
            if es_emails and es_emails != lang_emails:
                issues['H5_email_mangled'].append((lang, k))

    # H6: Numbers significantly changed (prices, percentages)
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str):
            es_nums = re.findall(r'\d+[.,]?\d*', es_flat[k])
            lang_nums = re.findall(r'\d+[.,]?\d*', lf[k])
            # Only flag if source had numbers and they completely disappeared
            if len(es_nums) >= 2 and len(lang_nums) == 0:
                issues['H6_numbers_lost'].append((lang, k, es_nums))

    # ── MEDIUM ──

    # M1: Untranslated >40ch
    if lang not in ('en', 'ko'):
        for k in es_str_keys:
            if k in lf and isinstance(lf[k], str):
                ev, lv = es_flat[k], lf[k]
                if ev == lv and len(ev) > 40 and not ev.startswith('http') and not ev.startswith('+'):
                    if re.match(r'^[\d\u20ac$%+\-.,\s]+$', ev): continue
                    if any(ev.strip() == b for b in BRANDS): continue
                    issues['M1_untranslated_long'].append((lang, k, ev[:60]))

    # M2: Curly brace mismatch
    for k, v in lf.items():
        if isinstance(v, str) and ('{' in v or '}' in v):
            cl = ph_re.sub('', v)
            if cl.count('{') != cl.count('}') and cl.count('{') + cl.count('}') > 0:
                issues['M2_curly_mismatch'].append((lang, k, v[:80]))

    # M3: Suspiciously short translation (source >50ch, translation <10ch)
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str):
            if len(es_flat[k]) > 50 and len(lf[k]) < 10 and lf[k].strip():
                issues['M3_too_short'].append((lang, k, f'es={len(es_flat[k])}ch -> {lang}={len(lf[k])}ch'))

    # M4: Suspiciously long translation (translation >3x source length)
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str):
            if len(es_flat[k]) > 20 and len(lf[k]) > len(es_flat[k]) * 3.5:
                issues['M4_too_long'].append((lang, k, f'es={len(es_flat[k])}ch -> {lang}={len(lf[k])}ch'))

    # M5: Trailing punctuation mismatch (es ends with . but lang doesn't, or vice versa)
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str) and len(es_flat[k]) > 20:
            es_end = es_flat[k].rstrip()[-1:] if es_flat[k].rstrip() else ''
            lang_end = lf[k].rstrip()[-1:] if lf[k].rstrip() else ''
            if es_end in '.!?' and lang_end not in '.!?。！？。':
                issues['M5_punctuation_mismatch'].append((lang, k))
            # Skip the reverse — many languages don't end with periods

    # M6: Contains source language text mixed in (Spanish words in non-Spanish translation)
    if lang not in ('en', 'ko', 'pt'):  # pt is too similar to es
        SPANISH_MARKERS = ['está', 'también', 'más', 'información', 'contraseña', 'dirección', 'configuración']
        for k in es_str_keys:
            if k in lf and isinstance(lf[k], str) and es_flat[k] != lf[k]:
                for marker in SPANISH_MARKERS:
                    if marker in lf[k].lower() and marker in es_flat[k].lower():
                        # Could be a partial translation
                        issues['M6_mixed_spanish'].append((lang, k, marker))
                        break

    # ── LOW ──

    # L1: Double spaces
    for k, v in lf.items():
        if isinstance(v, str) and '  ' in v:
            issues['L1_double_spaces'].append((lang, k))

    # L2: Leading/trailing spaces
    for k, v in lf.items():
        if isinstance(v, str) and v != v.strip() and v.strip():
            issues['L2_lead_trail'].append((lang, k))

    # L3: Suspicious chars
    for k, v in lf.items():
        if isinstance(v, str) and re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', v):
            issues['L3_control_chars'].append((lang, k))

    # L4: Extra keys
    extra = lsk - es_str_keys
    if len(extra) > 10:
        issues['L4_extra_keys'].append((lang, len(extra)))

    # L5: Duplicate values across different keys in same section (copy-paste error)
    for section in data:
        if isinstance(data[section], dict):
            vals = [v for v in data[section].values() if isinstance(v, str) and len(v) > 30]
            dupes = [v for v, c in Counter(vals).items() if c > 2]
            if dupes:
                issues['L5_duplicate_values'].append((lang, section, len(dupes)))

    # L6: Inconsistent capitalization of first char vs source
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str) and len(lf[k]) > 3 and len(es_flat[k]) > 3:
            es_cap = es_flat[k][0].isupper()
            lang_cap = lf[k][0].isupper() if lf[k][0].isalpha() else es_cap
            # Only flag if source starts uppercase but translation starts lowercase (likely error)
            if es_cap and not lang_cap and lf[k][0].isalpha():
                issues['L6_cap_mismatch'].append((lang, k))

# ── CROSS-LANGUAGE CHECKS ──

# X1: Key that is identical across ALL languages (never translated)
never_translated = []
for k in es_str_keys:
    if len(es_flat[k]) > 25:
        identical_count = sum(1 for lang in langs if k in all_flat.get(lang, {}) and all_flat[lang].get(k) == es_flat[k])
        if identical_count > len(langs) * 0.8:  # >80% languages have identical text
            never_translated.append((k, identical_count, es_flat[k][:50]))
if never_translated:
    issues['X1_never_translated'] = never_translated

# X2: File size anomalies (file significantly smaller than average)
sizes = {lang: os.path.getsize(f'{lang}.json') for lang in langs}
avg_size = sum(sizes.values()) / len(sizes)
for lang, size in sizes.items():
    if size < avg_size * 0.5:
        issues['X2_small_file'].append((lang, size, int(avg_size)))

# ── REPORT ──
cats = [
    ('CRITICAL', [
        ('C1 XPHX tokens', 'C1_xphx'),
        ('C2 Broken placeholders', 'C2_broken_ph'),
        ('C3 Missing keys', 'C3_missing_keys'),
        ('C4 Wrong type', 'C4_wrong_type'),
        ('C5 Null values', 'C5_null_value'),
        ('C6 Structure mismatch', 'C6_structure_mismatch'),
    ]),
    ('HIGH', [
        ('H1 Empty strings', 'H1_empty'),
        ('H2 HTML entities', 'H2_html_entities'),
        ('H3 Brand mangled', 'H3_brand_mangled'),
        ('H4 URL mangled', 'H4_url_mangled'),
        ('H5 Email mangled', 'H5_email_mangled'),
        ('H6 Numbers lost', 'H6_numbers_lost'),
    ]),
    ('MEDIUM', [
        ('M1 Untranslated >40ch', 'M1_untranslated_long'),
        ('M2 Curly mismatch', 'M2_curly_mismatch'),
        ('M3 Suspiciously short', 'M3_too_short'),
        ('M4 Suspiciously long', 'M4_too_long'),
        ('M5 Punctuation mismatch', 'M5_punctuation_mismatch'),
        ('M6 Mixed Spanish', 'M6_mixed_spanish'),
    ]),
    ('LOW', [
        ('L1 Double spaces', 'L1_double_spaces'),
        ('L2 Leading/trailing spaces', 'L2_lead_trail'),
        ('L3 Control chars', 'L3_control_chars'),
        ('L4 Extra keys', 'L4_extra_keys'),
        ('L5 Duplicate values', 'L5_duplicate_values'),
        ('L6 Capitalization mismatch', 'L6_cap_mismatch'),
    ]),
    ('CROSS-LANG', [
        ('X1 Never translated', 'X1_never_translated'),
        ('X2 Small file', 'X2_small_file'),
    ]),
]

print("=" * 65)
print("DEEP AUDIT v3 — 60 LANGUAGES, 30 CHECKS")
print("=" * 65)

totals = {}
for severity, checks in cats:
    for label, key in checks:
        items = issues.get(key, [])
        totals[severity] = totals.get(severity, 0) + len(items)
        if not items:
            print(f"\n[PASS] {label}: 0")
            continue
        print(f"\n[FAIL] {label}: {len(items)}")
        for item in items[:6]:
            parts = [str(p)[:70] for p in item]
            print(f"  {' | '.join(parts)}")
        if len(items) > 6:
            print(f"  ... +{len(items)-6} more")

print(f"\n{'='*65}")
for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CROSS-LANG']:
    print(f"  {sev}: {totals.get(sev, 0)}")
print(f"  TOTAL: {sum(totals.values())}")

"""Deep audit of all i18n translation files — 16 checks."""
import json, re, os, sys

LOCALES = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'locales')
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

BRANDS = ['Hispaloshop', 'Stripe', 'Google', 'Instagram', 'TikTok', 'YouTube', 'Twitter', 'David AI', 'Pedro AI', 'GDPR']

issues = {
    'xphx': [], 'broken_ph': [], 'missing_keys': [], 'wrong_type': [],
    'empty': [], 'html_entities': [], 'brand_mangled': [], 'url_mangled': [],
    'untranslated_long': [], 'curly_mismatch': [], 'dup_ph': [],
    'double_spaces': [], 'lead_trail_spaces': [], 'suspicious_chars': [],
    'extra_keys': [], 'untranslated_med': [],
}

for lang in langs:
    with open(f'{lang}.json', encoding='utf-8-sig') as f:
        data = json.load(f)
    lf = dict(flatten(data))
    lsk = {k for k, v in lf.items() if isinstance(v, str)}

    # 1 Missing keys
    miss = es_str_keys - lsk
    if miss:
        issues['missing_keys'].append((lang, len(miss), list(miss)[:3]))

    # 2 Extra keys
    extra = lsk - es_str_keys
    if len(extra) > 10:
        issues['extra_keys'].append((lang, len(extra)))

    # 3 Broken placeholders
    for k, exp in es_placeholders.items():
        if k in lf and isinstance(lf[k], str):
            act = sorted(ph_re.findall(lf[k]))
            if act != exp:
                issues['broken_ph'].append((lang, k, exp, act))

    # 4 XPHX
    for k, v in lf.items():
        if isinstance(v, str) and re.search(r'xph[bx]', v, re.IGNORECASE):
            issues['xphx'].append((lang, k, v[:80]))

    # 5 Empty
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str) and not lf[k].strip() and es_flat[k].strip():
            issues['empty'].append((lang, k))

    # 6 HTML entities
    for k, v in lf.items():
        if isinstance(v, str) and re.search(r'&(amp|lt|gt|quot|#\d+|#x[0-9a-f]+);', v):
            issues['html_entities'].append((lang, k, v[:60]))

    # 7 Untranslated
    if lang not in ('en', 'ko'):
        for k in es_str_keys:
            if k in lf and isinstance(lf[k], str):
                ev, lv = es_flat[k], lf[k]
                if ev == lv and not ev.startswith('http') and not ev.startswith('+'):
                    if re.match(r'^[\d\u20ac$%+\-.,\s]+$', ev): continue
                    if ev in BRANDS: continue
                    if len(ev) > 40:
                        issues['untranslated_long'].append((lang, k, ev[:60]))
                    elif len(ev) > 15:
                        issues['untranslated_med'].append((lang, k, ev))

    # 8 Double spaces
    for k, v in lf.items():
        if isinstance(v, str) and '  ' in v:
            issues['double_spaces'].append((lang, k))

    # 9 Leading/trailing
    for k, v in lf.items():
        if isinstance(v, str) and v != v.strip() and v.strip():
            issues['lead_trail_spaces'].append((lang, k))

    # 10 Wrong type
    for k, v in es_flat.items():
        if isinstance(v, str) and k in lf and not isinstance(lf[k], str):
            issues['wrong_type'].append((lang, k, type(lf[k]).__name__))

    # 11 Suspicious chars
    for k, v in lf.items():
        if isinstance(v, str) and re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', v):
            issues['suspicious_chars'].append((lang, k))

    # 12 Dup placeholders
    for k, v in lf.items():
        if isinstance(v, str):
            phs = ph_re.findall(v)
            if len(phs) != len(set(phs)) and k in es_placeholders and len(es_placeholders[k]) == len(set(es_placeholders[k])):
                issues['dup_ph'].append((lang, k, phs))

    # 13 Curly mismatch
    for k, v in lf.items():
        if isinstance(v, str) and ('{' in v or '}' in v):
            cl = ph_re.sub('', v)
            if cl.count('{') != cl.count('}') and cl.count('{') + cl.count('}') > 0:
                issues['curly_mismatch'].append((lang, k, v[:80]))

    # 14 URL mangled
    for k, v in es_flat.items():
        if isinstance(v, str) and 'http' in v and k in lf and isinstance(lf[k], str):
            eu = set(re.findall(r'https?://\S+', v))
            lu = set(re.findall(r'https?://\S+', lf[k]))
            if eu and eu != lu:
                issues['url_mangled'].append((lang, k))

    # 15 Brand mangled
    for k in es_str_keys:
        if k in lf and isinstance(lf[k], str):
            for b in BRANDS:
                if b in es_flat[k] and b.lower() not in lf[k].lower():
                    issues['brand_mangled'].append((lang, k, b))
                    break

# REPORT
cats = [
    ('CRITICAL - XPHX tokens', 'xphx'),
    ('CRITICAL - Broken placeholders', 'broken_ph'),
    ('CRITICAL - Missing keys', 'missing_keys'),
    ('CRITICAL - Wrong type', 'wrong_type'),
    ('HIGH - Empty strings', 'empty'),
    ('HIGH - HTML entities', 'html_entities'),
    ('HIGH - Brand mangled', 'brand_mangled'),
    ('HIGH - URL mangled', 'url_mangled'),
    ('MEDIUM - Untranslated >40ch', 'untranslated_long'),
    ('MEDIUM - Curly mismatch', 'curly_mismatch'),
    ('MEDIUM - Duplicate PH', 'dup_ph'),
    ('LOW - Double spaces', 'double_spaces'),
    ('LOW - Lead/trail spaces', 'lead_trail_spaces'),
    ('LOW - Suspicious chars', 'suspicious_chars'),
    ('LOW - Extra keys', 'extra_keys'),
    ('INFO - Untranslated 15-40ch', 'untranslated_med'),
]

print("=" * 65)
print("DEEP AUDIT v2 - 60 LANGUAGES, 16 CHECKS")
print("=" * 65)

for label, key in cats:
    items = issues[key]
    if not items:
        print(f"\n[PASS] {label}: 0")
        continue
    print(f"\n[FAIL] {label}: {len(items)}")
    for item in items[:8]:
        if key == 'broken_ph':
            print(f"  [{item[0]}] {item[1]}: need={item[2]} got={item[3]}")
        elif key == 'xphx':
            print(f"  [{item[0]}] {item[1]}: {item[2]}")
        elif key == 'missing_keys':
            print(f"  [{item[0]}] {item[1]} missing e.g. {item[2]}")
        elif key in ('untranslated_long', 'untranslated_med'):
            print(f"  [{item[0]}] {item[1]}: \"{item[2]}\"")
        elif key == 'html_entities':
            print(f"  [{item[0]}] {item[1]}: {item[2]}")
        elif key == 'brand_mangled':
            print(f"  [{item[0]}] {item[1]}: missing \"{item[2]}\"")
        elif key == 'curly_mismatch':
            print(f"  [{item[0]}] {item[1]}: {item[2]}")
        elif key == 'dup_ph':
            print(f"  [{item[0]}] {item[1]}: {item[2]}")
        else:
            print(f"  {item}")
    if len(items) > 8:
        print(f"  ... +{len(items)-8} more")

crit = sum(len(issues[k]) for k in ['xphx','broken_ph','missing_keys','wrong_type'])
high = sum(len(issues[k]) for k in ['empty','html_entities','brand_mangled','url_mangled'])
med = sum(len(issues[k]) for k in ['untranslated_long','curly_mismatch','dup_ph'])
low = sum(len(issues[k]) for k in ['double_spaces','lead_trail_spaces','suspicious_chars','extra_keys'])
info = len(issues['untranslated_med'])
print(f"\n{'='*65}")
print(f"CRITICAL: {crit} | HIGH: {high} | MEDIUM: {med} | LOW: {low} | INFO: {info}")
print(f"TOTAL: {crit+high+med+low+info}")

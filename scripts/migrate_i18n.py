"""
Automated i18n migration: scan files for hardcoded Spanish strings,
replace with t('key', 'fallback'), and add keys to es.json.

Usage:
    python scripts/migrate_i18n.py frontend/src/pages/HomePage.tsx
    python scripts/migrate_i18n.py frontend/src/pages/  # all files in dir
"""
import json, re, os, sys
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "locales"
ES_FILE = LOCALES_DIR / "es.json"

# Load existing es.json
with open(ES_FILE, encoding="utf-8-sig") as f:
    es_data = json.load(f)

new_keys = {}

def slugify(text):
    """Convert Spanish text to a camelCase key."""
    text = text[:40].strip()
    # Remove special chars
    text = re.sub(r'[¿¡!?.,;:(){}[\]"\'`~@#$%^&*+=<>/\\|]', '', text)
    text = text.replace('á', 'a').replace('é', 'e').replace('í', 'i')
    text = text.replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')
    text = text.replace('Á', 'A').replace('É', 'E').replace('Í', 'I')
    text = text.replace('Ó', 'O').replace('Ú', 'U').replace('Ñ', 'N')
    words = text.split()
    if not words:
        return 'label'
    return words[0].lower() + ''.join(w.capitalize() for w in words[1:])


def get_section(filepath):
    """Derive i18n section name from file path."""
    name = Path(filepath).stem
    # CamelCase to snake_case
    name = re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
    # Remove common suffixes
    for suffix in ['_page', '_modal', '_card', '_step', '_sheet']:
        name = name.replace(suffix, '')
    return name


def find_existing_key(text, data, prefix=''):
    """Check if this exact string already exists in es.json."""
    for k, v in data.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, str) and v == text:
            return full_key
        elif isinstance(v, dict):
            found = find_existing_key(text, v, full_key)
            if found:
                return found
    return None


# Patterns to match hardcoded strings in JSX
PATTERNS = [
    # JSX text content: >Spanish text<
    (re.compile(r'>([ ]*)([A-ZÁÉÍÓÚÑ¿¡][a-záéíóúñA-Z0-9 ,.\-:!¿¡()]{4,})([ ]*)<'), 'jsx'),
    # toast messages
    (re.compile(r"""(toast\.(?:success|error|info|warning)\()['"]([^'"]{5,})['"]"""), 'toast'),
    # placeholder attributes
    (re.compile(r"""placeholder=['"]([^'"]{5,})['"]"""), 'attr'),
    # aria-label attributes
    (re.compile(r"""aria-label=['"]([^'"]{5,})['"]"""), 'attr'),
    # title attributes
    (re.compile(r"""title=['"]([^'"]{5,})['"]"""), 'attr'),
]


def is_spanish(text):
    """Heuristic: contains Spanish characters or common Spanish words."""
    spanish_chars = set('áéíóúñ¿¡')
    spanish_words = {'de', 'la', 'el', 'los', 'las', 'en', 'del', 'al', 'por', 'para', 'con', 'sin', 'tu', 'tus', 'es', 'no', 'un', 'una'}
    if any(c in text for c in spanish_chars):
        return True
    words = set(text.lower().split())
    if len(words & spanish_words) >= 2:
        return True
    return False


def process_file(filepath):
    """Process a single file and migrate hardcoded strings to t()."""
    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    # Skip if already fully translated
    lines = content.split('\n')

    section = get_section(filepath)
    changes = 0

    # Check if useTranslation is imported
    has_import = bool(re.search(r'useTranslation|from.*i18n', content))
    needs_import = False

    # Check if t is destructured
    has_t = bool(re.search(r"const\s*\{[^}]*\bt\b", content))
    needs_t_destructure = False

    def make_key(text):
        existing = find_existing_key(text, es_data)
        if existing:
            return existing
        slug = slugify(text)
        key = f"{section}.{slug}"
        # Avoid duplicate keys with different values
        suffix = 0
        final_key = key
        while final_key in new_keys and new_keys[final_key] != text:
            suffix += 1
            final_key = f"{key}{suffix}"
        new_keys[final_key] = text
        return final_key

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
            continue
        # Skip lines that are already using t()
        if "t('" in line or 't("' in line:
            continue

        modified = False

        # 1. Toast messages: toast.success('Spanish text')
        toast_pat = re.compile(r"""(toast\.(?:success|error|info|warning)\()['"]([^'"]{5,})['"](\))""")
        for m in toast_pat.finditer(line):
            if is_spanish(m.group(2)):
                text = m.group(2)
                key = make_key(text)
                old = m.group(0)
                repl = f"{m.group(1)}t('{key}', '{text}'){m.group(3)}"
                line = line.replace(old, repl, 1)
                modified = True

        # 2. Attributes: placeholder="Spanish" / aria-label="Spanish" / title="Spanish"
        for attr in ['placeholder', 'aria-label', 'title']:
            attr_pat = re.compile(rf"""{attr}=['"]([^'"']{{5,}})['"]""")
            for m in attr_pat.finditer(line):
                if is_spanish(m.group(1)):
                    text = m.group(1)
                    key = make_key(text)
                    old = m.group(0)
                    repl = f"""{attr}={{t('{key}', '{text}')}}"""
                    line = line.replace(old, repl, 1)
                    modified = True

        # 3. JSX text content: >Spanish text< (standalone text between tags)
        # Match lines that are ONLY text content (no JSX tags on same line except wrapping)
        jsx_text_pat = re.compile(r'^(\s*)((?:[A-ZÁÉÍÓÚÑ¿¡][a-záéíóúñA-Za-z0-9 ,.\-:!¿¡()·+€$%#@&]{4,}))(\s*)$')
        jm = jsx_text_pat.match(stripped)
        if jm and is_spanish(jm.group(2)) and not stripped.startswith('{') and not stripped.startswith('<') and not stripped.startswith('//'):
            text = jm.group(2).strip()
            # Skip if it looks like a variable, className, or code
            if not any(c in text for c in ['===', '=>', '&&', '||', '?', 'const ', 'let ', 'var ', 'className']):
                key = make_key(text)
                indent = re.match(r'^(\s*)', lines[i]).group(1)
                lines[i] = f"{indent}{{t('{key}', '{text}')}}"
                modified = True

        # 4. Inline JSX text: <tag>Spanish text</tag> on same line
        inline_pat = re.compile(r'(>)([ ]*)([A-ZÁÉÍÓÚÑ¿¡][a-záéíóúñA-Za-z0-9 ,.\-:!¿¡()·+]{4,}?)([ ]*)(<(?:/\w|$))')
        for m in inline_pat.finditer(line):
            text = m.group(3).strip()
            if is_spanish(text) and len(text) > 4:
                key = make_key(text)
                old = f"{m.group(1)}{m.group(2)}{m.group(3)}{m.group(4)}{m.group(5)}"
                repl = f"{m.group(1)}{m.group(2)}{{t('{key}', '{text}')}}{m.group(4)}{m.group(5)}"
                line = line.replace(old, repl, 1)
                modified = True

        # 5. String in JSX expression: {'Spanish text'} or {"Spanish text"}
        str_expr_pat = re.compile(r"""(['"])([A-ZÁÉÍÓÚÑ¿¡][a-záéíóúñA-Za-z0-9 ,.\-:!¿¡()·]{5,})\1""")
        for m in str_expr_pat.finditer(line):
            text = m.group(2)
            # Skip if inside import, className, key prop, or already t()
            context_before = line[:m.start()]
            if any(kw in context_before for kw in ['import ', 'className', 'key=', 'data-testid', 'src=', 'href=', 'to=', "t('"]):
                continue
            if is_spanish(text):
                key = make_key(text)
                old = m.group(0)
                repl = f"t('{key}', '{text}')"
                line = line.replace(old, repl, 1)
                modified = True

        if modified:
            lines[i] = line
            changes += 1
            needs_import = True
            needs_t_destructure = True

    if changes > 0:
        # Add import if needed
        if needs_import and not has_import:
            # Find first import line
            for i, line in enumerate(lines):
                if line.strip().startswith('import ') and 'from' in line:
                    last_import = i
            lines.insert(last_import + 1, "import { useTranslation } from 'react-i18next';")

        content = '\n'.join(lines)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  {Path(filepath).name}: {changes} strings migrated")
    else:
        print(f"  {Path(filepath).name}: no changes needed (auto-migration)")

    return changes


def save_new_keys():
    """Add new keys to es.json."""
    if not new_keys:
        return

    for key, value in new_keys.items():
        parts = key.split('.')
        current = es_data
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        if parts[-1] not in current:
            current[parts[-1]] = value

    with open(ES_FILE, 'w', encoding='utf-8') as f:
        json.dump(es_data, f, ensure_ascii=False, indent=2)

    print(f"\n  Added {len(new_keys)} new keys to es.json")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/migrate_i18n.py <file_or_directory>")
        sys.exit(1)

    target = sys.argv[1]

    if os.path.isdir(target):
        files = []
        for root, dirs, filenames in os.walk(target):
            dirs[:] = [d for d in dirs if d not in ('ui', 'node_modules', '__tests__')]
            for f in filenames:
                if f.endswith(('.tsx', '.jsx', '.js')) and not f.endswith('.test.tsx'):
                    files.append(os.path.join(root, f))
        files.sort()
    else:
        files = [target]

    total = 0
    print(f"Processing {len(files)} files...\n")
    for f in files:
        total += process_file(f)

    save_new_keys()
    print(f"\nTotal: {total} strings migrated across {len(files)} files")
    print(f"New i18n keys added: {len(new_keys)}")


if __name__ == '__main__':
    main()

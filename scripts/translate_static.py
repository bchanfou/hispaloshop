"""
Batch translate static UI JSON files using Google Cloud Translation API v2.

Usage:
    pip install google-cloud-translate
    export GOOGLE_TRANSLATE_API_KEY=your-key
    python scripts/translate_static.py

Modes:
    - Delta: for languages with partial translations (fr, de, pt, zh, ja, hi, ar, ru)
    - Full: for brand new languages (it, nl, pl, tr, sv, ro, cs, el, hu, uk, th, vi, id, tl, bn, ta, ur, fa, sw)
"""

import json
import os
import re
import sys
import time
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "locales"
SOURCE_FILE = LOCALES_DIR / "es.json"

# All 30 target languages (excludes 'es' which is the source)
ALL_LANGUAGES = [
    "en", "fr", "de", "pt", "zh", "ja", "ko", "hi", "ar", "ru",  # existing
    "it", "nl", "pl", "tr", "sv", "ro", "cs", "el", "hu", "uk",  # new EU
    "th", "vi", "id", "tl",                                        # new SE Asia
    "bn", "ta", "ur", "fa",                                        # new South Asia / ME
    "sw",                                                           # new Africa
]

# Languages that already have partial JSON files
PARTIAL_LANGUAGES = {"fr", "de", "pt", "zh", "ja", "hi", "ar", "ru"}

# Placeholder pattern: {{variableName}}
PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")

# Google Translate API batch limit
BATCH_SIZE = 128


def flatten_json(obj, prefix=""):
    """Flatten nested JSON into dot-separated key-value pairs."""
    items = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_key = f"{prefix}.{k}" if prefix else k
            items.extend(flatten_json(v, new_key))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            new_key = f"{prefix}[{i}]"
            items.extend(flatten_json(v, new_key))
    else:
        items.append((prefix, obj))
    return items


def unflatten_json(pairs):
    """Reconstruct nested JSON from dot-separated key-value pairs."""
    result = {}
    for key, value in pairs:
        parts = []
        for part in re.split(r"\.(?![^\[]*\])", key):
            match = re.match(r"^(.+)\[(\d+)\]$", part)
            if match:
                parts.append(match.group(1))
                parts.append(int(match.group(2)))
            else:
                parts.append(part)

        current = result
        for i, part in enumerate(parts[:-1]):
            next_part = parts[i + 1]
            if isinstance(next_part, int):
                if part not in current:
                    current[part] = []
                current = current[part]
            else:
                if isinstance(current, list):
                    while len(current) <= part:
                        current.append({})
                    if not isinstance(current[part], dict):
                        current[part] = {}
                    current = current[part]
                else:
                    if part not in current:
                        current[part] = {}
                    current = current[part]

        last = parts[-1]
        if isinstance(current, list):
            while len(current) <= last:
                current.append(None)
            current[last] = value
        else:
            current[last] = value

    return result


def protect_placeholders(text):
    """Replace {{var}} with numbered tokens __PH0__ etc. Returns (modified_text, mapping)."""
    if not isinstance(text, str):
        return text, {}
    mapping = {}
    counter = [0]

    def replacer(match):
        token = f"__PH{counter[0]}__"
        mapping[token] = match.group(0)
        counter[0] += 1
        return token

    protected = PLACEHOLDER_RE.sub(replacer, text)
    return protected, mapping


def restore_placeholders(text, mapping):
    """Restore __PH0__ tokens back to {{var}}."""
    if not mapping or not isinstance(text, str):
        return text
    for token, original in mapping.items():
        text = text.replace(token, original)
    return text


def translate_batch_google(texts, target_lang, api_key):
    """Translate a batch of texts using Google Cloud Translation API v2 REST."""
    import urllib.request
    import urllib.parse

    url = f"https://translation.googleapis.com/language/translate/v2?key={api_key}"

    results = []
    # Process in chunks of BATCH_SIZE
    for i in range(0, len(texts), BATCH_SIZE):
        chunk = texts[i:i + BATCH_SIZE]

        payload = json.dumps({
            "q": chunk,
            "source": "es",
            "target": target_lang,
            "format": "text"
        }).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                translations = data["data"]["translations"]
                results.extend([t["translatedText"] for t in translations])
        except Exception as e:
            print(f"  ERROR translating chunk {i}-{i+len(chunk)} to {target_lang}: {e}")
            results.extend(chunk)  # fallback: keep original

        # Respect rate limits
        if i + BATCH_SIZE < len(texts):
            time.sleep(0.2)

    return results


def get_missing_keys(source_obj, existing_obj, prefix=""):
    """Get top-level sections that are missing from existing."""
    missing_sections = set()
    if isinstance(source_obj, dict):
        for k in source_obj:
            if k not in existing_obj:
                top_section = prefix.split(".")[0] if prefix else k
                missing_sections.add(top_section if not prefix else k)
    return missing_sections


def translate_language(source_data, target_lang, api_key, existing_data=None):
    """Translate source JSON to target language. Merge with existing if provided."""
    if existing_data:
        # Delta mode: find missing top-level sections
        missing_sections = {k for k in source_data if k not in existing_data}
        if not missing_sections:
            print(f"  {target_lang}: already complete, skipping")
            return existing_data
        print(f"  {target_lang}: translating {len(missing_sections)} missing sections: {', '.join(sorted(missing_sections)[:10])}...")
        subset = {k: v for k, v in source_data.items() if k in missing_sections}
    else:
        # Full mode
        subset = source_data
        print(f"  {target_lang}: full translation")

    # Flatten to key-value pairs
    flat = flatten_json(subset)

    # Only translate string values
    string_entries = [(k, v) for k, v in flat if isinstance(v, str)]
    non_string_entries = [(k, v) for k, v in flat if not isinstance(v, str)]

    # Protect placeholders
    protected_texts = []
    mappings = []
    for _, text in string_entries:
        ptext, mapping = protect_placeholders(text)
        protected_texts.append(ptext)
        mappings.append(mapping)

    # Translate
    if protected_texts:
        translated_texts = translate_batch_google(protected_texts, target_lang, api_key)
    else:
        translated_texts = []

    # Restore placeholders
    restored = []
    for text, mapping in zip(translated_texts, mappings):
        restored.append(restore_placeholders(text, mapping))

    # Reconstruct
    translated_pairs = [(string_entries[i][0], restored[i]) for i in range(len(string_entries))]
    translated_pairs.extend(non_string_entries)

    translated_obj = unflatten_json(translated_pairs)

    # Merge with existing
    if existing_data:
        merged = dict(existing_data)
        merged.update(translated_obj)
        return merged
    return translated_obj


def main():
    api_key = os.environ.get("GOOGLE_TRANSLATE_API_KEY")
    if not api_key:
        print("ERROR: Set GOOGLE_TRANSLATE_API_KEY environment variable")
        sys.exit(1)

    # Load source
    print(f"Loading source: {SOURCE_FILE}")
    with open(SOURCE_FILE, "r", encoding="utf-8-sig") as f:
        source_data = json.load(f)

    total_sections = len(source_data)
    flat = flatten_json(source_data)
    total_keys = len([k for k, v in flat if isinstance(v, str)])
    print(f"Source: {total_sections} sections, {total_keys} translatable strings\n")

    # Determine which languages to process
    langs = sys.argv[1:] if len(sys.argv) > 1 else ALL_LANGUAGES

    for lang in langs:
        if lang == "es":
            continue

        target_file = LOCALES_DIR / f"{lang}.json"
        existing_data = None

        if target_file.exists() and lang in PARTIAL_LANGUAGES:
            with open(target_file, "r", encoding="utf-8-sig") as f:
                existing_data = json.load(f)
            existing_sections = len(existing_data)
            print(f"\n[DELTA] {lang}: {existing_sections}/{total_sections} sections present")
        elif target_file.exists() and lang in {"en", "ko"}:
            # en and ko are already complete, skip
            print(f"\n[SKIP] {lang}: already complete")
            continue
        else:
            print(f"\n[FULL] {lang}: creating from scratch")

        translated = translate_language(source_data, lang, api_key, existing_data)

        # Write output
        with open(target_file, "w", encoding="utf-8") as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)

        print(f"  Wrote {target_file.name} ({len(translated)} sections)")

    print("\nDone! All translations generated.")


if __name__ == "__main__":
    main()

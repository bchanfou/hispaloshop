"""
Batch translate static UI JSON files for HispaloShop.

Supports 3 translation backends (all free or low-cost):

1. MyMemory API (FREE, no key needed, 5000 chars/day):
   python scripts/translate_static.py --engine mymemory

2. Google Cloud Translation (FREE tier: 500K chars/month):
   set GOOGLE_TRANSLATE_API_KEY=your-key
   python scripts/translate_static.py --engine google

3. LibreTranslate (FREE, self-hosted):
   python scripts/translate_static.py --engine libre --libre-url http://localhost:5000

Usage:
   python scripts/translate_static.py [--engine ENGINE] [LANG1 LANG2 ...]

   Examples:
   python scripts/translate_static.py fr de          # translate only French and German
   python scripts/translate_static.py                # translate all missing languages
   python scripts/translate_static.py --engine google # use Google API for all
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "locales"
SOURCE_FILE = LOCALES_DIR / "es.json"

# All 30 target languages (excludes 'es' which is the source)
ALL_LANGUAGES = [
    "en", "fr", "de", "pt", "zh", "ja", "ko", "hi", "ar", "ru",
    "it", "nl", "pl", "tr", "sv", "ro", "cs", "el", "hu", "uk",
    "th", "vi", "id", "tl", "bn", "ta", "ur", "fa", "sw",
]

PARTIAL_LANGUAGES = {"fr", "de", "pt", "zh", "ja", "hi", "ar", "ru"}
COMPLETE_LANGUAGES = {"en", "ko"}  # skip these

PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")
BATCH_SIZE = 50


# ── Flatten / Unflatten JSON ──

def flatten_json(obj, prefix=""):
    items = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_key = f"{prefix}.{k}" if prefix else k
            items.extend(flatten_json(v, new_key))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            items.extend(flatten_json(v, f"{prefix}[{i}]"))
    else:
        items.append((prefix, obj))
    return items


def unflatten_json(pairs):
    result = {}
    for key, value in pairs:
        parts = []
        for part in re.split(r"\.(?![^\[]*\])", key):
            m = re.match(r"^(.+)\[(\d+)\]$", part)
            if m:
                parts.append(m.group(1))
                parts.append(int(m.group(2)))
            else:
                parts.append(part)
        current = result
        for i, part in enumerate(parts[:-1]):
            nxt = parts[i + 1]
            if isinstance(nxt, int):
                current.setdefault(part, [])
                current = current[part]
            else:
                if isinstance(current, list):
                    while len(current) <= part:
                        current.append({})
                    if not isinstance(current[part], dict):
                        current[part] = {}
                    current = current[part]
                else:
                    current.setdefault(part, {})
                    current = current[part]
        last = parts[-1]
        if isinstance(current, list):
            while len(current) <= last:
                current.append(None)
            current[last] = value
        else:
            current[last] = value
    return result


# ── Placeholder protection ──

def protect_placeholders(text):
    if not isinstance(text, str):
        return text, {}
    mapping = {}
    counter = [0]
    def replacer(match):
        token = f"XPHX{counter[0]}XPHX"
        mapping[token] = match.group(0)
        counter[0] += 1
        return token
    return PLACEHOLDER_RE.sub(replacer, text), mapping


def restore_placeholders(text, mapping):
    if not mapping or not isinstance(text, str):
        return text
    for token, original in mapping.items():
        text = text.replace(token, original)
    return text


# ── Translation Engines ──

def translate_mymemory(texts, source_lang, target_lang):
    """Free MyMemory API - no key needed. 5000 chars/day, 500 chars/request."""
    results = []
    for text in texts:
        if not text or not text.strip():
            results.append(text)
            continue
        try:
            params = urllib.parse.urlencode({
                "q": text[:500],
                "langpair": f"{source_lang}|{target_lang}",
            })
            url = f"https://api.mymemory.translated.net/get?{params}"
            req = urllib.request.Request(url, headers={"User-Agent": "HispaloShop/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                translated = data.get("responseData", {}).get("translatedText", text)
                if translated.isupper() and not text.isupper():
                    translated = text
                results.append(translated)
        except Exception as e:
            print(f"    MyMemory error: {e}")
            results.append(text)
        time.sleep(0.5)
    return results


def translate_google(texts, source_lang, target_lang, api_key):
    """Google Cloud Translation API v2."""
    results = []
    for i in range(0, len(texts), 128):
        chunk = texts[i:i + 128]
        try:
            url = f"https://translation.googleapis.com/language/translate/v2?key={api_key}"
            payload = json.dumps({
                "q": chunk, "source": source_lang,
                "target": target_lang, "format": "text"
            }).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results.extend([t["translatedText"] for t in data["data"]["translations"]])
        except Exception as e:
            print(f"    Google error: {e}")
            results.extend(chunk)
        if i + 128 < len(texts):
            time.sleep(0.1)
    return results


def translate_libre(texts, source_lang, target_lang, libre_url):
    """LibreTranslate (self-hosted, free)."""
    results = []
    for text in texts:
        if not text or not text.strip():
            results.append(text)
            continue
        try:
            payload = json.dumps({
                "q": text, "source": source_lang,
                "target": target_lang, "format": "text"
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{libre_url}/translate", data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results.append(data.get("translatedText", text))
        except Exception as e:
            print(f"    LibreTranslate error: {e}")
            results.append(text)
    return results


def translate_batch(texts, source_lang, target_lang, engine, **kwargs):
    if engine == "google":
        return translate_google(texts, source_lang, target_lang, kwargs["api_key"])
    elif engine == "libre":
        return translate_libre(texts, source_lang, target_lang, kwargs["libre_url"])
    else:
        return translate_mymemory(texts, source_lang, target_lang)


# ── Core logic ──

def translate_language(source_data, target_lang, engine, **kwargs):
    target_file = LOCALES_DIR / f"{target_lang}.json"
    existing_data = None

    if target_lang in COMPLETE_LANGUAGES:
        print(f"  [{target_lang}] SKIP (already complete)")
        return None

    if target_file.exists():
        try:
            with open(target_file, "r", encoding="utf-8-sig") as f:
                existing_data = json.load(f)
            if not isinstance(existing_data, dict) or len(existing_data) <= 1:
                existing_data = None
        except Exception:
            existing_data = None

    if existing_data and target_lang in PARTIAL_LANGUAGES:
        missing = {k: v for k, v in source_data.items() if k not in existing_data}
        if not missing:
            print(f"  [{target_lang}] Already complete ({len(existing_data)} sections)")
            return None
        print(f"  [{target_lang}] DELTA: {len(missing)} missing sections...")
        subset = missing
    else:
        print(f"  [{target_lang}] FULL: {len(source_data)} sections...")
        subset = source_data

    flat = flatten_json(subset)
    string_entries = [(k, v) for k, v in flat if isinstance(v, str)]
    non_string_entries = [(k, v) for k, v in flat if not isinstance(v, str)]

    protected = []
    mappings = []
    for _, text in string_entries:
        p, m = protect_placeholders(text)
        protected.append(p)
        mappings.append(m)

    print(f"    {len(protected)} strings to translate...")

    translated = []
    for i in range(0, len(protected), BATCH_SIZE):
        chunk = protected[i:i + BATCH_SIZE]
        batch_result = translate_batch(chunk, "es", target_lang, engine, **kwargs)
        translated.extend(batch_result)
        done = min(i + BATCH_SIZE, len(protected))
        print(f"    [{done}/{len(protected)}]")

    restored = [restore_placeholders(t, m) for t, m in zip(translated, mappings)]
    pairs = [(string_entries[i][0], restored[i]) for i in range(len(string_entries))]
    pairs.extend(non_string_entries)
    translated_obj = unflatten_json(pairs)

    if existing_data:
        merged = dict(existing_data)
        merged.update(translated_obj)
        return merged
    return translated_obj


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Translate HispaloShop UI to 30 languages")
    parser.add_argument("langs", nargs="*", help="Languages to translate (default: all)")
    parser.add_argument("--engine", default="mymemory", choices=["mymemory", "google", "libre"])
    parser.add_argument("--libre-url", default="http://localhost:5000")
    args = parser.parse_args()

    kwargs = {}
    if args.engine == "google":
        api_key = os.environ.get("GOOGLE_TRANSLATE_API_KEY")
        if not api_key:
            print("ERROR: Set GOOGLE_TRANSLATE_API_KEY")
            sys.exit(1)
        kwargs["api_key"] = api_key
    elif args.engine == "libre":
        kwargs["libre_url"] = args.libre_url

    print(f"Engine: {args.engine}")
    print(f"Source: {SOURCE_FILE}\n")

    with open(SOURCE_FILE, "r", encoding="utf-8-sig") as f:
        source_data = json.load(f)

    flat = flatten_json(source_data)
    total_keys = len([k for k, v in flat if isinstance(v, str)])
    print(f"Source: {len(source_data)} sections, {total_keys} strings\n")

    langs = args.langs if args.langs else [l for l in ALL_LANGUAGES if l != "es"]

    for lang in langs:
        if lang == "es":
            continue
        result = translate_language(source_data, lang, args.engine, **kwargs)
        if result:
            target_file = LOCALES_DIR / f"{lang}.json"
            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"    Wrote {target_file.name} ({len(result)} sections)\n")

    print("\nDone!")


if __name__ == "__main__":
    main()

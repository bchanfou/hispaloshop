#!/usr/bin/env python3
"""
Diagnostico del Feed - Verifica endpoints y formato de datos
"""

import urllib.request
import urllib.error
import json
import ssl

API_BASE = "https://api.hispaloshop.com"

def api_request(path, headers=None):
    try:
        url = f"{API_BASE}{path}"
        req = urllib.request.Request(url)
        if headers:
            for k, v in headers.items():
                req.add_header(k, v)
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return {"status": resp.status, "data": json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "error": e.read().decode()}
    except Exception as e:
        return {"status": 0, "error": str(e)}

def main():
    print("=" * 60)
    print("DIAGNOSTICO DEL FEED")
    print("=" * 60)
    print()
    
    # Test 1: ForYou endpoint
    print("1. Testing /api/feed/foryou")
    result = api_request("/api/feed/foryou?limit=5")
    if result["status"] == 200:
        data = result["data"]
        items = data.get("items", []) or data.get("posts", [])
        print(f"   Status: OK")
        print(f"   Items count: {len(items)}")
        print(f"   Has 'items' field: {'items' in data}")
        print(f"   Has 'posts' field: {'posts' in data}")
        print(f"   Has 'has_more' field: {'has_more' in data}")
        if items:
            print(f"   First item ID: {items[0].get('id')}")
            print(f"   First item type: {items[0].get('type')}")
            print(f"   First item has user_name: {'user_name' in items[0]}")
    else:
        print(f"   ERROR: {result.get('status')} - {result.get('error', 'Unknown')}")
    print()
    
    # Test 2: Following endpoint (sin auth)
    print("2. Testing /api/feed/following (sin autenticacion)")
    result = api_request("/api/feed/following?limit=5")
    if result["status"] == 200:
        data = result["data"]
        items = data.get("items", []) or data.get("posts", [])
        print(f"   Status: OK")
        print(f"   Items count: {len(items)}")
        print(f"   (Vacío es normal si no hay usuario autenticado)")
    else:
        print(f"   ERROR: {result.get('status')} - {result.get('error', 'Unknown')}")
    print()
    
    # Test 3: Posts endpoint
    print("3. Testing /api/posts")
    result = api_request("/api/posts?limit=5")
    if result["status"] == 200:
        data = result["data"]
        items = data if isinstance(data, list) else data.get("posts", [])
        print(f"   Status: OK")
        print(f"   Items count: {len(items)}")
    else:
        print(f"   ERROR: {result.get('status')} - {result.get('error', 'Unknown')}")
    print()
    
    # Test 4: Feed legacy
    print("4. Testing /api/feed (legacy)")
    result = api_request("/api/feed?limit=5&scope=hybrid")
    if result["status"] == 200:
        data = result["data"]
        items = data.get("items", []) if isinstance(data, dict) else []
        print(f"   Status: OK")
        print(f"   Items count: {len(items)}")
    else:
        print(f"   ERROR: {result.get('status')} - {result.get('error', 'Unknown')}")
    print()
    
    # Resumen
    print("=" * 60)
    print("RESUMEN:")
    print("=" * 60)
    print("\nSi los endpoints devuelven items pero el feed no carga:")
    print("  1. Revisar consola del navegador (F12) por errores de JS")
    print("  2. Verificar que React Query está devolviendo datos:")
    print("     - Instalar React Query DevTools")
    print("     - Verificar queryKey: ['feed', 'foryou']")
    print("  3. Revisar que FeedSkeleton no está siempre visible")
    print("  4. Verificar que Virtuoso tiene data correcta")
    print("\nPosibles problemas:")
    print("  - Error en normalizacion de datos (useFeedQueries.ts)")
    print("  - Estado de loading infinito")
    print("  - Error boundary capturando errores silenciosamente")
    print()

if __name__ == "__main__":
    main()

# B1 Baseline Evidence - 2026-03-23

## Scope
Baseline tecnico del Barrido 1 para frontend smoke y backend pruebas de autenticacion.

## Commands Executed

### Frontend smoke

```bash
cd frontend
npx playwright test e2e/smoke.spec.js --reporter=line --workers=1
```

Resultado:
- Exit code: 1
- 12 tests failed
- 2 tests passed

Fallos clave observados:
- `page.goto('/')` timeout 15000ms (home no carga en tiempo esperado).
- `GET http://localhost:8000/health` -> `ECONNREFUSED ::1:8000`.
- Locator ambiguo en validacion de precio `text=249`.
- Playwright mobile (webkit) no instalado: `npx playwright install` requerido.

### Backend auth tests

```bash
cd .
.venv/Scripts/python.exe -m pytest backend_test.py test_auth.py -vv
```

Resultado:
- Exit code: 1
- `3 failed, 1 error`

Fallos clave observados:
- Tests async en `test_auth.py` no se ejecutan correctamente en pytest (mensaje de async no soportado).
- `fixture 'cookies' not found` en `test_me`.

## Initial Classification

- BUG-0001: timeout carga home en smoke.
- BUG-0002: backend `/health` no disponible durante smoke.
- BUG-0003: selector ambiguo en precio productor.
- BUG-0004: dependencia de browser webkit faltante.
- BUG-0005: configuracion async tests auth incorrecta.
- BUG-0006: fixture cookies faltante en auth tests.

## Immediate Blocking Items

1. Corregir precondiciones de entorno para smoke (backend activo y browser dependencies).
2. Reparar harness de `test_auth.py` para que async/fixtures sean validos.
3. Reejecutar baseline y actualizar tracker con conteo residual.

## Progress Update (same day rerun)

- `npx playwright install webkit` ejecutado correctamente.
- Rerun smoke: desaparece el error de browser faltante, pero persisten:
	- timeout de carga home,
	- timeout en setup de pagina mobile,
	- selector ambiguo de precio,
	- dependencia backend para `/health` sin servicio activo.

Decision operativa:
- mantener Barrido 1 en curso,
- no pasar a Barrido 2 hasta estabilizar entorno de test y suite auth backend.

## Fixes Applied During B1 Execution

1. `frontend/e2e/smoke.spec.js`
	- Ajuste de selector ambiguo de precio ELITE:
	- de `locator('text=249')` a `getByText('249€/mes', { exact: true })`.

2. `test_auth.py`
	- Migrado a suite `pytest` con `pytest.mark.asyncio`.
	- Agregada fixture `cookies` para eliminar error de fixture faltante.
	- Verificacion estructural: `pytest --collect-only` detecta 4 tests sin errores de coleccion.

## New Blocker Found

- Durante validacion focalizada de smoke (chromium), el webserver de frontend cae por memoria:
  - `FATAL ERROR: Zone Allocation failed - process out of memory`
  - salida asociada: `worker process exited unexpectedly (code=3221226505)`.

## Mitigation Applied to OOM

- Ajuste en `frontend/playwright.config.js`:
	- comando de webServer actualizado para ejecutar CRACO con heap mayor:
	- `node --max-old-space-size=4096 ./node_modules/@craco/craco/dist/bin/craco.js start`
- Verificacion:
	- smoke focalizado `precio ELITE` en chromium finaliza con `PRICE_EXIT:0`.

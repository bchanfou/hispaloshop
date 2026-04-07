#!/bin/bash
# =============================================================================
# SMOKE TESTS - FASE 0
# Script para ejecutar tests mínimos de validación
# =============================================================================

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════"
echo "  HISPALOSHOP - SMOKE TESTS (FASE 0)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de errores
ERRORS=0

# -----------------------------------------------------------------------------
# Test 1: Variables de entorno críticas
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/6]${NC} Validando variables de entorno críticas..."
if [ -z "$JWT_SECRET" ] || [ -z "$MONGO_URL" ]; then
    echo -e "${RED}✗ FAIL${NC}: JWT_SECRET o MONGO_URL no configuradas"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ PASS${NC}: Variables críticas configuradas"
fi

# -----------------------------------------------------------------------------
# Test 2: Backend compila
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/6]${NC} Validando que el backend compila..."
cd backend
if python -c "import main; print('OK')" 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}: Backend compila correctamente"
else
    echo -e "${RED}✗ FAIL${NC}: Error al importar main.py"
    ERRORS=$((ERRORS + 1))
fi

# -----------------------------------------------------------------------------
# Test 3: Tests de pytest pasan
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/6]${NC} Ejecutando tests de pytest..."
if python -m pytest tests/test_smoke.py -v --tb=short 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}: Tests de pytest pasan"
else
    echo -e "${RED}✗ FAIL${NC}: Algunos tests fallaron"
    ERRORS=$((ERRORS + 1))
fi

cd ..

# -----------------------------------------------------------------------------
# Test 4: Frontend build
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/6]${NC} Validando build del frontend..."
cd frontend
if npm run build 2>&1 | grep -q "build"; then
    echo -e "${GREEN}✓ PASS${NC}: Frontend build exitoso"
else
    echo -e "${RED}✗ FAIL${NC}: Error en build del frontend"
    ERRORS=$((ERRORS + 1))
fi

cd ..

# -----------------------------------------------------------------------------
# Test 5: Variables críticas no tienen defaults inseguros
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/6]${NC} Validando que no hay defaults inseguros..."
if grep -r "JWT_SECRET.*=.*changeme" backend/ 2>/dev/null || \
   grep -r "password.*123" backend/ 2>/dev/null; then
    echo -e "${RED}✗ FAIL${NC}: Se encontraron defaults inseguros"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ PASS${NC}: No se encontraron defaults inseguros"
fi

# -----------------------------------------------------------------------------
# Test 6: Archivos esenciales existen
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/6]${NC} Validando archivos esenciales..."
FILES=(
    ".env.example"
    "backend/main.py"
    "frontend/package.json"
    "DISASTER_RECOVERY.md"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}  ✗${NC} Falta: $file"
        ALL_EXIST=false
        ERRORS=$((ERRORS + 1))
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✓ PASS${NC}: Todos los archivos esenciales existen"
fi

# -----------------------------------------------------------------------------
# Resultado final
# -----------------------------------------------------------------------------
echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}✓ TODOS LOS SMOKE TESTS PASARON${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    exit 0
else
    echo -e "  ${RED}✗ $ERRORS TEST(S) FALLARON${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    exit 1
fi

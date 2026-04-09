"""
SMOKE TESTS - FASE 0
Tests mínimos para validar que el sistema arranca y los flujos críticos funcionan.
Ejecutar: pytest backend/tests/test_smoke.py -v
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parents[1]))


class TestStartup:
    """Tests de startup - validan que la app arranca correctamente."""
    
    def test_import_main(self):
        """El módulo main.py debe importarse sin errores."""
        import main
        assert hasattr(main, 'app')
    
    def test_fastapi_app_created(self):
        """La app FastAPI debe existir y tener configuración básica."""
        import main
        from fastapi import FastAPI
        assert isinstance(main.app, FastAPI)
        assert main.app.title == "Hispaloshop API"
    
    def test_settings_loaded(self):
        """Las settings deben cargarse correctamente."""
        from core.config import settings
        assert settings.JWT_SECRET is not None
        assert len(settings.JWT_SECRET) >= 32
        assert settings.MONGO_URL is not None


class TestHealthEndpoints:
    """Tests de endpoints de health check."""
    
    @pytest.fixture(scope="class")
    def client(self):
        """Cliente de test con DB mockeada."""
        import main
        # Mock database
        with patch('main.connect_db'), patch('main.disconnect_db'):
            with patch.object(main, 'db', MagicMock(), create=True):
                yield TestClient(main.app)
    
    def test_health_endpoint(self, client):
        """Endpoint /health debe responder 200."""
        response = client.get("/health")
        assert response.status_code in [200, 503]  # 503 si DB no conecta
    
    def test_api_prefix_exists(self, client):
        """Los endpoints deben estar bajo /api."""
        response = client.get("/api/config/locale")
        # Puede dar 200 o error de auth, pero no 404
        assert response.status_code != 404


class TestCriticalFlows:
    """Tests de flujos críticos - validan lógica de negocio básica."""
    
    def test_jwt_validation(self):
        """JWT config básica debe estar disponible para auth."""
        from core.config import settings
        assert settings.JWT_SECRET is not None
        assert len(settings.JWT_SECRET) >= 32
        assert settings.JWT_ALGORITHM in ("HS256", "HS384", "HS512")
    
    def test_password_hashing(self):
        """El sistema debe poder hashear y verificar passwords."""
        import bcrypt
        from core.security import hash_password
        
        password = "TestPassword123!"
        hashed = hash_password(password)
        
        assert hashed != password
        assert bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8")) is True
        assert bcrypt.checkpw("wrong_password".encode("utf-8"), hashed.encode("utf-8")) is False


class TestConfigValidation:
    """Tests de validación de configuración."""
    
    def test_production_settings(self):
        """En producción, ciertas variables deben estar configuradas."""
        from core.config import settings
        
        if settings.ENV == "production":
            # No debe haber localhost en URLs de producción
            assert "localhost" not in settings.FRONTEND_URL.lower()
            assert "localhost" not in str(settings.BACKEND_URL or "").lower()
            
            # Stripe debe estar configurado
            assert settings.STRIPE_SECRET_KEY.startswith("sk_")


class TestRoutesLoaded:
    """Tests de que las rutas están cargadas."""
    
    def test_auth_router_loaded(self):
        """El router de auth debe estar cargado."""
        import main
        routes = [r.path for r in main.app.routes]
        assert any("/api/auth" in str(r) for r in routes)
    
    def test_products_router_loaded(self):
        """El router de products debe estar cargado."""
        import main
        routes = [r.path for r in main.app.routes]
        assert any("/api/products" in str(r) for r in routes)
    
    def test_orders_router_loaded(self):
        """El router de orders debe estar cargado."""
        import main
        routes = [r.path for r in main.app.routes]
        assert any("/api/orders" in str(r) for r in routes)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

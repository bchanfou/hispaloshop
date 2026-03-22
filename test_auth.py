"""Pytest suite para validar el flujo de autenticacion basico contra backend en vivo."""

import os

import httpx
import pytest
import pytest_asyncio

BASE_URL = os.getenv("AUTH_TEST_BASE_URL", "http://127.0.0.1:8000/api")


@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(timeout=5) as async_client:
        yield async_client


@pytest_asyncio.fixture
async def cookies(client):
    response = await client.post(
        f"{BASE_URL}/auth/login",
        json={"email": "consumer@test.com", "password": "Test1234"},
    )
    if response.status_code != 200:
        pytest.skip(f"No se pudo autenticar usuario de prueba: {response.status_code}")
    return response.cookies


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get(f"{BASE_URL}/health")
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_login(client):
    response = await client.post(
        f"{BASE_URL}/auth/login",
        json={"email": "consumer@test.com", "password": "Test1234"},
    )
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_me(cookies):
    async with httpx.AsyncClient(cookies=cookies, timeout=5) as async_client:
        response = await async_client.get(f"{BASE_URL}/auth/me")
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_google_url(client):
    response = await client.get(f"{BASE_URL}/auth/google/url")
    if response.status_code == 500 and "Google OAuth not configured" in response.text:
        pytest.skip("Google OAuth no configurado en este entorno")
    assert response.status_code == 200, response.text

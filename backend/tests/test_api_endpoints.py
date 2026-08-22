"""
Integration Tests for FastAPI API Endpoints using TestClient
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "retrieval_architecture" in data

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["hybrid_retrieval"] is True

def test_list_papers():
    response = client.get("/papers/")
    assert response.status_code == 200
    data = response.json()
    assert "papers" in data

def test_api_v1_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") is not None
    assert response.headers.get("X-Response-Time-MS") is not None

import os
os.environ["USE_MOCK_MODE"] = "true"

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_languages():
    response = client.get("/api/languages")
    assert response.status_code == 200
    body = response.json()
    assert "languages" in body
    codes = [language["code"] for language in body["languages"]]
    assert "hi" in codes

def test_chat_mock_mode_rate_limit():
    # Test rate limiter implicitly by hitting it 21 times (limit is 20/min)
    for _ in range(21):
        response = client.post("/api/chat", json={"query": "test"})
    
    # The 21st request should be rate-limited (429)
    assert response.status_code == 429

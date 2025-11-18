#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:5001/api"

# Test login
print("Testing login...")
login_data = {
    "emailOrUsername": "test@example.com",
    "password": "testpass123"
}

response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

if response.status_code == 200:
    data = response.json()
    token = data['access_token']
    print(f"\nToken: {token[:50]}...")

    # Test protected endpoint
    print("\nTesting protected endpoint /api/days...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/days", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

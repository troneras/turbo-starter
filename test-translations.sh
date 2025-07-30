#!/bin/bash

# Test translation endpoints

echo "Testing translation endpoints..."

# First, get a JWT token (assuming test user exists)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ]; then
  echo "Failed to get auth token. Using mock token for testing..."
  TOKEN="mock-token"
fi

echo "Using token: ${TOKEN:0:20}..."

# Create a translation key
echo -e "\n1. Creating translation key..."
curl -X POST http://localhost:3001/api/translations/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullKey": "checkout.button.confirm",
    "description": "Confirmation button in checkout flow"
  }'

# Get translation keys
echo -e "\n\n2. Getting translation keys..."
curl -X GET http://localhost:3001/api/translations/keys \
  -H "Authorization: Bearer $TOKEN"

# Create a translation variant
echo -e "\n\n3. Creating translation variant..."
curl -X POST http://localhost:3001/api/translations/variants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullKey": "checkout.button.confirm",
    "locale": "en-US",
    "value": "Confirm Order",
    "status": "APPROVED"
  }'

# Get translation variants
echo -e "\n\n4. Getting translation variants for key..."
curl -X GET "http://localhost:3001/api/translations/variants?fullKey=checkout.button.confirm" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nTranslation tests complete!"
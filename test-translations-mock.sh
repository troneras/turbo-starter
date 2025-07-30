#!/bin/bash

# Test translation endpoints with mock auth

echo "Testing translation endpoints with mock auth..."

# Use a mock admin token (TEST_MODE must be enabled)
TOKEN="mock-admin-jwt-token"

echo "Using mock token: ${TOKEN:0:20}..."

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

# Get translation stats
echo -e "\n\n5. Getting translation statistics..."
curl -X GET http://localhost:3001/api/translations/stats \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\nTranslation tests complete!"
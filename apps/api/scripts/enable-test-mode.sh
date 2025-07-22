#!/bin/bash

# Enable test mode for API development
echo "Enabling test mode for API development..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Add test mode to .env
if ! grep -q "TEST_MODE" .env; then
  echo "" >> .env
  echo "# Test Mode" >> .env
  echo "TEST_MODE=true" >> .env
else
  # Update existing value
  sed -i 's/TEST_MODE=.*/TEST_MODE=true/' .env
fi

echo "✅ Test mode enabled in .env"
echo ""
echo "To start the API with test mode:"
echo "  bun run dev"
echo ""
echo "The API will now accept mock JWT tokens:"
echo "  - mock-admin-jwt-token"
echo "  - mock-editor-jwt-token"
echo "  - mock-user-jwt-token"
echo ""
echo "⚠️  WARNING: Never use test mode in production!"
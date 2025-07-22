#!/bin/bash

# Enable test mode for development
echo "Enabling test mode for admin UI development..."

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

# Add test mode to .env.local
if ! grep -q "VITE_TEST_MODE" .env.local; then
  echo "" >> .env.local
  echo "# Test Mode" >> .env.local
  echo "VITE_TEST_MODE=true" >> .env.local
else
  # Update existing value
  sed -i 's/VITE_TEST_MODE=.*/VITE_TEST_MODE=true/' .env.local
fi

echo "✅ Test mode enabled in .env.local"
echo ""
echo "To start the admin UI with test devtools:"
echo "  bun run dev"
echo ""
echo "The test devtools will appear as a floating button in the bottom-right corner."
echo ""
echo "⚠️  WARNING: Never use test mode in production!"
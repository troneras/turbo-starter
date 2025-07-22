#!/bin/bash

echo "Testing Query Parameter Authentication"
echo "====================================="
echo ""
echo "This script demonstrates the different query parameter authentication methods."
echo ""

# Base URL
BASE_URL="http://localhost:3000"

echo "1. Test Mode Only (shows login screen with devtools):"
echo "   $BASE_URL?testMode=true"
echo ""

echo "2. Test Mode with Auto-Login as Admin:"
echo "   $BASE_URL?testMode=true&testProfile=admin"
echo ""

echo "3. Test Mode with Auto-Login as Editor:"
echo "   $BASE_URL?testMode=true&testProfile=editor"
echo ""

echo "4. Test Mode with Auto-Login as Basic User:"
echo "   $BASE_URL?testMode=true&testProfile=user"
echo ""

echo "5. Deep Link with Authentication (e.g., Users page as Admin):"
echo "   $BASE_URL/users?testMode=true&testProfile=admin"
echo ""

echo "Available Test Profiles:"
echo "- admin: Full system access"
echo "- editor: Content management permissions"
echo "- user: Read-only access"
echo ""

echo "Try opening any of these URLs in your browser!"
echo ""
echo "Note: The query parameters will be automatically removed from the URL"
echo "after authentication to keep the URL clean."
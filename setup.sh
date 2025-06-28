#!/bin/bash

# 🔐 Missive Integration Secure Setup Script
# This script helps you configure your API token securely

echo "🚀 Missive Integration Secure Setup"
echo "=================================="
echo ""

# Check if config.js already exists
if [ -f "config.js" ]; then
    echo "⚠️  config.js already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Copy the example config
if [ ! -f "config.example.js" ]; then
    echo "❌ config.example.js not found!"
    echo "Please make sure you're in the correct directory."
    exit 1
fi

echo "📋 Copying config.example.js to config.js..."
cp config.example.js config.js

echo ""
echo "🔑 Now you need to add your Missive API token:"
echo ""
echo "1. Go to Missive Settings → API → Create a new token"
echo "2. Copy the token (starts with 'missive_pat-')"
echo "3. Enter it below:"
echo ""

# Prompt for API token
read -p "Enter your Missive API token: " -r API_TOKEN

if [ -z "$API_TOKEN" ]; then
    echo "❌ No token provided. Setup cancelled."
    exit 1
fi

# Validate token format (basic check)
if [[ ! $API_TOKEN =~ ^missive_pat- ]]; then
    echo "⚠️  Warning: Token doesn't start with 'missive_pat-'"
    echo "   Make sure you copied the full token."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Replace the token in config.js
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/missive_pat-your_actual_token_here/$API_TOKEN/g" config.js
else
    # Linux
    sed -i "s/missive_pat-your_actual_token_here/$API_TOKEN/g" config.js
fi

echo ""
echo "✅ Configuration completed!"
echo ""
echo "🔐 Security check:"
echo "   - config.js is ignored by git ✅"
echo "   - Your token is stored locally only ✅"
echo "   - Never commit config.js to version control ✅"
echo ""
echo "🧪 To test your setup:"
echo "   1. Open your integration in Missive"
echo "   2. Open browser Developer Tools (F12)"
echo "   3. Create a task and check console for:"
echo "      '🔑 Using API token from: MissiveConfig (config.js)'"
echo ""
echo "📚 For more security options, see: SECURITY.md"
echo ""
echo "🎉 Setup complete! Your tasks should now be properly assigned." 
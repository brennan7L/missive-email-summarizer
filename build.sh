#!/bin/bash

# Build script for Netlify deployment
# Generates config.js from environment variables

echo "🔧 Generating config.js from environment variables..."

# Check if MISSIVE_API_TOKEN is set
if [ -z "$MISSIVE_API_TOKEN" ]; then
    echo "❌ Error: MISSIVE_API_TOKEN environment variable is not set"
    echo "Please add it in Netlify Site Settings > Environment variables"
    exit 1
fi

# Generate config.js from environment variables
cat > config.js << EOF
/**
 * Missive Integration Configuration
 * Generated automatically from environment variables during build
 */

window.MissiveConfig = {
    apiToken: '${MISSIVE_API_TOKEN}',
    apiBaseUrl: '${MISSIVE_API_BASE_URL:-https://public.missiveapp.com}',
    debugMode: ${MISSIVE_DEBUG_MODE:-false},
    autoAssignToCurrentUser: ${MISSIVE_AUTO_ASSIGN:-true},
    organizationId: ${MISSIVE_ORG_ID:-null},
    teamId: ${MISSIVE_TEAM_ID:-null}
};

console.log('🔑 Using API token from: Environment Variables (Netlify)');
EOF

echo "✅ config.js generated successfully"
echo "🚀 Ready for deployment" 
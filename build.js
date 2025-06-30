#!/usr/bin/env node

// Node.js build script for Netlify deployment
// Generates config.js from environment variables
// Alternative to build.sh for better cross-platform compatibility

const fs = require('fs');
const path = require('path');

console.log('🔧 Generating config.js from environment variables...');
console.log(`🌍 Environment: ${process.env.CONTEXT || 'local'}`);

// Check if required environment variables are set
const apiToken = process.env.MISSIVE_API_TOKEN;
const openaiApiKey = process.env.OPEN_AI_API;

if (!apiToken) {
    console.error('❌ Error: MISSIVE_API_TOKEN environment variable is not set');
    console.log('📋 Available environment variables:');
    
    const relevantVars = Object.keys(process.env)
        .filter(key => key.includes('MISSIVE') || key.includes('NETLIFY') || key.includes('OPEN_AI'))
        .map(key => `   ${key}=${process.env[key] ? '[SET]' : '[EMPTY]'}`);
    
    if (relevantVars.length > 0) {
        console.log(relevantVars.join('\n'));
    } else {
        console.log('   (none found)');
    }
    
    console.log('Please add MISSIVE_API_TOKEN in Netlify Site Settings > Environment variables');
    process.exit(1);
}

console.log(`✅ MISSIVE_API_TOKEN found (${apiToken.length} characters)`);

if (openaiApiKey) {
    console.log(`✅ OPEN_AI_API found (${openaiApiKey.length} characters)`);
} else {
    console.log('⚠️  OPEN_AI_API not found - OpenAI features will require URL parameter fallback');
}

// Generate config.js content
const configContent = `/**
 * Missive Integration Configuration
 * Generated automatically from environment variables during build
 */

window.MissiveConfig = {
    apiToken: '${apiToken}',
    apiBaseUrl: '${process.env.MISSIVE_API_BASE_URL || 'https://public.missiveapp.com'}',
    debugMode: ${process.env.MISSIVE_DEBUG_MODE === 'true'},
    autoAssignToCurrentUser: ${process.env.MISSIVE_AUTO_ASSIGN !== 'false'},
    organizationId: ${process.env.MISSIVE_ORG_ID || 'null'},
    teamId: ${process.env.MISSIVE_TEAM_ID || 'null'},
    openaiApiKey: '${openaiApiKey || ''}'
};

console.log('🔑 Using API token from: Environment Variables (Netlify)');
`;

// Write config.js file
try {
    fs.writeFileSync('config.js', configContent, 'utf8');
    console.log('✅ config.js generated successfully');
    console.log('🚀 Ready for deployment');
} catch (error) {
    console.error('❌ Error writing config.js:', error.message);
    process.exit(1);
} 
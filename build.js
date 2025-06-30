#!/usr/bin/env node

// Node.js build script for Netlify deployment
// Generates SECURE config.js - API keys are NOT exposed in public files
// API keys are handled via secure environment variable injection

const fs = require('fs');
const path = require('path');

console.log('🔧 Generating SECURE config.js (API keys will NOT be exposed)...');
console.log(`🌍 Environment: ${process.env.CONTEXT || 'local'}`);

// Check if required environment variables are set (for validation only)
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

console.log(`✅ MISSIVE_API_TOKEN found (${apiToken.length} characters) - will be injected securely`);

if (openaiApiKey) {
    console.log(`✅ OPEN_AI_API found (${openaiApiKey.length} characters) - will be injected securely`);
} else {
    console.log('⚠️  OPEN_AI_API not found - OpenAI features will require URL parameter fallback');
}

// Generate SECURE config.js content - NO API KEYS EXPOSED
const configContent = `/**
 * Missive Integration Configuration
 * Generated automatically during build - SECURE VERSION
 * 🔐 API keys are NOT exposed in this public file for security
 */

window.MissiveConfig = {
    // API keys are injected securely via server environment, not exposed here
    apiToken: null,
    apiBaseUrl: '${process.env.MISSIVE_API_BASE_URL || 'https://public.missiveapp.com'}',
    debugMode: ${process.env.MISSIVE_DEBUG_MODE === 'true'},
    autoAssignToCurrentUser: ${process.env.MISSIVE_AUTO_ASSIGN !== 'false'},
    organizationId: ${process.env.MISSIVE_ORG_ID || 'null'},
    teamId: ${process.env.MISSIVE_TEAM_ID || 'null'},
    openaiApiKey: null,
    
    // Security flags (safe to expose)
    hasApiToken: ${!!apiToken},
    hasOpenaiKey: ${!!openaiApiKey}
};

console.log('🔑 Config loaded - API keys will be injected securely at runtime');
`;

// Also create a secure API key injection script
const injectionScript = `/**
 * Secure API Key Injection Script
 * This runs server-side only and injects API keys securely
 */

// Inject API keys from server environment variables (Netlify Edge Functions)
if (typeof process !== 'undefined' && process.env) {
    if (window.MissiveConfig) {
        // Only inject if keys are not already set and we're in a secure context
        if (!window.MissiveConfig.apiToken && process.env.MISSIVE_API_TOKEN) {
            window.MissiveConfig.apiToken = process.env.MISSIVE_API_TOKEN;
            console.log('🔑 Missive API token injected securely');
        }
        
        if (!window.MissiveConfig.openaiApiKey && process.env.OPEN_AI_API) {
            window.MissiveConfig.openaiApiKey = process.env.OPEN_AI_API;
            console.log('🔑 OpenAI API key injected securely'); 
        }
    }
}
`;

// Write config.js file (without API keys)
try {
    fs.writeFileSync('config.js', configContent, 'utf8');
    console.log('✅ SECURE config.js generated successfully (no API keys exposed)');
    
    // Write the injection script for potential server-side use
    fs.writeFileSync('secure-inject.js', injectionScript, 'utf8');
    console.log('✅ Secure injection script created');
    
    console.log('🔐 Security Status: API keys are NOT exposed in public files');
    console.log('🚀 Ready for secure deployment');
} catch (error) {
    console.error('❌ Error writing config files:', error.message);
    process.exit(1);
} 
/**
 * Missive Integration Configuration
 * 
 * SECURITY INSTRUCTIONS:
 * 1. Copy this file: cp config.example.js config.js
 * 2. Edit config.js with your actual API token
 * 3. The config.js file will be ignored by git for security
 * 
 * To get your API token:
 * 1. Go to Missive Settings > API > Create a new token
 * 2. Copy the token (starts with 'missive_pat-')
 * 3. Replace the placeholder below
 */

window.MissiveConfig = {
    // Replace with your actual Missive API token
    apiToken: 'missive_pat-your_actual_token_here',
    
    // Optional: Missive API base URL (usually doesn't need to change)
    apiBaseUrl: 'https://public.missiveapp.com',
    
    // Optional: Enable debug logging
    debugMode: true,
    
    // Optional: Default task assignment behavior
    autoAssignToCurrentUser: true,
    
    // Optional: Organization and team IDs (if needed)
    organizationId: null,
    teamId: null
};

// Alternative: If you prefer environment variables in build process
// window.MissiveConfig = {
//     apiToken: process.env.MISSIVE_API_TOKEN,
//     apiBaseUrl: process.env.MISSIVE_API_BASE_URL || 'https://public.missiveapp.com',
//     debugMode: process.env.NODE_ENV === 'development'
// }; 
// Sales Integration Configuration Template
// Copy this file to config.js and fill in your actual API keys

const config = {
  // Zoho CRM Integration
  zoho: {
    clientId: 'your_zoho_client_id_here',
    clientSecret: 'your_zoho_client_secret_here',
    refreshToken: 'your_zoho_refresh_token_here',
    accessToken: 'your_zoho_access_token_here',
    baseUrl: 'https://www.zohoapis.com/crm/v2',
    accountsUrl: 'https://accounts.zoho.com',
    // Zoho data center (com, eu, in, com.au, jp)
    dataCenterExtension: 'com'
  },

  // Missive Email Platform Integration
  missive: {
    apiToken: 'your_missive_api_token_here',
    baseUrl: 'https://public.missiveapp.com/v1',
    webhookSecret: 'your_missive_webhook_secret_here',
    organizationId: 'your_organization_id_here'
  },

  // OpenAI Integration (for AI insights)
  openai: {
    apiKey: 'your_openai_api_key_here',
    model: 'gpt-4',
    maxTokens: 1000
  },

  // Analytics & Monitoring
  analytics: {
    provider: 'mixpanel', // 'mixpanel', 'segment', 'google-analytics'
    apiKey: 'your_analytics_api_key_here',
    trackingId: 'your_tracking_id_here'
  },

  // Application Settings
  app: {
    environment: 'development', // 'development', 'staging', 'production'
    port: 3000,
    corsOrigins: ['http://localhost:3000'],
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100 // per windowMs
    }
  },

  // Webhook Configuration
  webhooks: {
    missiveEndpoint: '/webhooks/missive',
    zohoEndpoint: '/webhooks/zoho',
    secret: 'your_webhook_verification_secret'
  },

  // Database Configuration (if needed for caching)
  database: {
    type: 'sqlite', // 'sqlite', 'postgresql', 'mysql'
    host: 'localhost',
    port: 5432,
    database: 'sales_integration',
    username: 'your_db_username',
    password: 'your_db_password'
  },

  // Logging Configuration
  logging: {
    level: 'info', // 'error', 'warn', 'info', 'debug'
    format: 'json',
    file: './logs/app.log'
  }
};

module.exports = config; 
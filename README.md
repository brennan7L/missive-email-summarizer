# Missive Email Thread Summarizer

An AI-powered iFrame integration for Missive that provides intelligent summaries of email conversations using OpenAI's GPT models.

## Features

- 🤖 **AI-Powered Analysis**: Uses OpenAI to analyze email threads and extract key information
- 📊 **Smart Categorization**: Automatically organizes summaries into categories (Action Items, Decisions, Deadlines, etc.)
- 🎯 **Customer Questions Focus**: Specifically highlights questions and requests from customers
- 📱 **Responsive Design**: Works seamlessly in Missive's sidebar across all themes
- ⚡ **Real-time Updates**: Automatically updates when you select different conversations
- 🎨 **Native Styling**: Uses Missive's official stylesheet for consistent look and feel

## Quick Start

### 1. Deploy to Hosting Platform

#### Netlify (Recommended for Environment Variables)
1. Fork or download this repository
2. Connect your GitHub repository to [Netlify](https://netlify.com)
3. **Set environment variables in Netlify dashboard:**
   - Go to Site Settings → Environment Variables
   - Add `OPEN_AI_API` with your OpenAI API key value
   - Add `MISSIVE_API_TOKEN` with your Missive API token
4. Deploy with default settings
5. Your app will be available at `https://your-app.netlify.app`

### 2. OpenAI API Key Setup

🔐 **SECURE SERVER-SIDE ARCHITECTURE**: API keys are now handled completely server-side for maximum security.

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. **Set in Netlify Environment Variables:**
   - Go to Site Settings → Environment Variables
   - Add `OPEN_AI_API` with your API key value
   - **API key stays secure on the server** - never exposed to browsers

### 3. Set Up in Missive

1. Open Missive
2. Go to Integrations → Add Integration → iFrame
3. **Add your integration URL (no API key needed):**
   ```
   https://magiceye.netlify.app
   ```
4. Set the integration to appear in the sidebar
5. Save the integration

**That's it!** No API keys in URLs, no security risks.

## Environment Variables

The integration supports the following environment variables for secure configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPEN_AI_API` | OpenAI API key for AI analysis | Yes |
| `MISSIVE_API_TOKEN` | Missive API token for task assignment | Yes |
| `MISSIVE_API_BASE_URL` | Missive API base URL | No (defaults to `https://public.missiveapp.com`) |
| `MISSIVE_DEBUG_MODE` | Enable debug logging | No (defaults to `false`) |
| `MISSIVE_AUTO_ASSIGN` | Auto-assign tasks to current user | No (defaults to `true`) |

## Configuration Methods

### Environment Variables vs URL Parameters

The integration now supports two methods for configuration:

1. **Environment Variables (Recommended)**: More secure, API keys not visible in URLs
2. **URL Parameters (Legacy)**: For backward compatibility

### URL Parameters (Legacy)

- `openai_key` or `api_key`: Your OpenAI API key
- `debug`: Enable debug mode (`true`/`false`)

## Security Notes

🔐 **SECURE SERVER-SIDE ARCHITECTURE**: 
- **API keys are handled completely server-side** via Netlify serverless functions
- **Zero client-side API key exposure** - keys never leave the secure server environment
- **No API keys in URLs, config files, or browser code** - maximum security
- **Secure proxy architecture** - client calls server function, server calls OpenAI API
- All communication happens over HTTPS when properly deployed
- Email content is processed securely through our server-side proxy
- **Previous versions exposed API keys publicly** - ensure you revoke any previously exposed keys

## Migration Guide

### 🚨 CRITICAL SECURITY UPDATE → FULLY SECURE

**Previous versions exposed API keys in public files - NOW COMPLETELY SECURE:**

1. **REVOKE exposed API keys immediately:**
   - OpenAI: Go to [API Keys](https://platform.openai.com/api-keys) → Revoke current key
   - Missive: Go to Settings → API → Revoke current token

2. **Generate new API keys:**
   - Create new OpenAI API key
   - Create new Missive API token

3. **Set up secure server-side configuration:**
   - Go to Netlify Site Settings → Environment Variables
   - Add `OPEN_AI_API` with your new OpenAI API key
   - Add `MISSIVE_API_TOKEN` with your new Missive API token

4. **Update your Missive integration URL (clean & secure):**
   - **New secure URL:** `https://magiceye.netlify.app`
   - **No API keys in URL** - completely secure!

5. **Deploy the secure version** - API keys are now 100% server-side protected

## License

MIT License 
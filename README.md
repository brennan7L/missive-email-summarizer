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

#### Option A: Environment Variable (Recommended - Secure)
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. **Set in Netlify:**
   - Go to Site Settings → Environment Variables
   - Add `OPEN_AI_API` with your API key value

#### Option B: URL Parameter (Legacy - Less Secure)
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to URL: `https://magiceye.netlify.app?openai_key=your_key_here`

### 3. Set Up in Missive

1. Open Missive
2. Go to Integrations → Add Integration → iFrame
3. **If using environment variables (recommended):**
   ```
   https://magiceye.netlify.app
   ```
4. **If using URL parameters:**
   ```
   https://magiceye.netlify.app?openai_key=your_openai_api_key_here
   ```
5. Set the integration to appear in the sidebar
6. Save the integration

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

- **Environment Variables**: API keys are securely stored in your hosting platform and not exposed in URLs
- **URL Parameters**: For backward compatibility but less secure (keys visible in browser history)
- All communication happens over HTTPS when properly deployed
- Email content is sent to OpenAI's API for processing

## Migration Guide

### From URL Parameters to Environment Variables

If you're currently using URL parameters for your API keys, here's how to migrate:

1. **Set environment variables** in Netlify:
   - Go to Site Settings → Environment Variables
   - Add `OPEN_AI_API` with your OpenAI API key

2. **Update your Missive integration URL** to remove the API key:
   - **Old**: `https://magiceye.netlify.app?openai_key=sk-...`
   - **New**: `https://magiceye.netlify.app`

3. **Redeploy** your application to pick up the environment variables

4. **Test** that everything still works - the integration will automatically use environment variables when available

## License

MIT License 
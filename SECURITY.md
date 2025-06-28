# 🔐 Security Guide: API Token Storage

This guide explains how to securely store your Missive API token for proper task assignment functionality.

## 🚨 **Security Warning**

**NEVER commit API tokens to version control!** API tokens are sensitive credentials that can access your Missive data.

## 🎯 **Quick Setup (Recommended)**

### **Option 1: Configuration File (Easiest)**

1. **Copy the example config:**
   ```bash
   cp config.example.js config.js
   ```

2. **Get your Missive API token:**
   - Go to **Missive Settings** → **API** → **Create a new token**
   - Copy the token (starts with `missive_pat-`)

3. **Edit `config.js`:**
   ```javascript
   window.MissiveConfig = {
       apiToken: 'missive_pat-your_actual_token_here', // Replace this
       apiBaseUrl: 'https://public.missiveapp.com',
       debugMode: true
   };
   ```

4. **The `config.js` file is automatically ignored by git** ✅

## 🔧 **All Security Options**

### **Option 2: Environment Variables (Build Process)**

If you're using a build tool (Webpack, Vite, etc.):

1. **Create `.env` file:**
   ```bash
   # .env (automatically ignored by git)
   MISSIVE_API_TOKEN=missive_pat-your_actual_token_here
   ```

2. **Update `config.js` to use environment variables:**
   ```javascript
   window.MissiveConfig = {
       apiToken: process.env.MISSIVE_API_TOKEN,
       apiBaseUrl: process.env.MISSIVE_API_BASE_URL || 'https://public.missiveapp.com'
   };
   ```

### **Option 3: Server-Side Proxy (Most Secure)**

For production applications, use a server-side proxy:

1. **Store token on your server** (environment variables)
2. **Create an API proxy** that forwards requests to Missive
3. **Use your proxy URL** instead of direct Missive API calls

```javascript
// Example proxy endpoint
const response = await fetch('/api/missive-proxy/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
});
```

### **Option 4: Encrypted Storage (Advanced)**

For browser-based apps with encryption:

```javascript
// Example using a simple encryption library
import CryptoJS from 'crypto-js';

// Store encrypted
const encryptedToken = CryptoJS.AES.encrypt(apiToken, secretKey).toString();
localStorage.setItem('missive_token_encrypted', encryptedToken);

// Retrieve and decrypt
const encrypted = localStorage.getItem('missive_token_encrypted');
const decrypted = CryptoJS.AES.decrypt(encrypted, secretKey).toString(CryptoJS.enc.Utf8);
```

## 🏗️ **Deployment Scenarios**

### **Development**
- ✅ Use `config.js` (ignored by git)
- ✅ Use environment variables
- ❌ Never hardcode in source

### **Static Site Hosting (Netlify, Vercel, etc.)**
- ✅ Use environment variables in build process
- ✅ Use server-side proxy if available
- ⚠️ Client-side tokens are visible to users

### **Production Web App**
- ✅ Server-side proxy (recommended)
- ✅ Environment variables on server
- ✅ Encrypted storage with user authentication
- ❌ Never expose tokens in client-side code

### **Browser Extension**
- ✅ Use extension's secure storage APIs
- ✅ Manifest permissions for external API access
- ⚠️ Follow extension store security guidelines

## 🔍 **Token Security Best Practices**

### **✅ Do**
- Store tokens in ignored files (`config.js`, `.env`)
- Use environment variables for production
- Implement server-side proxies when possible
- Rotate tokens regularly
- Use least-privilege tokens (minimal permissions)
- Monitor token usage

### **❌ Don't**
- Commit tokens to version control
- Hardcode tokens in source code
- Share tokens in chat/email
- Use tokens with excessive permissions
- Store tokens in public locations

## 🚨 **If Your Token Is Compromised**

1. **Immediately revoke the token** in Missive Settings → API
2. **Generate a new token**
3. **Update your configuration**
4. **Review access logs** if available
5. **Consider rotating related credentials**

## 🛠️ **Troubleshooting**

### **Token Not Working**
```bash
# Check if config.js exists and is loaded
ls -la config.js

# Check console for token source
# Should show: "🔑 Using API token from: MissiveConfig (config.js)"
```

### **Permission Denied**
- Verify you're on a **Productive plan** (required for API access)
- Check token permissions in Missive Settings
- Ensure token hasn't expired

### **CORS Issues**
- API calls from browser may face CORS restrictions
- Consider using a server-side proxy
- Verify the API endpoint supports browser requests

## 📞 **Need Help?**

- Check the browser console for detailed error messages
- Verify your setup with the troubleshooting steps above
- Review Missive's API documentation for token requirements 

🔑 Using API token from: Environment Variables (Netlify) 
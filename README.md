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

#### Vercel (Recommended)
1. Fork or download this repository
2. Connect your GitHub repository to [Vercel](https://vercel.com)
3. Deploy with default settings
4. Your app will be available at `https://your-app.vercel.app`

#### Netlify
1. Fork or download this repository
2. Drag and drop your project folder to [Netlify](https://netlify.com)
3. Your app will be available at `https://your-app.netlify.app`

#### Replit
1. Import this repository to [Replit](https://replit.com)
2. Run the project
3. Your app will be available at your Replit URL

### 2. Configure API Token for Task Assignment (Required)

**Important**: To enable proper task assignment (assigning tasks to users), you need to configure a Missive API token:

#### Option 1: Quick Setup Script (Recommended)
```bash
./setup.sh
```

#### Option 2: Manual Setup
1. **Copy the config template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Get your Missive API token:**
   - Go to **Missive Settings** → **API** → **Create a new token**
   - Copy the token (starts with `missive_pat-`)

3. **Edit `config.js` with your token:**
   ```javascript
   window.MissiveConfig = {
       apiToken: 'missive_pat-your_actual_token_here', // Replace this
       apiBaseUrl: 'https://public.missiveapp.com',
       debugMode: true
   };
   ```

4. **Security**: `config.js` is automatically ignored by git for security ✅

📚 **For more security options, see [SECURITY.md](SECURITY.md)**

### 3. Get OpenAI API Key

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (you'll need it for the URL)

### 4. Set Up in Missive

1. Open Missive
2. Go to Integrations → Add Integration → iFrame
3. Enter your integration URL with the API key:
   ```
   https://your-app.vercel.app?openai_key=your_openai_api_key_here
   ```
4. Set the integration to appear in the sidebar
5. Save the integration

## Usage

1. **Select a Conversation**: Click on any email conversation in Missive
2. **Wait for Analysis**: The integration will automatically fetch the conversation data and analyze it with AI
3. **Review Summary**: View the organized summary with collapsible sections
4. **Expand/Collapse**: Click on section headers to expand or collapse different categories

## File Structure

```
missive-integration/
├── index.html          # Main HTML structure
├── script.js           # JavaScript logic and API integration
├── styles.css          # Custom CSS styles
├── package.json        # Project configuration
└── README.md          # This file
```

## Configuration

### URL Parameters

- `openai_key` or `api_key`: Your OpenAI API key (required)

Example:
```
https://your-app.vercel.app?openai_key=sk-...
```

### OpenAI Model

The integration uses `gpt-4o-mini` by default for cost-effectiveness. You can modify this in `script.js`:

```javascript
model: 'gpt-4o-mini', // Change to 'gpt-4' for higher quality (more expensive)
```

## Customization

### Modifying the AI Prompt

Edit the prompt in `script.js` in the `generateSummary` method to change how the AI analyzes emails:

```javascript
const prompt = `Your custom prompt here...`;
```

### Styling

- The integration uses Missive's official stylesheet for consistent theming
- Add custom styles in `styles.css`
- Modify section colors, spacing, or layout as needed

### Categories

The integration automatically detects common business categories. To add custom categories, modify the `isSectionHeader` method in `script.js`:

```javascript
const headerPatterns = [
    /^(your custom category|another category)/i,
    // ... existing patterns
];
```

## Security Notes

- The OpenAI API key is passed via URL parameter for simplicity
- For production use, consider implementing server-side API key management
- All communication happens over HTTPS when properly deployed
- Email content is sent to OpenAI's API for processing

## Troubleshooting

### Common Issues

1. **"Missive API not available"**
   - Make sure the integration is running inside Missive's iFrame
   - Check that you've properly configured the integration in Missive

2. **"OpenAI API key not found"**
   - Ensure the API key is included in the URL: `?openai_key=your_key`
   - Verify the API key is valid and has sufficient credits

3. **"No conversation data found"**
   - Make sure you have selected exactly one conversation
   - Check that the conversation contains email messages

4. **Loading issues**
   - Verify your hosting platform supports HTTPS
   - Check browser console for JavaScript errors

5. **"Tasks are created but not assigned to me"**
   - Ensure you've configured your Missive API token (see step 2 above)
   - Check console for: `🔑 Using API token from: MissiveConfig (config.js)`
   - Run `debugAssignmentTest()` in console to test assignment
   - Verify you're on Missive's Productive plan (required for API access)

### Debug Mode

Add `?debug=true` to your URL to enable console logging:
```
https://your-app.vercel.app?openai_key=your_key&debug=true
```

## 🔧 Debugging User Matching

If tasks aren't being assigned to the right team members, you can debug the user matching system:

### Check Available Users
Open your browser's Developer Console (F12) and run:
```javascript
debugMissiveUsers()
```

### Test Name Matching
Test if a specific name will be matched correctly:
```javascript
testUserMapping("Brennan O'Dowd")  // Test full name
testUserMapping("Brennan")         // Test first name  
testUserMapping("rusty nelson")    // Test lowercase
```

### Test Task Assignment
If tasks aren't being assigned correctly, run these tests:
```javascript
testBrennanAssignment()    // Test Brennan's assignment specifically
debugTaskButtons()         // Check all task buttons and their data
debugMissiveUsers()        // See all available Missive users
```

### Debug Task Creation Issues
If clicking "Add Task" doesn't work:
1. **Open Console** (F12) and click "Add Task" 
2. **Look for errors** in the console output
3. **Check task button data** with `debugTaskButtons()`
4. **Test user mapping** with `testUserMapping("Brennan O'Dowd")`

This will show a table of all available Missive users with their:
- ID
- Display Name
- Full Name (First + Last)
- First Name
- Last Name  
- Email

### User Matching Logic
The integration matches names using these patterns (case-insensitive):
- Display name contains the assignee name
- Full name contains the assignee name
- First name exactly matches the assignee name

### Example Output
```
🔍 Fetching Missive users...
📋 Found 5 Missive users:
┌─────────┬─────┬──────────────┬─────────────────┬────────────┬───────────┬──────────────────────┐
│ (index) │ ID  │ Display Name │   Full Name     │ First Name │ Last Name │        Email         │
├─────────┼─────┼──────────────┼─────────────────┼────────────┼───────────┼──────────────────────┤
│    0    │ 123 │ 'John Smith' │ 'John Smith'    │   'John'   │  'Smith'  │ 'john@company.com'   │
│    1    │ 456 │ 'Jane Doe'   │ 'Jane Doe'      │   'Jane'   │   'Doe'   │ 'jane@company.com'   │
└─────────┴─────┴──────────────┴─────────────────┴────────────┴───────────┴──────────────────────┘
```

## Development

### Local Development

1. Clone the repository
2. Start a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```
3. Access via `http://localhost:8000?openai_key=your_key`

### Testing

For local testing without Missive:
1. Comment out the Missive API check in `script.js`
2. Add mock conversation data for testing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Create an issue on GitHub with detailed information

---

**Note**: This integration requires an active OpenAI API key and will incur costs based on usage. Monitor your OpenAI usage dashboard to track costs. 
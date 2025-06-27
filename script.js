/**
 * Missive Email Thread Summarizer Integration
 * Provides AI-powered summaries of email conversations
 */

class EmailSummarizer {
    constructor() {
        console.log('EmailSummarizer: Starting initialization...');
        this.currentConversationId = null;
        this.initializeElements();
        this.openaiApiKey = this.extractApiKey();
        this.initializeMissiveAPI();
        console.log('EmailSummarizer: Initialization complete');
    }

    /**
     * Initialize Missive API integration using the official JavaScript API
     */
    initializeMissiveAPI() {
        console.log('Initializing Missive API integration...');
        
        // Check if Missive API is available
        if (typeof Missive === 'undefined') {
            console.error('Missive API not available - make sure missive.js is loaded');
            this.showError('Missive API not available. Please ensure this integration is running inside Missive.');
            return;
        }

        // Set up conversation change listener
        Missive.on('change:conversations', (conversationIds) => {
            console.log('Conversations changed:', conversationIds);
            this.handleConversationChange(conversationIds);
        });

        console.log('Missive API integration initialized successfully');
        this.showEmptyState();
    }

    /**
     * Handle conversation selection changes using Missive API
     */
    async handleConversationChange(conversationIds) {
        try {
            console.log('handleConversationChange called with:', conversationIds);
            
            // Check if exactly one conversation is selected
            if (!conversationIds || conversationIds.length === 0) {
                console.log('No conversations selected, showing empty state');
                this.showEmptyState();
                return;
            }

            if (conversationIds.length > 1) {
                console.log('Multiple conversations selected:', conversationIds.length);
                this.showError('Please select only one conversation at a time.');
                return;
            }

            const conversationId = conversationIds[0];
            console.log('Processing conversation ID:', conversationId);
            
            // Avoid re-processing the same conversation
            if (this.currentConversationId === conversationId) {
                console.log('Same conversation already processed, skipping');
                return;
            }

            this.currentConversationId = conversationId;
            
            // Show loading state
            this.showLoading();
            
            // Fetch conversation data using Missive API
            console.log('Fetching conversation data from Missive API...');
            const conversations = await Missive.fetchConversations([conversationId]);
            
            if (!conversations || conversations.length === 0) {
                this.showError('No conversation data found.');
                return;
            }

            const conversation = conversations[0];
            console.log('Retrieved conversation data:', conversation);
            
            // Process the conversation
            await this.processConversation(conversation);

        } catch (error) {
            console.error('Error handling conversation change:', error);
            this.showError('Failed to process conversation selection.');
        }
    }

    /**
     * Process the fetched conversation data
     */
    async processConversation(conversation) {
        try {
            console.log('Processing conversation data...');

            const emailThread = this.extractEmailThread(conversation);
            
            if (!emailThread || emailThread.length === 0) {
                this.showError('No email messages found in this conversation.');
                return;
            }

            // Generate summary using OpenAI
            const summary = await this.generateSummary(emailThread);
            this.displaySummary(summary);

        } catch (error) {
            console.error('Error processing conversation:', error);
            this.showError('Failed to analyze conversation. Please try again.');
        }
    }

    /**
     * Extract OpenAI API key from URL parameters
     */
    extractApiKey() {
        const urlParams = new URLSearchParams(window.location.search);
        const apiKey = urlParams.get('openai_key') || urlParams.get('api_key');
        
        console.log('API Key check:', apiKey ? 'Found API key' : 'No API key found');
        
        if (!apiKey) {
            this.showError('OpenAI API key not found in URL parameters. Please add ?openai_key=your_key_here to the URL.');
            return null;
        }
        
        return apiKey;
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            emptyState: document.getElementById('empty-state'),
            errorState: document.getElementById('error-state'),
            errorMessage: document.getElementById('error-message'),
            summaryContent: document.getElementById('summary-content'),
            summarySection: document.querySelector('.summary-sections')
        };
    }



    /**
     * Extract email thread from conversation data (Missive API format)
     */
    extractEmailThread(conversation) {
        try {
            console.log('Extracting email thread from conversation:', conversation);
            
            const messages = conversation.messages || [];
            
            // Filter out messages without content and sort by date (oldest first for context)
            const emailMessages = messages
                .filter(msg => msg.body && msg.body.trim() && msg.from_field) // Only email messages with content and sender
                .sort((a, b) => (a.delivered_at || 0) - (b.delivered_at || 0)); // Oldest first for context

            console.log(`Found ${emailMessages.length} email messages to process`);

            return emailMessages.map(msg => ({
                sender: this.extractSenderName(msg),
                date: this.formatDate(msg.delivered_at),
                subject: msg.subject || 'No Subject',
                body: this.cleanEmailBody(msg.body)
            }));

        } catch (error) {
            console.error('Error extracting email thread:', error);
            return [];
        }
    }

    /**
     * Extract sender name from message
     */
    extractSenderName(message) {
        if (message.from_field && message.from_field.address) {
            return message.from_field.name || message.from_field.address;
        }
        return 'Unknown Sender';
    }

    /**
     * Format date for display (handles Missive Unix timestamps)
     */
    formatDate(timestamp) {
        try {
            // Missive uses Unix timestamps in seconds
            const date = new Date(timestamp * 1000);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'Timestamp:', timestamp);
            return 'Unknown Date';
        }
    }

    /**
     * Clean email body content
     */
    cleanEmailBody(body) {
        if (!body) return '';
        
        // Remove HTML tags and decode entities
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = body;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // Clean up extra whitespace
        return textContent.replace(/\s+/g, ' ').trim();
    }

    /**
     * Generate summary using OpenAI API
     */
    async generateSummary(emailThread) {
        if (!this.openaiApiKey) {
            throw new Error('OpenAI API key not available');
        }

        // Prepare the email thread text
        const threadText = emailThread.map(msg => 
            `From: ${msg.sender}\nDate: ${msg.date}\n\n${msg.body}\n\n---\n`
        ).join('\n');

        const prompt = `Act as a professional business communication analyst.
Read the following email thread and extract the key points, decisions, action items, deadlines, and important context. Summarize them in a concise bullet-point format, grouped by category if needed (e.g., Action Items, Key Decisions, Deadlines, Open Questions, etc.).

Ensure that your summary:
• Omits unnecessary conversational or filler content
• Retains the intent and tone of any important statements
• Highlights who is responsible for each action (when mentioned)
• Uses clear and neutral business language

Here's the email thread:

${threadText}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No summary generated';
    }

    /**
     * Display the generated summary with collapsible sections
     */
    displaySummary(summaryText) {
        try {
            const sections = this.parseSummaryIntoSections(summaryText);
            this.elements.summarySection.innerHTML = '';

            if (sections.length === 0) {
                // If no sections found, display as single block
                sections.push({
                    title: 'Summary',
                    content: summaryText
                });
            }

            sections.forEach((section, index) => {
                const sectionElement = this.createCollapsibleSection(section.title, section.content, index === 0);
                this.elements.summarySection.appendChild(sectionElement);
            });

            this.showSummary();

        } catch (error) {
            console.error('Error displaying summary:', error);
            this.showError('Failed to display summary.');
        }
    }

    /**
     * Parse summary text into sections
     */
    parseSummaryIntoSections(text) {
        const sections = [];
        const lines = text.split('\n');
        let currentSection = null;
        let currentContent = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if this line looks like a section header
            if (this.isSectionHeader(trimmedLine)) {
                // Save previous section
                if (currentSection) {
                    sections.push({
                        title: currentSection,
                        content: currentContent.join('\n').trim()
                    });
                }
                
                // Start new section
                currentSection = trimmedLine.replace(/[:#]/g, '').trim();
                currentContent = [];
            } else if (trimmedLine && currentSection) {
                currentContent.push(line);
            } else if (trimmedLine && !currentSection) {
                // Content before any section headers
                if (!sections.length) {
                    sections.push({
                        title: 'Summary',
                        content: ''
                    });
                }
                if (sections.length > 0) {
                    sections[0].content += line + '\n';
                }
            }
        }

        // Add final section
        if (currentSection) {
            sections.push({
                title: currentSection,
                content: currentContent.join('\n').trim()
            });
        }

        return sections.filter(section => section.content.trim());
    }

    /**
     * Check if a line is a section header
     */
    isSectionHeader(line) {
        const headerPatterns = [
            /^(action items?|key decisions?|deadlines?|open questions?|important context|summary|overview|next steps?|follow.?up)/i,
            /^[a-z\s]+:$/i,
            /^#+\s+/,
            /^\*\*[^*]+\*\*$/
        ];
        
        return headerPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Create a collapsible section element
     */
    createCollapsibleSection(title, content, isExpanded = false) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'summary-section';

        const headerDiv = document.createElement('div');
        headerDiv.className = `section-header ${isExpanded ? '' : 'collapsed'}`;
        headerDiv.innerHTML = `
            <span>${title}</span>
            <span class="toggle-icon">▼</span>
        `;

        const contentDiv = document.createElement('div');
        contentDiv.className = `section-content ${isExpanded ? '' : 'collapsed'}`;
        
        // Convert content to HTML with bullet points
        const formattedContent = this.formatContentAsHTML(content);
        contentDiv.innerHTML = formattedContent;

        // Add click handler for collapse/expand
        headerDiv.addEventListener('click', () => {
            const isCurrentlyCollapsed = headerDiv.classList.contains('collapsed');
            
            if (isCurrentlyCollapsed) {
                headerDiv.classList.remove('collapsed');
                contentDiv.classList.remove('collapsed');
            } else {
                headerDiv.classList.add('collapsed');
                contentDiv.classList.add('collapsed');
            }
        });

        sectionDiv.appendChild(headerDiv);
        sectionDiv.appendChild(contentDiv);

        return sectionDiv;
    }

    /**
     * Format content as HTML with proper bullet points
     */
    formatContentAsHTML(content) {
        const lines = content.split('\n').filter(line => line.trim());
        let html = '<ul>';
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                // Remove existing bullet points and format
                const cleanLine = trimmedLine.replace(/^[•\-\*]\s*/, '');
                html += `<li>${this.escapeHtml(cleanLine)}</li>`;
            }
        }
        
        html += '</ul>';
        return html;
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.hideAllStates();
        this.elements.loading.style.display = 'block';
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.hideAllStates();
        this.elements.emptyState.style.display = 'block';
        this.currentConversationId = null;
        
        // Add manual test option
        if (!this.elements.emptyState.querySelector('.manual-test-button')) {
            const testButton = document.createElement('button');
            testButton.className = 'manual-test-button';
            testButton.textContent = 'Test Integration (Manual Demo)';
            testButton.style.marginTop = '10px';
            testButton.style.padding = '8px 16px';
            testButton.style.backgroundColor = '#007bff';
            testButton.style.color = 'white';
            testButton.style.border = 'none';
            testButton.style.borderRadius = '4px';
            testButton.style.cursor = 'pointer';
            
            testButton.addEventListener('click', () => {
                console.log('Manual test triggered from empty state');
                this.testManualSummary();
            });
            
            this.elements.emptyState.appendChild(testButton);
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        this.hideAllStates();
        this.elements.errorMessage.textContent = message;
        this.elements.errorState.style.display = 'block';
    }

    /**
     * Show summary content
     */
    showSummary() {
        this.hideAllStates();
        this.elements.summaryContent.style.display = 'block';
    }

    /**
     * Hide all UI states
     */
    hideAllStates() {
        this.elements.loading.style.display = 'none';
        this.elements.emptyState.style.display = 'none';
        this.elements.errorState.style.display = 'none';
        this.elements.summaryContent.style.display = 'none';
    }

    /**
     * Test manual summary generation (for debugging)
     */
    async testManualSummary() {
        if (!this.openaiApiKey) {
            this.showError('OpenAI API key required for testing.');
            return;
        }

        console.log('Testing manual summary generation...');
        this.showLoading();

        // Create mock email thread data
        const mockEmailThread = [
            {
                sender: 'John Customer',
                date: 'Jun 27, 2025, 2:30 PM',
                body: 'Hi, I need help with setting up the new integration. Can you provide step-by-step instructions? Also, what are the pricing options available? When can we schedule a demo call?'
            },
            {
                sender: 'Support Team',
                date: 'Jun 27, 2025, 3:15 PM', 
                body: 'Thank you for reaching out! I\'ll be happy to help you with the integration setup. Here are the step-by-step instructions: 1) First, create an account 2) Generate your API key 3) Configure the webhook endpoints. Regarding pricing, we have three tiers: Basic ($29/month), Pro ($99/month), and Enterprise (custom pricing). I can schedule a demo call for tomorrow at 2 PM if that works for you.'
            },
            {
                sender: 'John Customer',
                date: 'Jun 27, 2025, 4:00 PM',
                body: 'Perfect! Yes, tomorrow at 2 PM works great. One more question - do you support SSO authentication? And what\'s the maximum API rate limit for the Pro plan?'
            }
        ];

        try {
            const summary = await this.generateSummary(mockEmailThread);
            this.displaySummary(summary);
            console.log('Manual test completed successfully!');
        } catch (error) {
            console.error('Manual test failed:', error);
            this.showError(`Manual test failed: ${error.message}`);
        }
    }
}

// Initialize the integration when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EmailSummarizer();
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
}); 
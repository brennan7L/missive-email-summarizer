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
        this.initializeMissiveIntegration();
        console.log('EmailSummarizer: Initialization complete');
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
     * Initialize Missive API integration
     */
    initializeMissiveIntegration() {
        console.log('Checking for Missive API...');
        console.log('typeof Missive:', typeof Missive);
        console.log('window.Missive:', window.Missive);
        
        if (typeof Missive === 'undefined') {
            console.error('Missive API not available');
            this.showError('Missive API not available. Make sure this is running within a Missive iFrame.');
            return;
        }

        console.log('Missive API found, setting up listeners...');
        
        // Listen for conversation changes
        Missive.on('change:conversations', (conversations) => {
            console.log('Conversation change detected:', conversations);
            this.handleConversationChange(conversations);
        });

        console.log('Missive integration initialized successfully');
    }

    /**
     * Handle conversation selection changes
     */
    async handleConversationChange(conversations) {
        try {
            console.log('handleConversationChange called with:', conversations);
            
            // Check if exactly one conversation is selected
            if (!conversations || conversations.length === 0) {
                console.log('No conversations selected, showing empty state');
                this.showEmptyState();
                return;
            }

            if (conversations.length > 1) {
                console.log('Multiple conversations selected:', conversations.length);
                this.showError('Please select only one conversation at a time.');
                return;
            }

            const conversationId = conversations[0];
            console.log('Processing conversation ID:', conversationId);
            
            // Avoid re-processing the same conversation
            if (this.currentConversationId === conversationId) {
                console.log('Same conversation already processed, skipping');
                return;
            }

            this.currentConversationId = conversationId;
            console.log('Starting conversation processing...');
            await this.processConversation(conversationId);

        } catch (error) {
            console.error('Error handling conversation change:', error);
            this.showError('Failed to process conversation selection.');
        }
    }

    /**
     * Process the selected conversation
     */
    async processConversation(conversationId) {
        try {
            this.showLoading();

            // Fetch conversation data from Missive
            const conversations = await Missive.fetchConversations([conversationId]);
            
            if (!conversations || conversations.length === 0) {
                this.showError('No conversation data found.');
                return;
            }

            const conversation = conversations[0];
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
     * Extract email thread from conversation data
     */
    extractEmailThread(conversation) {
        try {
            const messages = conversation.messages || [];
            
            // Sort messages by date (newest first for priority, but we'll reverse for context)
            const sortedMessages = messages
                .filter(msg => msg.body && msg.body.trim()) // Only messages with content
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Oldest first for context

            return sortedMessages.map(msg => ({
                sender: this.extractSenderName(msg),
                date: this.formatDate(msg.created_at),
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
     * Format date for display
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
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
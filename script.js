/**
 * Missive Email Thread Summarizer Integration
 * Provides AI-powered summaries of email conversations
 */

class EmailSummarizer {
    constructor() {
        console.log('EmailSummarizer: Starting initialization...');
        this.currentConversationId = null;
        this.currentConversation = null;
        this.loadingInterval = null;
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
            // Give it a moment to load, then try again
            setTimeout(() => {
                if (typeof Missive === 'undefined') {
                    this.showError('Missive API not available. Please ensure this integration is running inside Missive.');
                } else {
                    this.initializeMissiveAPI();
                }
            }, 2000);
            return;
        }

        try {
            // Set up conversation change listener
            Missive.on('change:conversations', (conversationIds) => {
                console.log('Conversations changed:', conversationIds);
                this.handleConversationChange(conversationIds);
            });

            console.log('Missive API integration initialized successfully');
            this.showEmptyState();
        } catch (error) {
            console.error('Error initializing Missive API:', error);
            this.showError('Failed to initialize Missive integration. Please refresh and try again.');
        }
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
                this.currentConversation = null;
                this.currentConversationId = null;
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
                console.log('Same conversation already loaded, showing ready state');
                this.showReadyToSummarize();
                return;
            }

            this.currentConversationId = conversationId;
            
            // Show loading state while fetching conversation data
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
            
            // Store conversation data and show ready state
            this.currentConversation = conversation;
            this.showReadyToSummarize();

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
            
            // Show loading animation immediately
            this.showLoading();

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
     * Extract OpenAI API key from environment variables or URL parameters
     */
    extractApiKey() {
        // First check environment variable from config
        if (window.MissiveConfig && window.MissiveConfig.openaiApiKey) {
            console.log('API Key check: Found API key from environment variable');
            return window.MissiveConfig.openaiApiKey;
        }
        
        // Fallback to URL parameters for backward compatibility
        const urlParams = new URLSearchParams(window.location.search);
        const apiKey = urlParams.get('openai_key') || urlParams.get('api_key');
        
        if (apiKey) {
            console.log('API Key check: Found API key from URL parameters');
            return apiKey;
        }
        
        console.log('API Key check: No API key found');
        this.showError('OpenAI API key not found. Please set the OPEN_AI_API environment variable in Netlify or add ?openai_key=your_key_here to the URL.');
        return null;
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            emptyState: document.getElementById('empty-state'),
            readyState: document.getElementById('ready-state'),
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

FIRST, analyze the tone of the following email thread and classify it into one of these categories:
Happy, Satisfied, Neutral, Frustrated, or Angry.

Also provide a confidence score from 1-100 indicating how certain you are about this tone classification. Use these guidelines for confidence scoring:
• 90-100: Very clear emotional indicators, explicit language, multiple confirming signals
• 80-89: Strong indicators with some ambiguity or mixed signals
• 70-79: Moderate indicators, some uncertainty due to professional language masking emotions
• 60-69: Weak indicators, mostly neutral with subtle hints
• 50-59: Very ambiguous, could be interpreted multiple ways
• Below 50: Insufficient information or contradictory signals

Start your response with: "TONE: [category] | CONFIDENCE: [score]"

THEN, read the email thread and extract the key points, decisions, action items, deadlines, and important context. Summarize them in a concise bullet-point format, grouped by category if needed (e.g., Action Items, Key Decisions, Deadlines, Open Questions, etc.).

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
     * Display the generated summary with collapsible sections and tone analysis
     */
    displaySummary(summaryText) {
        try {
            // Extract tone and confidence from the summary text
            const { tone, confidence, cleanedSummary } = this.extractTone(summaryText);
            
            // Display tone gauge with confidence
            this.displayToneGauge(tone, confidence);
            
            // Parse and display summary sections
            const sections = this.parseSummaryIntoSections(cleanedSummary);
            this.elements.summarySection.innerHTML = '';

            if (sections.length === 0) {
                // If no sections found, display as single block
                sections.push({
                    title: 'Summary',
                    content: cleanedSummary
                });
            }

            sections.forEach((section, index) => {
                const sectionElement = this.createCollapsibleSection(section.title, section.content, index === 0);
                this.elements.summarySection.appendChild(sectionElement);
            });

            // Set up expand/collapse all controls
            this.setupSummaryControls();

            this.showSummary();

        } catch (error) {
            console.error('Error displaying summary:', error);
            this.showError('Failed to display summary.');
        }
    }

    /**
     * Extract tone and confidence from AI response and return cleaned summary
     */
    extractTone(summaryText) {
        // Log the raw AI response for debugging
        console.log('Raw AI response (first 200 chars):', summaryText.substring(0, 200));
        
        // Look for TONE: [category] | CONFIDENCE: [score] at the beginning of the response
        const toneMatch = summaryText.match(/^TONE:\s*(Happy|Satisfied|Neutral|Frustrated|Angry)\s*\|\s*CONFIDENCE:\s*(\d+)/i);
        
        if (toneMatch) {
            const tone = toneMatch[1];
            const confidence = parseInt(toneMatch[2]);
            console.log(`Tone analysis: ${tone}, Confidence: ${confidence}%`);
            // Remove the tone line from the summary
            const cleanedSummary = summaryText.replace(/^TONE:\s*\w+\s*\|\s*CONFIDENCE:\s*\d+\s*\n?/i, '').trim();
            return { tone, confidence, cleanedSummary };
        }
        
        // Fallback: try old format without confidence
        const simpleToneMatch = summaryText.match(/^TONE:\s*(Happy|Satisfied|Neutral|Frustrated|Angry)/i);
        if (simpleToneMatch) {
            const tone = simpleToneMatch[1];
            const cleanedSummary = summaryText.replace(/^TONE:\s*\w+\s*\n?/i, '').trim();
            console.log(`Tone analysis (fallback): ${tone}, using default confidence: 75%`);
            return { tone, confidence: 75, cleanedSummary }; // Default confidence
        }
        
        // Default to Neutral if no tone found
        console.log('No tone found in response, using default: Neutral, 50%');
        return { tone: 'Neutral', confidence: 50, cleanedSummary: summaryText };
    }

    /**
     * Display the tone gauge above the summary controls
     */
    displayToneGauge(tone, confidence = 75) {
        // Remove existing tone gauge if present
        const existingGauge = document.querySelector('.tone-gauge-container');
        if (existingGauge) {
            existingGauge.remove();
        }

        // Create tone gauge container
        const gaugeContainer = document.createElement('div');
        gaugeContainer.className = 'tone-gauge-container';
        gaugeContainer.innerHTML = this.createToneGaugeHTML(tone, confidence);

        // Insert before the summary controls
        const summaryControls = document.querySelector('.summary-controls');
        if (summaryControls) {
            summaryControls.parentNode.insertBefore(gaugeContainer, summaryControls);
        }
        
        // Set up tooltip functionality
        this.setupConfidenceTooltip();
    }

    /**
     * Set up confidence tooltip functionality
     */
    setupConfidenceTooltip() {
        const confidenceInfo = document.querySelector('.confidence-info[data-tooltip]');
        if (!confidenceInfo) return;

        let tooltip = null;

        // Create tooltip element
        const createTooltip = (text) => {
            tooltip = document.createElement('div');
            tooltip.className = 'confidence-tooltip';
            tooltip.textContent = text;
            document.body.appendChild(tooltip);
            return tooltip;
        };

        // Position tooltip
        const positionTooltip = (e) => {
            if (!tooltip) return;
            
            const rect = confidenceInfo.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Position above the element, centered
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            let top = rect.top - tooltipRect.height - 8;
            
            // Keep tooltip in viewport
            if (left < 8) left = 8;
            if (left + tooltipRect.width > window.innerWidth - 8) {
                left = window.innerWidth - tooltipRect.width - 8;
            }
            if (top < 8) {
                top = rect.bottom + 8; // Show below if no room above
            }
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        };

        // Show tooltip on hover
        confidenceInfo.addEventListener('mouseenter', (e) => {
            const tooltipText = confidenceInfo.getAttribute('data-tooltip');
            if (tooltipText) {
                createTooltip(tooltipText);
                positionTooltip(e);
                
                // Fade in
                requestAnimationFrame(() => {
                    tooltip.classList.add('visible');
                });
            }
        });

        // Hide tooltip on leave
        confidenceInfo.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.classList.remove('visible');
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                    tooltip = null;
                }, 200);
            }
        });

        // Update position on window resize
        window.addEventListener('resize', () => {
            if (tooltip) {
                positionTooltip();
            }
        });
    }

    /**
     * Create tone gauge HTML with proper styling, color coding, and confidence score
     */
    createToneGaugeHTML(tone, confidence) {
        const toneConfig = this.getToneConfiguration(tone);
        const confidenceLevel = this.getConfidenceLevel(confidence);
        
        return `
            <div class="tone-gauge">
                <div class="tone-gauge-header">
                    <div class="tone-info">
                        <span class="tone-icon">${toneConfig.icon}</span>
                        <span class="tone-label">Customer Tone</span>
                    </div>
                    <div class="confidence-info" data-tooltip="${this.escapeHtml(confidenceLevel.explanation)}">
                        <span class="confidence-indicator ${confidenceLevel.className}">${confidenceLevel.icon}</span>
                        <span class="confidence-text" title="Click for details">${confidence}% confidence</span>
                    </div>
                </div>
                <div class="tone-gauge-bar">
                    <div class="tone-gauge-fill ${toneConfig.className}" 
                         style="width: ${toneConfig.intensity}%; background-color: ${toneConfig.color};">
                        <span class="tone-text">${tone}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get tone configuration including colors, icons, and intensity
     */
    getToneConfiguration(tone) {
        const configurations = {
            'Happy': {
                color: '#22c55e',
                className: 'tone-happy',
                icon: '😊',
                intensity: 100
            },
            'Satisfied': {
                color: '#84cc16',
                className: 'tone-satisfied', 
                icon: '🙂',
                intensity: 80
            },
            'Neutral': {
                color: '#f59e0b',
                className: 'tone-neutral',
                icon: '😐',
                intensity: 60
            },
            'Frustrated': {
                color: '#f97316',
                className: 'tone-frustrated',
                icon: '😤',
                intensity: 40
            },
            'Angry': {
                color: '#ef4444',
                className: 'tone-angry',
                icon: '😠',
                intensity: 20
            }
        };

        return configurations[tone] || configurations['Neutral'];
    }

    /**
     * Get confidence level configuration for visual indicators
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 90) {
            return {
                className: 'confidence-very-high',
                icon: '🎯',
                label: 'Very High',
                explanation: 'The AI is highly confident in this tone assessment based on clear emotional language, strong sentiment indicators, and consistent patterns throughout the conversation.'
            };
        } else if (confidence >= 75) {
            return {
                className: 'confidence-high',
                icon: '✓',
                label: 'High',
                explanation: 'The AI found strong indicators for this tone with clear emotional cues and sentiment patterns, though some ambiguity may exist.'
            };
        } else if (confidence >= 50) {
            return {
                className: 'confidence-medium',
                icon: '~',
                label: 'Medium',
                explanation: 'The tone assessment is based on moderate indicators. Mixed signals or neutral language may make the emotional state less clear.'
            };
        } else {
            return {
                className: 'confidence-low',
                icon: '?',
                label: 'Low',
                explanation: 'The AI found limited or conflicting emotional indicators. The tone may be very neutral, or the conversation may contain mixed signals.'
            };
        }
    }

    /**
     * Set up expand all / collapse all / add all comments button event listeners
     */
    setupSummaryControls() {
        const expandAllBtn = document.getElementById('expand-all-btn');
        const collapseAllBtn = document.getElementById('collapse-all-btn');
        const addAllCommentsBtn = document.getElementById('add-all-comments-btn');

        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => {
                this.expandAllSections();
            });
        }

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => {
                this.collapseAllSections();
            });
        }

        if (addAllCommentsBtn) {
            addAllCommentsBtn.addEventListener('click', () => {
                this.addAllSectionsAsComments(addAllCommentsBtn);
            });
        }
    }

    /**
     * Expand all summary sections
     */
    expandAllSections() {
        const headers = this.elements.summarySection.querySelectorAll('.section-header');
        const contents = this.elements.summarySection.querySelectorAll('.section-content');

        headers.forEach(header => header.classList.remove('collapsed'));
        contents.forEach(content => content.classList.remove('collapsed'));
    }

    /**
     * Collapse all summary sections  
     */
    collapseAllSections() {
        const headers = this.elements.summarySection.querySelectorAll('.section-header');
        const contents = this.elements.summarySection.querySelectorAll('.section-content');

        headers.forEach(header => header.classList.add('collapsed'));
        contents.forEach(content => content.classList.add('collapsed'));
    }

    /**
     * Parse summary text into sections
     */
    parseSummaryIntoSections(text) {
        console.log('🔍 Starting to parse summary text:', text.substring(0, 200) + '...');
        const sections = [];
        const lines = text.split('\n');
        let currentSection = null;
        let currentContent = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if this line looks like a section header
            if (this.isSectionHeader(trimmedLine)) {
                console.log('✅ Found section header:', trimmedLine);
                
                // Save previous section
                if (currentSection) {
                    sections.push({
                        title: currentSection,
                        content: currentContent.join('\n').trim()
                    });
                    console.log('💾 Saved section:', currentSection, 'with', currentContent.length, 'lines');
                }
                
                // Start new section
                currentSection = trimmedLine.replace(/[\*:#]/g, '').trim();
                currentContent = [];
                console.log('🆕 Started new section:', currentSection);
            } else if (trimmedLine && currentSection) {
                currentContent.push(line);
            } else if (trimmedLine && !currentSection) {
                // Content before any section headers
                console.log('📝 Content before headers:', trimmedLine);
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
            console.log('💾 Saved final section:', currentSection, 'with', currentContent.length, 'lines');
        }

        console.log('📊 Total sections found:', sections.length);
        sections.forEach((section, idx) => {
            console.log(`Section ${idx + 1}: "${section.title}" (${section.content.split('\n').length} lines)`);
        });

        return sections.filter(section => section.content.trim());
    }

    /**
     * Check if a line is a section header
     */
    isSectionHeader(line) {
        const headerPatterns = [
            // Standard section names at start of line
            /^(action items?|key decisions?|deadlines?|open questions?|important context|summary|overview|next steps?|follow.?up)/i,
            // Text followed by colon (e.g., "Action Items:")
            /^[a-z\s]+:$/i,
            // Markdown headers
            /^#+\s+/,
            // Bold text without colon (e.g., "**Action Items**")
            /^\*\*[^*]+\*\*$/,
            // Bold text with colon inside (e.g., "**Action Items:**")
            /^\*\*[^*:]+:[^*]*\*\*$/,
            // Additional common section patterns
            /^(participants?|summary of key points?|key points?)/i
        ];
        
        console.log('🔍 Testing if header:', JSON.stringify(line));
        const isHeader = headerPatterns.some((pattern, index) => {
            const matches = pattern.test(line);
            if (matches) {
                console.log(`✅ Matched pattern ${index + 1}:`, pattern.toString());
            }
            return matches;
        });
        
        if (!isHeader) {
            console.log('❌ No pattern matched for:', JSON.stringify(line));
        }
        
        return isHeader;
    }

    /**
     * Create a collapsible section element
     */
    createCollapsibleSection(title, content, isExpanded = false) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'summary-section';

        // Count items in the section
        const itemCount = this.countSectionItems(content);

        const headerDiv = document.createElement('div');
        headerDiv.className = `section-header ${isExpanded ? '' : 'collapsed'}`;
        headerDiv.innerHTML = `
            <span class="section-title">${title}</span>
            <div class="header-buttons">
                <span class="item-count">${itemCount}</span>
                <button class="comment-section-btn" title="Post this section as a comment in Missive" data-section-title="${this.escapeHtml(title)}" data-section-content="${this.escapeHtml(content)}">
                    💬
                </button>
                <span class="toggle-icon">▼</span>
            </div>
        `;

        const contentDiv = document.createElement('div');
        contentDiv.className = `section-content ${isExpanded ? '' : 'collapsed'}`;
        
        // Check if this is an Action Items section to add task buttons
        const isActionItems = title.toLowerCase().includes('action item');
        const formattedContent = this.formatContentAsHTML(content, isActionItems);
        contentDiv.innerHTML = formattedContent;

        // Add task creation event listeners if this is an action items section
        if (isActionItems) {
            this.addTaskButtonListeners(contentDiv);
        }

        // Add comment button event listener
        this.addCommentButtonListener(headerDiv);

        // Make entire header clickable (except buttons)
        headerDiv.addEventListener('click', (e) => {
            // Don't toggle if clicking on buttons
            if (e.target.classList.contains('comment-section-btn') || 
                e.target.closest('.comment-section-btn')) {
                return;
            }
            
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
     * Count the number of items in a section
     */
    countSectionItems(content) {
        const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.match(/^\*\*[^*]+\*\*:?\s*$/); // Exclude person headers
        });
        
        return lines.length;
    }

    /**
     * Format content as HTML with proper bullet points and optional task buttons
     */
    formatContentAsHTML(content, isActionItems = false) {
        const lines = content.split('\n').filter(line => line.trim());
        
        if (!isActionItems) {
            // Non-action items - simple list
            let html = '<ul>';
            for (let i = 0; i < lines.length; i++) {
                const trimmedLine = lines[i].trim();
                if (trimmedLine) {
                    const cleanLine = trimmedLine.replace(/^[•\-\*]\s*/, '');
                    const escapedLine = this.escapeHtml(cleanLine);
                    html += `<li>${escapedLine}</li>`;
                }
            }
            html += '</ul>';
            return html;
        }

        // Action items - group by person
        return this.formatActionItemsGrouped(lines);
    }

    /**
     * Format action items grouped by assignee
     */
    formatActionItemsGrouped(lines) {
        let html = '';
        let currentPerson = null;
        let personTasks = [];

        const personHeaderPattern = /^\*\*([^*]+)\*\*:?\s*$/; // Matches **Name**: or **Name**:

        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            if (!trimmedLine) continue;

            const cleanLine = trimmedLine.replace(/^[•\-\*]\s*/, '');
            const personMatch = cleanLine.match(personHeaderPattern);

            if (personMatch) {
                // Found a person header - save previous person's tasks first
                if (currentPerson && personTasks.length > 0) {
                    html += this.renderPersonSection(currentPerson, personTasks);
                }
                
                // Start new person section
                currentPerson = personMatch[1].trim();
                personTasks = [];
            } else if (currentPerson) {
                // This is a task under the current person
                personTasks.push(cleanLine);
            } else {
                // Task without a person header - render as standalone
                html += `<div class="standalone-task">
                    <div class="action-item">
                        <span class="action-text">${this.escapeHtml(cleanLine)}</span>
                        <button class="add-task-btn" data-task-text="${this.escapeHtml(cleanLine)}" title="Add as Missive Task">
                            ✓ Add Task
                        </button>
                    </div>
                </div>`;
            }
        }

        // Render final person's tasks if any
        if (currentPerson && personTasks.length > 0) {
            html += this.renderPersonSection(currentPerson, personTasks);
        }

        return html || '<div class="no-action-items">No action items found.</div>';
    }

    /**
     * Render a person section with their tasks
     */
    renderPersonSection(personName, tasks) {
        if (tasks.length === 0) return '';

        let html = `<div class="person-section">
            <div class="person-header">
                <span class="person-name">👤 ${this.escapeHtml(personName)}</span>
                <span class="task-count">(${tasks.length} task${tasks.length > 1 ? 's' : ''})</span>
            </div>
            <ul class="person-tasks">`;

        tasks.forEach(task => {
            const escapedTask = this.escapeHtml(task);
            const escapedPersonName = this.escapeHtml(personName);
            
            console.log(`🏷️ Setting up task button: "${escapedTask}" -> assignee: "${escapedPersonName}"`);
            
            html += `<li class="action-item">
                <span class="action-text">${escapedTask}</span>
                <button class="add-task-btn" data-task-text="${escapedTask}" data-assignee="${escapedPersonName}" title="Add as Missive Task for ${escapedPersonName}">
                    ✓ Add Task
                </button>
            </li>`;
        });

        html += '</ul></div>';
        return html;
    }

    /**
     * Add event listeners for task creation buttons
     */
    addTaskButtonListeners(contentDiv) {
        const taskButtons = contentDiv.querySelectorAll('.add-task-btn');
        
        console.log(`🔗 Adding event listeners to ${taskButtons.length} task buttons`);
        
        taskButtons.forEach((button, index) => {
            const taskText = button.getAttribute('data-task-text');
            const assignee = button.getAttribute('data-assignee');
            
            console.log(`🔗 Button ${index + 1}: task="${taskText}", assignee="${assignee}"`);
            
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent section collapse
                
                console.log(`🖱️ Button clicked: task="${taskText}", assignee="${assignee}"`);
                await this.createMissiveTask(taskText, button);
            });
        });
    }

    /**
     * Create a task in Missive using the best available API method
     * Tries REST API first (with proper assignment), then falls back to JavaScript API
     */
    async createMissiveTask(taskText, buttonElement) {
        try {
            // Check if Missive API is available
            if (typeof Missive === 'undefined') {
                throw new Error('Missive API not available');
            }

            console.log('🎯 === TASK CREATION DEBUG ===');
            console.log('📝 Task text:', taskText);
            console.log('🏷️ Button data-assignee:', buttonElement.getAttribute('data-assignee'));
            
            // Disable button and show loading
            buttonElement.disabled = true;
            buttonElement.textContent = 'Creating...';
            
            // Get assignee from button data attribute (preferred) or parse from text
            const assigneeName = buttonElement.getAttribute('data-assignee') || 
                                this.parseTaskAssignee(taskText).assigneeName;
            
            console.log('👤 Detected assignee:', assigneeName);
            
            // Use clean task text (no assignee prefix)
            const cleanTaskText = assigneeName ? taskText : this.parseTaskAssignee(taskText).cleanTaskText;
            console.log('✂️ Clean task text:', cleanTaskText);
            
            // Check if we should auto-assign tasks to current user (configurable)
            const shouldAutoAssign = window.MissiveConfig?.autoAssignToCurrentUser !== false;
            
            // Debug: Show configuration without needing currentUser at this point
            console.log('🔧 Auto-assign enabled:', shouldAutoAssign);
            
            // Debug: Show what the REST API payload would look like
            console.log('🔍 === TASK CREATION DEBUG ===');
            console.log('📝 Clean task text:', cleanTaskText);
            console.log('👤 Assignee name:', assigneeName);
            console.log('🔧 Auto-assign enabled:', shouldAutoAssign);
            
            // Try REST API first if we have an API token
            const apiToken = this.getMissiveApiToken();
            if (apiToken && shouldAutoAssign) {
                console.log('🌐 API token available - attempting REST API with task assignment...');
                try {
                    const result = await this.createTaskWithRestAPI(cleanTaskText, assigneeName, buttonElement);
                    console.log('✅ REST API task creation successful');
                    return;
                } catch (restError) {
                    console.error('❌ REST API failed:', restError);
                    console.warn('⚠️ Falling back to JavaScript API (which may not assign properly)');
                }
            } else {
                console.log('⚠️ No API token available - using JavaScript API fallback');
            }
            
            // Use JavaScript API approach
            await this.createTaskWithJavaScriptAPI(taskText, buttonElement);
            
            console.log('🎉 Task creation complete:', cleanTaskText);
            console.log('🎯 === END TASK DEBUG ===');

        } catch (error) {
            console.error('❌ Failed to create task:', error);
            console.error('❌ Error details:', error.message, error.stack);
            
            // Show error state
            buttonElement.textContent = '✗ Failed';
            buttonElement.classList.add('task-error');
            
            // Reset button after a delay
            setTimeout(() => {
                buttonElement.disabled = false;
                buttonElement.textContent = '✓ Add Task';
                buttonElement.classList.remove('task-error');
            }, 3000);
        }
    }

    /**
     * Create a task using the REST API with proper assignee support
     */
    async createTaskWithRestAPI(cleanTaskText, assigneeName, buttonElement) {
        console.log('🌐 Creating task via REST API...');
        
        // Get the current user information
        const users = await Missive.fetchUsers();
        const currentUser = users.find(user => user.me === true);
        
        if (!currentUser) {
            throw new Error('Could not find current user information for REST API');
        }
        
        console.log('✅ Current user found:', currentUser.display_name, 'ID:', currentUser.id);
        
        // Check if we should auto-assign tasks to current user (configurable)
        const shouldAutoAssign = window.MissiveConfig?.autoAssignToCurrentUser !== false;
        
        // Prepare assignees array
        let assignees = [];
        if (shouldAutoAssign) {
            assignees.push(currentUser.id); // Assign to current user BY DEFAULT
            console.log(`👤 Task will be auto-assigned to you (${currentUser.display_name})`);
        } else {
            console.log(`ℹ️ Auto-assignment disabled, task will be unassigned unless specifically assigned`);
        }
        
        // If there's a specific additional assignee, add them too
        if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
            const specificUserId = this.getUserIdFromName(assigneeName);
            if (specificUserId && specificUserId !== currentUser.id) {
                assignees.push(specificUserId);
                console.log(`➕ Also assigning to: ${assigneeName} (ID: ${specificUserId})`);
            }
        }
        
        console.log('👥 Task assignees:', assignees);
        
        // Get current conversation ID
        const conversationId = await this.getCurrentConversationId();
        console.log('📧 Conversation ID:', conversationId);
        
        // Get organization ID from current user context
        const organizationId = currentUser.organization_id || currentUser.organization?.id;
        
        if (!organizationId) {
            console.warn('⚠️ No organization ID found in user data:', currentUser);
            console.log('🔍 Available user properties:', Object.keys(currentUser));
        } else {
            console.log('✅ Organization ID found:', organizationId);
        }
        
        // Prepare the REST API payload with correct Missive format per documentation
        const taskPayload = {
            tasks: {
                organization: organizationId,
                title: cleanTaskText.length > 50 ? cleanTaskText.substring(0, 50) + '...' : cleanTaskText,
                description: cleanTaskText,
                assignees: assignees,
                add_users: assignees, // Key field for actually assigning users per API docs
                subtask: !!conversationId // true when conversation exists (subtask), false for standalone
            }
        };
        
        // Add conversation if available (required for subtasks)
        if (conversationId) {
            taskPayload.tasks.conversation = conversationId;
        }
        
        console.log('📦 Final task payload with correct format:', JSON.stringify(taskPayload, null, 2));
        
        // Make REST API call to create task with assignment
        try {
            const result = await this.makeRestApiCall('POST', '/v1/tasks', taskPayload);
            console.log('✅ Task created and assigned via REST API');
            console.log('📋 REST API response:', result);
            
            // Check if the response includes task assignment confirmation
            if (result && result.tasks) {
                console.log('🎯 Created task details:', {
                    id: result.tasks.id,
                    title: result.tasks.title,
                    description: result.tasks.description,
                    assignees: result.tasks.assignees,
                    add_users: result.tasks.add_users
                });
            }
            
            // Also assign the conversation to ensure visibility
            console.log('🎯 Assigning conversation for additional visibility...');
            await this.assignConversationToCurrentUser();
            
            if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
                await this.assignTaskToUser(assigneeName);
            }
            
            // Show success state
            let successText;
            if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
                if (shouldAutoAssign) {
                    successText = `✓ Task assigned to you + ${assigneeName}!`;
                } else {
                    successText = `✓ Task assigned to ${assigneeName}!`;
                }
            } else {
                successText = shouldAutoAssign ? '✓ Task assigned to you!' : '✓ Task created!';
            }
            buttonElement.textContent = successText;
            buttonElement.classList.add('task-created');
            
            return result;
        } catch (restApiError) {
            console.error('❌ REST API task creation failed:', restApiError);
            console.error('📦 Failed payload was:', JSON.stringify(taskPayload, null, 2));
            throw restApiError;
        }
    }

    /**
     * Make a REST API call to Missive
     */
    async makeRestApiCall(method, endpoint, payload = null) {
        // Get API token from settings or environment
        const apiToken = this.getMissiveApiToken();
        if (!apiToken) {
            throw new Error('No Missive API token available for REST API calls');
        }
        
        const baseUrl = window.MissiveConfig?.apiBaseUrl || 'https://public.missiveapp.com';
        const url = `${baseUrl}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        if (payload && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(payload);
        }
        
        console.log(`🌐 Making REST API call: ${method} ${url}`);
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        console.log('🔧 Request headers:', options.headers);
        
        try {
            const response = await fetch(url, options);
            console.log('📡 Response status:', response.status, response.statusText);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ REST API error response:', errorText);
                throw new Error(`REST API call failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const contentType = response.headers.get('content-type');
            console.log('📄 Response content-type:', contentType);
            
            const result = contentType?.includes('application/json') 
                ? await response.json() 
                : await response.text();
                
            console.log('✅ REST API response:', result);
            return result;
        } catch (fetchError) {
            console.error('❌ Fetch error during REST API call:', fetchError);
            console.error('📦 Failed request details:', {
                method,
                url,
                headers: options.headers,
                payload: JSON.stringify(payload, null, 2)
            });
            throw fetchError;
        }
    }

    /**
     * Get Missive API token for REST API calls
     * 
     * To enable proper task assignment, you need to configure a Missive API token:
     * 1. Copy config.example.js to config.js
     * 2. Edit config.js with your actual API token
     * 3. Go to Missive Settings > API > Create a new token for the token value
     */
    getMissiveApiToken() {
        // Try multiple sources for the API token (in priority order)
        let token = null;
        let source = 'none';
        
        // 1. Check MissiveConfig object (recommended - from config.js)
        if (window.MissiveConfig?.apiToken && 
            window.MissiveConfig.apiToken !== 'missive_pat-your_actual_token_here') {
            token = window.MissiveConfig.apiToken;
            source = 'MissiveConfig (config.js)';
        }
        
        // 1b. Check URL parameters (for Netlify deployment)
        else if (this.getUrlParameter('missive_api_token') || this.getUrlParameter('api_token')) {
            token = this.getUrlParameter('missive_api_token') || this.getUrlParameter('api_token');
            source = 'URL parameters';
        }
        
        // 2. Check global variable (legacy support)
        else if (window.MISSIVE_API_TOKEN) {
            token = window.MISSIVE_API_TOKEN;
            source = 'window.MISSIVE_API_TOKEN';
        }
        
        // 3. Check localStorage (legacy support)
        else if (localStorage.getItem('missive_api_token')) {
            token = localStorage.getItem('missive_api_token');
            source = 'localStorage';
        }
        
        // 4. Check environment variables (build process)
        else if (typeof process !== 'undefined' && process?.env?.MISSIVE_API_TOKEN) {
            token = process.env.MISSIVE_API_TOKEN;
            source = 'environment variables';
        }
        
        if (token) {
            console.log(`🔑 Using API token from: ${source}`);
            // Only show partial token for security
            const maskedToken = token.substring(0, 12) + '...' + token.slice(-4);
            console.log(`🔐 Token: ${maskedToken}`);
        } else {
            console.log('⚠️ No API token configured for REST API calls');
            console.log('💡 To enable proper task assignment:');
            console.log('   1. Copy config.example.js to config.js');
            console.log('   2. Edit config.js with your actual API token');
            console.log('   3. Get token from: Missive Settings > API > Create a new token');
        }
        
        return token;
    }

    /**
     * Get the current conversation ID
     */
    async getCurrentConversationId() {
        try {
            // Method 1: Use stored conversation ID from our conversation tracking
            if (this.currentConversationId) {
                console.log('📧 Using stored conversation ID:', this.currentConversationId);
                return this.currentConversationId;
            }
            
            // Method 2: Try to get from URL hash (more reliable than fetchConversations)
            const hash = window.location.hash;
            const conversationMatch = hash.match(/conversations\/([a-f0-9-]+)/);
            if (conversationMatch) {
                const conversationId = conversationMatch[1];
                console.log('📧 Extracted conversation ID from URL:', conversationId);
                return conversationId;
            }
            
            // Method 3: Try fetchConversations as fallback (but this might cause serialization errors)
            try {
                console.log('📧 Attempting to fetch conversations...');
                const conversations = await Missive.fetchConversations();
                if (conversations && conversations.length > 0) {
                    console.log('📧 Got conversation from fetchConversations:', conversations[0].id);
                    return conversations[0].id;
                }
            } catch (fetchError) {
                console.warn('⚠️ fetchConversations failed (serialization issue?):', fetchError);
            }
            
            console.log('📧 No conversation ID found, will create standalone task');
            return null;
        } catch (error) {
            console.error('❌ Failed to get current conversation ID:', error);
            return null;
        }
    }

    /**
     * Create task using JavaScript API (fallback method)
     */
    async createTaskWithJavaScriptAPI(taskText, buttonElement) {
        console.log('🔄 Using JavaScript API fallback...');
        
        // Get assignee from button data attribute (preferred) or parse from text
        const assigneeName = buttonElement.getAttribute('data-assignee') || 
                            this.parseTaskAssignee(taskText).assigneeName;
        
        console.log('👤 Detected assignee:', assigneeName);
        
        // Use clean task text (no assignee prefix)
        const cleanTaskText = assigneeName ? taskText : this.parseTaskAssignee(taskText).cleanTaskText;
        console.log('✂️ Clean task text:', cleanTaskText);
        
        // Get current user information for task assignment
        const users = await Missive.fetchUsers();
        const currentUser = users.find(user => user.me === true);
        
        if (!currentUser) {
            throw new Error('Could not find current user information');
        }
        
        console.log('✅ Current user found:', currentUser.display_name);
        
        // Create the task using Missive API
        console.log('📋 Creating task in Missive...');
        console.log('🔍 === JAVASCRIPT API TASK CREATION ===');
        console.log('📝 Task text:', cleanTaskText);
        console.log('👤 Current user:', {
            id: currentUser.id,
            name: currentUser.display_name,
            email: currentUser.email
        });
        
        await Missive.createTask(cleanTaskText, false);
        console.log('✅ Task created in Missive');
        
        // Check if we should auto-assign tasks to current user (configurable)
        const shouldAutoAssign = window.MissiveConfig?.autoAssignToCurrentUser !== false;
        
        if (shouldAutoAssign) {
            // Assign the task to current user (YOU) by default
            console.log('🎯 Auto-assigning task to you (current user)...');
            console.log('🔧 Calling Missive.addAssignees with:', [currentUser.id]);
            try {
                const assignResult = await Missive.addAssignees([currentUser.id]);
                console.log('✅ Task assignment result:', assignResult);
                console.log('✅ Task successfully assigned to you!');
            } catch (error) {
                console.warn('⚠️ Could not assign task to current user via addAssignees:', error);
                console.warn('⚠️ Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                console.log('🔄 Trying alternative approach: conversation assignment...');
                // Alternative: assign the conversation which should make tasks visible
                await this.assignConversationToCurrentUser();
            }
        } else {
            console.log('ℹ️ Auto-assignment disabled in config, task will remain unassigned unless specifically assigned');
        }
        
        console.log('🔍 === END JAVASCRIPT API TASK CREATION ===');
        
        // If a specific additional assignee was detected, also assign to them
        if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
            console.log('🎯 Also attempting to assign task to:', assigneeName);
            const specificUserId = this.getUserIdFromName(assigneeName);
            if (specificUserId && specificUserId !== currentUser.id) {
                try {
                    await Missive.addAssignees([specificUserId]);
                    console.log('✅ Task also assigned to:', assigneeName);
                } catch (error) {
                    console.warn('⚠️ Could not assign task to specific user:', error);
                    // Don't fail the whole operation for this
                }
            }
        }
        
        // Show success state
        let successText;
        if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
            successText = shouldAutoAssign ? `✓ Task assigned to you + ${assigneeName}!` : `✓ Task assigned to ${assigneeName}!`;
        } else {
            successText = shouldAutoAssign ? '✓ Task assigned to you!' : '✓ Task created!';
        }
        buttonElement.textContent = successText;
        buttonElement.classList.add('task-created');
        
        // Debug: Try to fetch and show current tasks to verify assignment
        console.log('🔍 Attempting to fetch current tasks to verify assignment...');
        try {
            const tasks = await Missive.fetchTasks();
            console.log('📋 Current tasks:', tasks);
            
            // Look for the task we just created
            const recentTask = tasks.find(task => 
                task.description === cleanTaskText || 
                task.description.includes(cleanTaskText.substring(0, 20))
            );
            
            if (recentTask) {
                console.log('🎯 Found recently created task:', {
                    id: recentTask.id,
                    description: recentTask.description,
                    assignees: recentTask.assignees,
                    state: recentTask.state,
                    conversation: recentTask.conversation
                });
            } else {
                console.log('⚠️ Could not find the recently created task in task list');
            }
        } catch (taskFetchError) {
            console.warn('⚠️ Could not fetch tasks for verification:', taskFetchError);
        }
        
        console.log('🎉 JavaScript API task creation complete:', cleanTaskText);
    }

    /**
     * Assign the current conversation to the current user (you)
     */
    async assignConversationToCurrentUser() {
        try {
            console.log('🔍 === USER ASSIGNMENT DEBUG ===');
            
            // Get the current user's information
            console.log('📋 Fetching users from Missive API...');
            const users = await Missive.fetchUsers();
            console.log(`📊 Found ${users.length} total users:`, users);
            
            const currentUser = users.find(user => user.me === true);
            
            if (currentUser) {
                console.log('✅ Found current user:', {
                    displayName: currentUser.display_name,
                    id: currentUser.id,
                    email: currentUser.email,
                    firstName: currentUser.first_name,
                    lastName: currentUser.last_name,
                    me: currentUser.me
                });
                
                console.log('🎯 Attempting to assign conversation...');
                await Missive.addAssignees([currentUser.id]);
                console.log('✅ Successfully assigned conversation to current user');
                
                // Verify assignment worked
                console.log('🔍 Verifying assignment...');
                // Note: We can't easily verify this with the current API, but the call should have worked
                
            } else {
                console.log('⚠️ Could not find current user information');
                console.log('👥 Available users:', users.map(u => ({
                    id: u.id,
                    displayName: u.display_name,
                    email: u.email,
                    me: u.me
                })));
            }
            
            console.log('🔍 === END USER ASSIGNMENT DEBUG ===');
            
        } catch (error) {
            console.error('❌ Failed to assign conversation to current user:', error);
            console.error('❌ Error stack:', error.stack);
            // Don't throw error here - task was still created successfully
        }
    }

    /**
     * Parse task text to extract assignee name and clean task description
     */
    parseTaskAssignee(taskText) {
        // Look for patterns like "Name:" or "Name -" or "Name should" etc.
        const patterns = [
            /^([A-Z][a-z]+ [A-Z][a-z]+):\s*(.+)$/,           // "John Smith: do something"
            /^([A-Z][a-z]+ [A-Z][a-z]+)\s*-\s*(.+)$/,        // "John Smith - do something"  
            /^([A-Z][a-z]+):\s*(.+)$/,                       // "John: do something"
            /^([A-Z][a-z]+)\s*-\s*(.+)$/,                    // "John - do something"
            /^([A-Z][a-z]+ [A-Z][a-z]+)\s+(should|needs?|must|will)\s+(.+)$/i, // "John Smith should do something"
            /^([A-Z][a-z]+)\s+(should|needs?|must|will)\s+(.+)$/i             // "John should do something"
        ];

        for (const pattern of patterns) {
            const match = taskText.match(pattern);
            if (match) {
                const assigneeName = match[1];
                const cleanTaskText = match[2] || match[3] || taskText;
                
                console.log('Parsed task assignee:', assigneeName, 'Task:', cleanTaskText);
                return { assigneeName, cleanTaskText };
            }
        }

        // No assignee found, return original text
        return { assigneeName: null, cleanTaskText: taskText };
    }

    /**
     * Get URL parameter value
     */
    getUrlParameter(paramName) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(paramName);
    }

    /**
     * Get user ID from name using the 7L team mapping
     */
    getUserIdFromName(name) {
        const mapping = this.get7LUserMapping();
        const normalizedName = name.toLowerCase().trim();
        
        // Direct lookup
        if (mapping[normalizedName]) {
            console.log(`✅ Found direct match: "${name}" -> ID: ${mapping[normalizedName]}`);
            return mapping[normalizedName];
        }
        
        // Try first name only
        const firstName = normalizedName.split(' ')[0];
        const firstNameMatch = Object.keys(mapping).find(key => key.startsWith(firstName));
        if (firstNameMatch) {
            console.log(`✅ Found first name match: "${name}" -> "${firstNameMatch}" -> ID: ${mapping[firstNameMatch]}`);
            return mapping[firstNameMatch];
        }
        
        console.log(`❌ No match found for: "${name}"`);
        return null;
    }

    /**
     * Get 7L team user mapping for reliable matching
     */
    get7LUserMapping() {
        return {
            // Full names
            'asya ray': '1eee7d0b-40c0-48bf-9bd0-770ad59bb30c',
            'benjamin quattrocchi': '149ed9af-90c1-4b16-b43a-2e7b9e46214d',
            'brandon wollam': 'a8b532e0-bb60-4361-b588-b409e8525290',
            'brennan o\'dowd': '98ce05ad-1d55-46d6-afb0-3bbe54caee19',
            'carl sipsky': '2356fbb0-ce5e-4e33-bfaa-ec62e4fd6901',
            'casey hylander': 'b8a7bba2-9bc5-4465-8828-cd3197c28f65',
            'christi kuhn': '53c12df0-7fbc-4f10-ae4d-ba23f42c3f7b', // Using first ID for Christi
            'courtney clark': '1ecb8a50-ea96-43e9-8280-2df01624eef2',
            'daniela barrera': 'c01e55f2-6625-4ec7-9506-2894e53576b6',
            'delaney penn': '4f40321d-5eeb-4ada-b9e9-008920002ab2',
            'emanuel dell ascenza': 'f5fd4298-38c1-43b3-9753-46eca52bbe05',
            'emiliana kurowski': 'f0c90c05-2d03-4300-ba1a-8699270e9fea',
            'geoff mullins': 'ec520376-fa10-4f7e-8709-af3ad2d58679',
            'gerardo caciorgna': 'b7e0e578-7955-483b-95ce-8508f029e2e2',
            'jessica spilsbury': '55775f35-733b-4f0c-9f63-76f5c05f8a29',
            'kadi miller': 'afc2bfd8-1981-46c4-802a-44595118afed',
            'kamerin blasingame': '640a18d9-99b1-491b-a170-8651b0b6c38c',
            'kate gay': 'd6e052f0-83c2-40c8-8a89-7e6e0f1e34c2',
            'katie johnson': 'a200c5c1-9935-44e9-8dd8-13d041a5c98a',
            'kyle baxter': 'de39b0cd-3142-4484-a25f-0bc3f151f690',
            'laura pelegrino': '56bd6b01-a1e4-4c2b-b4cf-0c6ed21a7f4e',
            'luciano guerra': 'f52fae81-d366-4f56-8f53-a1a4ad542d6b',
            'maxine sebastiani': '44c1df4d-492c-4f76-86e8-ce45926fe230',
            'megan bernardi': '69849f87-44b3-4daa-a063-80909ba8b1fc',
            'michaela kidder-davis': '6efcb9fb-978a-4264-ae73-179ea9dc556b',
            'missy burris': '52f381b1-ec18-4ac8-a275-321bab9824b4',
            'nathan tuccio': 'a5b1782f-3e54-41eb-872f-d17405598e53',
            'rusty nelson': 'ad7396ce-afd9-400d-8f18-5063601ad4f9',
            'sean burns': '732d0377-5b83-4651-9ab8-cf108c29d003',
            'teddy peterschmidt': 'fdd77046-c861-4c83-879c-f604eea35d89',
            
            // Common short names/nicknames
            'asya': '1eee7d0b-40c0-48bf-9bd0-770ad59bb30c',
            'ben': '149ed9af-90c1-4b16-b43a-2e7b9e46214d',
            'benjamin': '149ed9af-90c1-4b16-b43a-2e7b9e46214d',
            'brandon': 'a8b532e0-bb60-4361-b588-b409e8525290',
            'brennan': '98ce05ad-1d55-46d6-afb0-3bbe54caee19',
            'carl': '2356fbb0-ce5e-4e33-bfaa-ec62e4fd6901',
            'casey': 'b8a7bba2-9bc5-4465-8828-cd3197c28f65',
            'christi': '53c12df0-7fbc-4f10-ae4d-ba23f42c3f7b',
            'courtney': '1ecb8a50-ea96-43e9-8280-2df01624eef2',
            'daniela': 'c01e55f2-6625-4ec7-9506-2894e53576b6',
            'delaney': '4f40321d-5eeb-4ada-b9e9-008920002ab2',
            'emanuel': 'f5fd4298-38c1-43b3-9753-46eca52bbe05',
            'emiliana': 'f0c90c05-2d03-4300-ba1a-8699270e9fea',
            'geoff': 'ec520376-fa10-4f7e-8709-af3ad2d58679',
            'gerardo': 'b7e0e578-7955-483b-95ce-8508f029e2e2',
            'jessica': '55775f35-733b-4f0c-9f63-76f5c05f8a29',
            'kadi': 'afc2bfd8-1981-46c4-802a-44595118afed',
            'kamerin': '640a18d9-99b1-491b-a170-8651b0b6c38c',
            'kate': 'd6e052f0-83c2-40c8-8a89-7e6e0f1e34c2',
            'katie': 'a200c5c1-9935-44e9-8dd8-13d041a5c98a',
            'kyle': 'de39b0cd-3142-4484-a25f-0bc3f151f690',
            'laura': '56bd6b01-a1e4-4c2b-b4cf-0c6ed21a7f4e',
            'luciano': 'f52fae81-d366-4f56-8f53-a1a4ad542d6b',
            'maxine': '44c1df4d-492c-4f76-86e8-ce45926fe230',
            'megan': '69849f87-44b3-4daa-a063-80909ba8b1fc',
            'michaela': '6efcb9fb-978a-4264-ae73-179ea9dc556b',
            'missy': '52f381b1-ec18-4ac8-a275-321bab9824b4',
            'nathan': 'a5b1782f-3e54-41eb-872f-d17405598e53',
            'rusty': 'ad7396ce-afd9-400d-8f18-5063601ad4f9',
            'sean': '732d0377-5b83-4651-9ab8-cf108c29d003',
            'teddy': 'fdd77046-c861-4c83-879c-f604eea35d89'
        };
    }

    /**
     * Assign the current conversation to a specific user by name
     */
    async assignTaskToUser(assigneeName) {
        try {
            console.log(`🔍 Looking for user: "${assigneeName}"`);
            
            // First try the 7L user mapping for fast, reliable matching
            const userMapping = this.get7LUserMapping();
            const normalizedName = assigneeName.toLowerCase().trim();
            
            let userId = userMapping[normalizedName];
            let matchedName = assigneeName;
            
            if (userId) {
                console.log(`✅ Found user in 7L mapping: "${assigneeName}" -> ID: ${userId}`);
                
                // Assign the conversation to this user
                await Missive.addAssignees([userId]);
                
                console.log(`✅ Successfully assigned conversation to ${assigneeName}`);
                return;
            }
            
            // Fallback to API-based matching
            console.log('⚠️ Not found in 7L mapping, trying API-based matching...');
            
            // Fetch all Missive users
            const users = await Missive.fetchUsers();
            
            // Find user by name (try different name combinations)
            const matchingUser = users.find(user => {
                const userDisplayName = user.display_name || '';
                const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                const userFirstName = user.first_name || '';
                
                return userDisplayName.toLowerCase().includes(assigneeName.toLowerCase()) ||
                       userFullName.toLowerCase().includes(assigneeName.toLowerCase()) ||
                       userFirstName.toLowerCase() === assigneeName.toLowerCase();
            });

            if (matchingUser) {
                console.log('✅ Found matching user via API:', matchingUser.display_name, 'ID:', matchingUser.id);
                
                // Assign the conversation to this user
                await Missive.addAssignees([matchingUser.id]);
                
                console.log(`✅ Successfully assigned conversation to ${matchingUser.display_name}`);
            } else {
                console.log(`❌ No user found matching "${assigneeName}".`);
                console.log('💡 Available in 7L mapping:', Object.keys(userMapping).join(', '));
                console.log('💡 Available via API:', users.map(u => u.display_name || `${u.first_name} ${u.last_name}`).join(', '));
            }

        } catch (error) {
            console.error('Failed to assign task to user:', error);
            // Don't throw error here - task was still created successfully
        }
    }

    /**
     * Debug function to show all available Missive users
     */
    async debugShowMissiveUsers() {
        try {
            if (typeof Missive === 'undefined') {
                console.log('❌ Missive API not available');
                return;
            }

            console.log('🔍 Fetching Missive users...');
            const users = await Missive.fetchUsers();
            
            console.log(`📋 Found ${users.length} Missive users:`);
            console.table(users.map(user => ({
                ID: user.id,
                'Display Name': user.display_name || 'N/A',
                'Full Name': `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A',
                'First Name': user.first_name || 'N/A',
                'Last Name': user.last_name || 'N/A',
                'Email': user.email || 'N/A',
                'Is Me': user.me || false
            })));

            return users;
        } catch (error) {
            console.error('❌ Failed to fetch Missive users:', error);
            return [];
        }
    }

    /**
     * Debug function to test conversation assignment
     */
    async debugTestAssignment() {
        console.log('🧪 === TESTING ASSIGNMENT FUNCTIONALITY ===');
        
        try {
            // Test fetching users
            await this.debugShowMissiveUsers();
            
            // Test assignment to current user
            console.log('🧪 Testing assignment to current user...');
            await this.assignConversationToCurrentUser();
            
            console.log('🧪 Assignment test complete');
            
        } catch (error) {
            console.error('🧪 Assignment test failed:', error);
        }
        
        console.log('🧪 === END ASSIGNMENT TEST ===');
    }

    /**
     * Add event listener for comment section buttons
     */
    addCommentButtonListener(headerDiv) {
        const commentButton = headerDiv.querySelector('.comment-section-btn');
        
        commentButton.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent section collapse
            
            const sectionTitle = commentButton.getAttribute('data-section-title');
            const sectionContent = commentButton.getAttribute('data-section-content');
            
            await this.postSectionAsComment(sectionTitle, sectionContent, commentButton);
        });
    }

    /**
     * Post a section as a comment in the Missive conversation
     */
    async postSectionAsComment(title, content, buttonElement) {
        try {
            // Check if Missive API is available
            if (typeof Missive === 'undefined') {
                throw new Error('Missive API not available');
            }

            console.log('Posting section as comment:', title);
            
            // Disable button and show loading
            buttonElement.disabled = true;
            buttonElement.textContent = '💬 Posting...';
            
            // Format the comment with title and content
            const commentBody = `**${title}**\n\n${content}`;
            
            // Post the comment using Missive API
            await Missive.comment(commentBody);
            
            // Show success state
            buttonElement.textContent = '✓ Posted!';
            buttonElement.classList.add('comment-posted');
            
            console.log('Comment posted successfully:', title);
            
            // Reset button after a delay
            setTimeout(() => {
                buttonElement.disabled = false;
                buttonElement.textContent = '💬 Post as Comment';
                buttonElement.classList.remove('comment-posted');
            }, 2000);

        } catch (error) {
            console.error('Failed to post comment:', error);
            
            // Show error state
            buttonElement.textContent = '✗ Failed';
            buttonElement.classList.add('comment-error');
            
            // Reset button after a delay
            setTimeout(() => {
                buttonElement.disabled = false;
                buttonElement.textContent = '💬 Post as Comment';
                buttonElement.classList.remove('comment-error');
            }, 3000);
        }
    }

    /**
     * Add all sections as comments to the conversation
     */
    async addAllSectionsAsComments(buttonElement) {
        try {
            console.log('🗨️ Adding all sections as comments...');
            
            // Disable button and show loading state
            buttonElement.disabled = true;
            buttonElement.textContent = '💬 Posting Comments...';
            buttonElement.classList.add('comments-posting');
            
            // Get all sections from the summary
            const sections = this.elements.summarySection.querySelectorAll('.summary-section');
            
            if (sections.length === 0) {
                throw new Error('No sections found to comment');
            }
            
            let successCount = 0;
            let errorCount = 0;
            
            // Post each section as a separate comment
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                const headerElement = section.querySelector('.section-header');
                const contentElement = section.querySelector('.section-content');
                
                if (headerElement && contentElement) {
                    const title = headerElement.querySelector('span').textContent.trim();
                    const contentHtml = contentElement.innerHTML;
                    
                    // Convert HTML back to plain text for the comment
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = contentHtml;
                    const content = tempDiv.textContent || tempDiv.innerText || '';
                    
                    try {
                        // Small delay between comments to avoid overwhelming the API
                        if (i > 0) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                        
                        console.log(`📤 Posting section ${i + 1}/${sections.length}: ${title}`);
                        await this.postSectionAsCommentInternal(title, content);
                        successCount++;
                    } catch (error) {
                        console.error(`❌ Failed to post section "${title}":`, error);
                        errorCount++;
                    }
                }
            }
            
            // Show final result
            if (errorCount === 0) {
                buttonElement.textContent = `✅ Posted ${successCount} Comments!`;
                buttonElement.classList.remove('comments-posting');
                buttonElement.classList.add('comments-posted');
                console.log(`🎉 Successfully posted ${successCount} comments`);
            } else {
                buttonElement.textContent = `⚠️ Posted ${successCount}/${sections.length}`;
                buttonElement.classList.remove('comments-posting');
                buttonElement.classList.add('comments-error');
                console.log(`⚠️ Posted ${successCount} comments, ${errorCount} failed`);
            }
            
            // Reset button after delay
            setTimeout(() => {
                buttonElement.disabled = false;
                buttonElement.textContent = '💬 Add All Comments';
                buttonElement.classList.remove('comments-posting', 'comments-posted', 'comments-error');
            }, 3000);
            
        } catch (error) {
            console.error('❌ Failed to add all comments:', error);
            
            // Show error state
            buttonElement.textContent = '❌ Failed';
            buttonElement.classList.remove('comments-posting');
            buttonElement.classList.add('comments-error');
            
            // Reset button after delay
            setTimeout(() => {
                buttonElement.disabled = false;
                buttonElement.textContent = '💬 Add All Comments';
                buttonElement.classList.remove('comments-posting', 'comments-posted', 'comments-error');
            }, 3000);
        }
    }

    /**
     * Internal method to post a section as comment (shared logic)
     */
    async postSectionAsCommentInternal(title, content) {
        // Check if Missive API is available
        if (typeof Missive === 'undefined') {
            throw new Error('Missive API not available');
        }

        // Format the comment with title and content
        const commentText = `**${title}**\n\n${content}`;
        
        console.log('📝 Formatted comment:', commentText);
        
        // Post the comment using Missive API
        await Missive.comment(commentText);
        console.log('✅ Comment posted successfully');
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
     * Show loading state with progressive messages
     */
    showLoading() {
        this.hideAllStates();
        this.elements.loading.style.display = 'block';
        this.startLoadingAnimation();
    }

    /**
     * Start the progressive loading animation
     */
    startLoadingAnimation() {
        const loadingMessages = [
            "🧙‍♂️ Casting analysis spell...",
            "📧 Reading email threads...", 
            "🔍 Extracting key insights...",
            "🧠 Processing with AI magic...",
            "📝 Organizing findings...",
            "✨ Almost done!"
        ];

        let messageIndex = 0;
        const loadingTextElement = document.getElementById('loading-text');
        
        if (!loadingTextElement) return;

        // Clear any existing interval
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }

        // Set initial message
        loadingTextElement.textContent = loadingMessages[0];

        // Cycle through messages
        this.loadingInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            loadingTextElement.textContent = loadingMessages[messageIndex];
        }, 2000); // Change message every 2 seconds
    }

    /**
     * Stop loading animation
     */
    stopLoadingAnimation() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.hideAllStates();
        this.elements.emptyState.style.display = 'block';
        this.currentConversationId = null;
        this.currentConversation = null;
        
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
     * Show ready to summarize state
     */
    showReadyToSummarize() {
        this.hideAllStates();
        this.elements.readyState.style.display = 'block';
    }

    /**
     * Summarize the currently selected conversation
     */
    async summarizeCurrentConversation() {
        if (!this.currentConversation) {
            this.showError('No conversation selected to summarize.');
            return;
        }

        try {
            console.log('Manual summarization triggered');
            
            // Provide immediate button feedback
            const summarizeButton = document.getElementById('summarize-button');
            if (summarizeButton) {
                summarizeButton.disabled = true;
                summarizeButton.textContent = '🧙‍♂️ Working...';
            }
            
            await this.processConversation(this.currentConversation);
            
        } catch (error) {
            console.error('Error during manual summarization:', error);
            this.showError('Failed to summarize conversation. Please try again.');
        } finally {
            // Re-enable button if still visible
            const summarizeButton = document.getElementById('summarize-button');
            if (summarizeButton) {
                summarizeButton.disabled = false;
                summarizeButton.textContent = '🧙‍♂️ Summarize This';
            }
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
        this.elements.readyState.style.display = 'none';
        this.elements.errorState.style.display = 'none';
        this.elements.summaryContent.style.display = 'none';
        
        // Stop loading animation when hiding states
        this.stopLoadingAnimation();
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
let emailSummarizer;
document.addEventListener('DOMContentLoaded', () => {
    function initializeWhenReady() {
        if (window.configLoaded) {
            console.log('🚀 Config loaded, initializing EmailSummarizer...');
            emailSummarizer = new EmailSummarizer();
            
            // Make it globally available for onclick handlers
            window.emailSummarizer = emailSummarizer;
            
            initializeGlobalFunctions();
        } else {
            console.log('⏳ Waiting for config to load...');
            setTimeout(initializeWhenReady, 100);
        }
    }
    
    initializeWhenReady();
    
    function initializeGlobalFunctions() {
        // Expose debug functions globally
        window.debugMissiveUsers = () => emailSummarizer.debugShowMissiveUsers();
    window.debugAssignmentTest = () => emailSummarizer.debugTestAssignment();
    window.testUserMapping = (name) => {
        const mapping = emailSummarizer.get7LUserMapping();
        const normalizedName = name.toLowerCase().trim();
        const userId = mapping[normalizedName];
        
        if (userId) {
            console.log(`✅ Found "${name}" -> ID: ${userId}`);
            return { found: true, userId, name };
        } else {
            console.log(`❌ "${name}" not found in mapping`);
            console.log('💡 Available names:', Object.keys(mapping).join(', '));
            return { found: false, name };
        }
    };
    
    // Test specific user assignment
    window.testBrennanAssignment = async () => {
        console.log('🧪 === TESTING BRENNAN ASSIGNMENT ===');
        
        // Test the mapping
        const result = testUserMapping("Brennan O'Dowd");
        console.log('🗂️ Mapping result:', result);
        
        // Test the assignment function directly
        try {
            console.log('🎯 Testing direct assignment...');
            await emailSummarizer.assignTaskToUser("Brennan O'Dowd");
            console.log('✅ Assignment test completed');
        } catch (error) {
            console.error('❌ Assignment test failed:', error);
        }
        
        console.log('🧪 === END BRENNAN TEST ===');
    };
    
    // Debug current task buttons on page
    window.debugTaskButtons = () => {
        console.log('🔍 === DEBUGGING CURRENT TASK BUTTONS ===');
        const buttons = document.querySelectorAll('.add-task-btn');
        console.log(`🔍 Found ${buttons.length} task buttons`);
        
        buttons.forEach((button, index) => {
            const taskText = button.getAttribute('data-task-text');
            const assignee = button.getAttribute('data-assignee');
            const buttonText = button.textContent;
            
            console.log(`🔍 Button ${index + 1}:`, {
                taskText,
                assignee,
                buttonText,
                disabled: button.disabled,
                classes: button.className
            });
        });
        
        console.log('🔍 === END BUTTON DEBUG ===');
    };
    }
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
}); 
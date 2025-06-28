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

            // Set up expand/collapse all controls
            this.setupSummaryControls();

            this.showSummary();

        } catch (error) {
            console.error('Error displaying summary:', error);
            this.showError('Failed to display summary.');
        }
    }

    /**
     * Set up expand all / collapse all button event listeners
     */
    setupSummaryControls() {
        const expandAllBtn = document.getElementById('expand-all-btn');
        const collapseAllBtn = document.getElementById('collapse-all-btn');

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
            <div class="header-buttons">
                <button class="comment-section-btn" title="Post section as comment" data-section-title="${this.escapeHtml(title)}" data-section-content="${this.escapeHtml(content)}">
                    💬 Post as Comment
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
            
            // Try REST API approach first (supports proper task assignment)
            try {
                console.log('🚀 Attempting REST API task creation with assignment...');
                await this.createTaskWithRestAPI(cleanTaskText, assigneeName, buttonElement);
                console.log('✅ REST API task creation successful!');
            } catch (restError) {
                console.log('⚠️ REST API failed, falling back to JavaScript API:', restError.message);
                
                // Fallback to JavaScript API approach
                await this.createTaskWithJavaScriptAPI(taskText, buttonElement);
            }
            
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
        
        // Prepare assignees array
        let assignees = [currentUser.id]; // Always assign to current user
        
        // If there's a specific assignee, add them too
        if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
            const specificUserId = this.getUserIdFromName(assigneeName);
            if (specificUserId && specificUserId !== currentUser.id) {
                assignees.push(specificUserId);
                console.log(`🔄 Also assigning to: ${assigneeName} (ID: ${specificUserId})`);
            }
        }
        
        console.log('👥 Task assignees:', assignees);
        
        // Get current conversation ID
        const conversationId = await this.getCurrentConversationId();
        console.log('📧 Conversation ID:', conversationId);
        
        // Prepare the REST API payload
        const taskPayload = {
            tasks: {
                description: cleanTaskText,
                assignees: assignees,
                state: 'todo'
            }
        };
        
        // Add conversation if available
        if (conversationId) {
            taskPayload.tasks.conversation = conversationId;
        }
        
        console.log('📦 Task payload:', taskPayload);
        
        // Make REST API call to create task with assignment
        const result = await this.makeRestApiCall('POST', '/v1/tasks', taskPayload);
        console.log('✅ Task created and assigned via REST API');
        
        // Also assign the conversation to ensure visibility
        console.log('🎯 Assigning conversation for additional visibility...');
        await this.assignConversationToCurrentUser();
        
        if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
            await this.assignTaskToUser(assigneeName);
        }
        
        // Show success state
        const successText = assigneeName ? `✓ Created & assigned!` : '✓ Created & assigned to you!';
        buttonElement.textContent = successText;
        buttonElement.classList.add('task-created');
        
        return result;
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
        
        const url = `https://public.missiveapp.com${endpoint}`;
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
        console.log('📦 Payload:', payload);
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`REST API call failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = response.headers.get('content-type')?.includes('application/json') 
            ? await response.json() 
            : await response.text();
            
        console.log('✅ REST API response:', result);
        return result;
    }

    /**
     * Get Missive API token for REST API calls
     * 
     * To enable proper task assignment, you need to configure a Missive API token:
     * 1. Go to Missive Settings > API > Create a new token
     * 2. Add your token here in one of these ways:
     *    - Set window.MISSIVE_API_TOKEN = 'your_token_here' 
     *    - Add <script>window.MISSIVE_API_TOKEN = 'your_token_here';</script> to your HTML
     *    - Store in localStorage as 'missive_api_token'
     */
    getMissiveApiToken() {
        // Try multiple sources for the API token
        let token = null;
        
        // 1. Check global variable
        if (window.MISSIVE_API_TOKEN) {
            token = window.MISSIVE_API_TOKEN;
            console.log('🔑 Using API token from window.MISSIVE_API_TOKEN');
        }
        
        // 2. Check localStorage
        else if (localStorage.getItem('missive_api_token')) {
            token = localStorage.getItem('missive_api_token');
            console.log('🔑 Using API token from localStorage');
        }
        
        // 3. Check environment variables (if available)
        else if (process?.env?.MISSIVE_API_TOKEN) {
            token = process.env.MISSIVE_API_TOKEN;
            console.log('🔑 Using API token from environment');
        }
        
        if (!token) {
            console.log('⚠️ No API token configured for REST API calls');
            console.log('💡 To enable proper task assignment, configure a Missive API token:');
            console.log('   1. Go to Missive Settings > API > Create a new token');
            console.log('   2. Set window.MISSIVE_API_TOKEN = "your_token_here"');
            console.log('   3. Or store in localStorage as "missive_api_token"');
        }
        
        return token;
    }

    /**
     * Get the current conversation ID
     */
    async getCurrentConversationId() {
        try {
            // In the Missive iframe context, we can get the conversation ID from the URL or context
            // This is a simplified approach - you might need to adjust based on actual implementation
            const conversations = await Missive.fetchConversations();
            if (conversations && conversations.length > 0) {
                return conversations[0].id;
            }
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
        
        // Create the task using Missive API (this creates an unassigned task)
        console.log('📋 Creating task in Missive...');
        await Missive.createTask(cleanTaskText, false);
        console.log('✅ Task created successfully in Missive');
        
        // Always try to assign the conversation to you (the current user) so you can see the task
        console.log('🎯 Assigning conversation to current user...');
        await this.assignConversationToCurrentUser();
        
        // If a specific assignee was detected, also try to assign to them
        if (assigneeName && assigneeName.toLowerCase() !== 'you' && assigneeName.toLowerCase() !== 'me') {
            console.log('🎯 Also attempting to assign conversation to:', assigneeName);
            await this.assignTaskToUser(assigneeName);
        }
        
        // Show success state
        const successText = assigneeName ? `✓ Added & assigned!` : '✓ Added & assigned to you!';
        buttonElement.textContent = successText;
        buttonElement.classList.add('task-created');
        
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
    emailSummarizer = new EmailSummarizer();
    
    // Make it globally available for onclick handlers
    window.emailSummarizer = emailSummarizer;
    
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
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
}); 
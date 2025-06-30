exports.handler = async (event, context) => {
    // Security: API keys are safely stored in server environment variables
    const OPENAI_API_KEY = process.env.OPEN_AI_API;
    
    // CORS headers for Missive iframe
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    // Check if API key is available
    if (!OPENAI_API_KEY) {
        console.error('OPEN_AI_API environment variable not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'OpenAI API key not configured on server' })
        };
    }
    
    try {
        // Parse the request body
        const requestBody = JSON.parse(event.body);
        
        // Security: Validate and sanitize the request
        if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid request format' })
            };
        }
        
        // Security: Limit message content size to prevent abuse
        const totalContentLength = requestBody.messages
            .map(msg => (msg.content || '').length)
            .reduce((sum, len) => sum + len, 0);
            
        if (totalContentLength > 50000) { // 50KB limit
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Request content too large' })
            };
        }
        
        console.log('🔐 Proxying OpenAI request securely');
        console.log(`📝 Request size: ${totalContentLength} characters`);
        
        // Make the secure API call to OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: requestBody.model || 'gpt-4o-mini',
                messages: requestBody.messages,
                max_tokens: Math.min(requestBody.max_tokens || 1500, 2000), // Cap at 2000
                temperature: Math.min(requestBody.temperature || 0.3, 1.0) // Cap at 1.0
            })
        });
        
        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json().catch(() => ({}));
            console.error('OpenAI API error:', openaiResponse.status, errorData);
            return {
                statusCode: openaiResponse.status,
                headers,
                body: JSON.stringify({ 
                    error: `OpenAI API error: ${openaiResponse.status}`,
                    details: errorData.error?.message || 'Unknown error'
                })
            };
        }
        
        const data = await openaiResponse.json();
        console.log('✅ OpenAI request successful');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };
        
    } catch (error) {
        console.error('Error in OpenAI proxy:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
}; 
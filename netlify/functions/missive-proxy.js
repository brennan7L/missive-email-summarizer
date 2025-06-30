exports.handler = async (event, context) => {
    // Security: API tokens are safely stored in server environment variables
    const MISSIVE_API_TOKEN = process.env.MISSIVE_API_TOKEN;
    
    // CORS headers for Missive iframe
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    // Check if API token is available
    if (!MISSIVE_API_TOKEN) {
        console.error('MISSIVE_API_TOKEN environment variable not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Missive API token not configured on server' })
        };
    }
    
    try {
        // Extract the API endpoint from the path
        const pathParts = event.path.split('/.netlify/functions/missive-proxy')[1];
        const apiPath = pathParts || '';
        
        // Security: Validate allowed endpoints
        const allowedEndpoints = [
            '/tasks',
            '/comments',
            '/users',
            '/conversations'
        ];
        
        const isAllowedEndpoint = allowedEndpoints.some(endpoint => 
            apiPath.startsWith(endpoint) || apiPath === ''
        );
        
        if (!isAllowedEndpoint) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Endpoint not allowed' })
            };
        }
        
        const missiveUrl = `https://public.missiveapp.com${apiPath}`;
        console.log('🔐 Proxying Missive API request:', event.httpMethod, missiveUrl);
        
        // Prepare request options
        const requestOptions = {
            method: event.httpMethod,
            headers: {
                'Authorization': `Bearer ${MISSIVE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };
        
        // Add body for non-GET requests
        if (event.body && event.httpMethod !== 'GET') {
            requestOptions.body = event.body;
        }
        
        // Make the secure API call to Missive
        const missiveResponse = await fetch(missiveUrl, requestOptions);
        
        let responseData;
        try {
            responseData = await missiveResponse.json();
        } catch (parseError) {
            responseData = await missiveResponse.text();
        }
        
        if (!missiveResponse.ok) {
            console.error('Missive API error:', missiveResponse.status, responseData);
            return {
                statusCode: missiveResponse.status,
                headers,
                body: JSON.stringify({ 
                    error: `Missive API error: ${missiveResponse.status}`,
                    details: responseData
                })
            };
        }
        
        console.log('✅ Missive API request successful');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseData)
        };
        
    } catch (error) {
        console.error('Error in Missive proxy:', error);
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
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    
    // Serve the JSON association at root or specified path
    if (url.pathname === '/' || url.pathname === '/.well-known/microsoft-identity-association.json') {
      return new Response(JSON.stringify({
        associatedApplications: [
          {
            applicationId: "f9927aec-9a57-463c-971b-95f9dc0e7f16"
          }
        ]
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'application/zip', 'text/html'],
        // This object tells Vercel it's okay for the client to use these options
        tokenPayload: JSON.stringify({
          addRandomSuffix: true,
          contentType: 'text/html'
        }),
      }),
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
}

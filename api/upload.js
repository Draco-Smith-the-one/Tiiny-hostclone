import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['text/html', 'image/jpeg', 'image/png', 'application/zip'],
        // This is the CRITICAL part. It authorizes the frontend options.
        tokenPayload: JSON.stringify({
          addRandomSuffix: true,
        }),
      }),
    });
    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
}

import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'application/zip', 'text/html'],
        // This is the missing piece that "unlocks" unique URLs
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

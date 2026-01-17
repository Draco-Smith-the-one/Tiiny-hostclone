import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Automatically set the content type so it opens in the browser
        const contentType = pathname.endsWith('.html') ? 'text/html' : 'application/octet-stream';
        
        return {
          allowedContentTypes: ['text/html', 'image/jpeg', 'image/png', 'application/zip'],
          tokenPayload: JSON.stringify({
            addRandomSuffix: true,
            contentType: contentType, // This tells the browser "Display this!"
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed', blob, tokenPayload);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({ error: error.message });
  }
}

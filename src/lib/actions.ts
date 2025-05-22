
'use server';

import { generateAlbumCover, type GenerateAlbumCoverInput, type GenerateAlbumCoverOutput } from '@/ai/flows/generate-album-cover';

export async function generateAlbumCoverAction(
  input: GenerateAlbumCoverInput
): Promise<GenerateAlbumCoverOutput> {
  try {
    // Validate input if necessary, though Zod in flow should handle it.
    const output = await generateAlbumCover(input);
    if (!output.albumCoverDataUri) {
      throw new Error('AI failed to generate an image data URI.');
    }
    return output;
  } catch (error) {
    console.error('Error in generateAlbumCoverAction:', error);
    // It's better to re-throw or return a structured error
    // For now, re-throwing to be caught by the client-side try/catch
    if (error instanceof Error) {
      throw new Error(`AI Generation failed: ${error.message}`);
    }
    throw new Error('An unknown error occurred during AI image generation.');
  }
}

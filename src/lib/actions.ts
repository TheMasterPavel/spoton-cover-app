
'use server';

import { generateAlbumCover, type GenerateAlbumCoverInput, type GenerateAlbumCoverOutput } from '@/ai/flows/generate-album-cover';

export async function generateAlbumCoverAction(
  input: GenerateAlbumCoverInput
): Promise<GenerateAlbumCoverOutput> {
  try {
    const output = await generateAlbumCover(input);
    if (!output.albumCoverDataUri) {
      throw new Error('La IA no pudo generar un URI de datos de imagen.');
    }
    return output;
  } catch (error) {
    console.error('Error en generateAlbumCoverAction:', error);
    if (error instanceof Error) {
      // Prefer keeping original error message for technical details if it's from the AI service itself
      // But prefix with a user-friendly Spanish message.
      throw new Error(`Falló la generación con IA: ${error.message}`);
    }
    throw new Error('Ocurrió un error desconocido durante la generación de imágenes con IA.');
  }
}

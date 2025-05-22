'use server';

/**
 * @fileOverview Generates a stylized album cover image based on the song title and artist.
 *
 * - generateAlbumCover - A function that generates an album cover.
 * - GenerateAlbumCoverInput - The input type for the generateAlbumCover function.
 * - GenerateAlbumCoverOutput - The return type for the generateAlbumCover function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAlbumCoverInputSchema = z.object({
  songTitle: z.string().describe('The title of the song.'),
  artistName: z.string().describe('The name of the artist.'),
});
export type GenerateAlbumCoverInput = z.infer<typeof GenerateAlbumCoverInputSchema>;

const GenerateAlbumCoverOutputSchema = z.object({
  albumCoverDataUri: z
    .string()
    .describe(
      "The generated album cover as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateAlbumCoverOutput = z.infer<typeof GenerateAlbumCoverOutputSchema>;

export async function generateAlbumCover(
  input: GenerateAlbumCoverInput
): Promise<GenerateAlbumCoverOutput> {
  return generateAlbumCoverFlow(input);
}

const generateAlbumCoverPrompt = ai.definePrompt({
  name: 'generateAlbumCoverPrompt',
  input: {schema: GenerateAlbumCoverInputSchema},
  output: {schema: GenerateAlbumCoverOutputSchema},
  prompt: `Generate a stylized album cover for the song "{{{songTitle}}}" by {{{artistName}}}. The album cover should be visually appealing and reflect the style of the music. Return the image as a data URI.

  Do not include any text in the album cover. Focus on creating an abstract and visually interesting design using colors and shapes related to the song's theme. Make the background transparent.`, // Added transparency instruction.
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const generateAlbumCoverFlow = ai.defineFlow(
  {
    name: 'generateAlbumCoverFlow',
    inputSchema: GenerateAlbumCoverInputSchema,
    outputSchema: GenerateAlbumCoverOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an album cover for a song titled "${input.songTitle}" by artist ${input.artistName}. Make the background transparent. Do not include text. Focus on abstract imagery.`, // Included transparency instructions.
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {albumCoverDataUri: media.url!};
  }
);

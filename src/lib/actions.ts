
'use server';

import { generateAlbumCover, type GenerateAlbumCoverInput, type GenerateAlbumCoverOutput } from '@/ai/flows/generate-album-cover';
import { EmailFormSchema, type EmailFormValues } from '@/lib/schema';

// Verificar la clave de API al inicio.
if (!process.env.GEMINI_API_KEY) {
  console.error('AI Actions FATAL ERROR: La variable de entorno GEMINI_API_KEY no está definida. Por favor, configúrala en Vercel.');
}

export async function generateAlbumCoverAction(
  input: GenerateAlbumCoverInput
): Promise<GenerateAlbumCoverOutput> {
  // Comprobar la clave de nuevo dentro de la acción por si acaso.
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Error de configuración del servidor: La clave de API para el servicio de IA no está configurada.');
  }
  
  try {
    const output = await generateAlbumCover(input);
    if (!output.albumCoverDataUri) {
      throw new Error('La IA no pudo generar un URI de datos de imagen.');
    }
    return output;
  } catch (error) {
    console.error('Error en generateAlbumCoverAction:', error);
    if (error instanceof Error) {
      throw new Error(`Falló la generación con IA: ${error.message}`);
    }
    throw new Error('Ocurrió un error desconocido durante la generación de imágenes con IA.');
  }
}

export async function saveEmailAction(input: EmailFormValues) {
  const validation = EmailFormSchema.safeParse(input);

  if (!validation.success) {
    throw new Error('Datos de email inválidos.');
  }

  const { email } = validation.data;

  // En un proyecto real, aquí guardarías el email en una base de datos (Supabase, Firestore, etc.)
  // o lo enviarías a un servicio de email marketing (Mailchimp, ConvertKit).
  // Por ahora, solo lo mostraremos en los logs del servidor de Vercel como prueba de concepto.
  console.log(`Email capturado para descarga gratuita: ${email}`);
  
  // Simulamos que la operación fue exitosa.
  return { success: true, email };
}

    
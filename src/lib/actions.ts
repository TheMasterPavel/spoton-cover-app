
'use server';

import { generateAlbumCover, type GenerateAlbumCoverInput, type GenerateAlbumCoverOutput } from '@/ai/flows/generate-album-cover';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase'; // Asegúrate de que este archivo esté configurado
import { v4 as uuidv4 } from 'uuid'; // Necesitarás instalar uuid: npm install uuid && npm install @types/uuid


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

interface UploadCoverImagePayload {
    imageDataUri: string;
}

interface UploadCoverImageResponse {
    downloadUrl?: string;
    error?: string;
}

export async function uploadCoverImageAction(payload: UploadCoverImagePayload): Promise<UploadCoverImageResponse> {
    const { imageDataUri } = payload;
    
    if (!imageDataUri) {
        return { error: 'No se proporcionó la imagen.' };
    }

    try {
        const storage = getStorage(app);
        const imageId = uuidv4();
        const storageRef = ref(storage, `covers/${imageId}.png`);

        // Sube la imagen desde el Data URI (formato base64)
        const uploadResult = await uploadString(storageRef, imageDataUri, 'data_url');
        
        // Obtiene la URL de descarga pública
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        console.log('Imagen subida a Firebase Storage. URL:', downloadUrl);
        return { downloadUrl };

    } catch (error) {
        console.error("Error al subir la imagen a Firebase Storage:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
        return { error: `No se pudo subir la imagen: ${errorMessage}` };
    }
}
    

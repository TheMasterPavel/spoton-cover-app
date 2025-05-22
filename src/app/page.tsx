
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Music2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';

const initialFormValues: CoverFormValues & { coverImageUrl?: string | null } = {
  songTitle: 'Melodía Increíble',
  artistName: 'Los Gatos Geniales',
  coverImageFile: undefined,
  coverImageUrl: 'https://placehold.co/600x600.png', // Default placeholder
  durationMinutes: 3,
  durationSeconds: 30,
  progressPercentage: 40,
};

export default function HomePage() {
  const { toast } = useToast();
  const [previewState, setPreviewState] = useState({
    ...initialFormValues,
    isPlaying: false,
  });
  const coverPreviewRef = useRef<HTMLDivElement>(null);

  const handleFormChange = useCallback((newValues: Partial<CoverFormValues & { coverImageUrl?: string | null }>) => {
    setPreviewState(currentPreviewState => {
      const updatedState = { ...currentPreviewState, ...newValues };

      // Ensure numeric fields are numbers, with fallbacks
      if (newValues.durationMinutes !== undefined) {
        updatedState.durationMinutes = isNaN(Number(newValues.durationMinutes)) ? currentPreviewState.durationMinutes : Number(newValues.durationMinutes);
      }
      if (newValues.durationSeconds !== undefined) {
        updatedState.durationSeconds = isNaN(Number(newValues.durationSeconds)) ? currentPreviewState.durationSeconds : Number(newValues.durationSeconds);
      }
      if (newValues.progressPercentage !== undefined) {
        updatedState.progressPercentage = isNaN(Number(newValues.progressPercentage)) ? currentPreviewState.progressPercentage : Number(newValues.progressPercentage);
      }
      
      // If coverImageFile is being cleared (e.g. by AI generation success), ensure coverImageUrl is also updated if needed.
      // If newValues contains coverImageUrl, it takes precedence.
      // If newValues explicitly sets coverImageFile to undefined (meaning AI generated or cleared),
      // and no new coverImageUrl is provided by AI, we might need to revert to placeholder if newValues.coverImageUrl is also undefined/null.
      // However, AI generation *provides* a coverImageUrl. User clearing the file input will also provide a new placeholder URL.
      // So, this logic should largely be okay. The key is that if coverImageFile is changed, coverImageUrl MUST also be provided in newValues.

      return updatedState;
    });
  }, []);


  const handlePlayPauseToggle = useCallback(() => {
    setPreviewState(prevState => ({ ...prevState, isPlaying: !prevState.isPlaying }));
  }, []);

  useEffect(() => {
    // This effect ensures that if coverImageUrl becomes empty or null for any reason
    // (e.g. an error during AI generation or an unexpected state update),
    // it reverts to the initial placeholder.
    if (!previewState.coverImageUrl) {
      setPreviewState(prevState => ({
        ...prevState,
        coverImageUrl: initialFormValues.coverImageUrl
      }));
    }
  }, [previewState.coverImageUrl, initialFormValues.coverImageUrl]);

  const handleDownload = useCallback(async () => {
    const elementToCapture = coverPreviewRef.current;
    if (!elementToCapture) {
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo encontrar el elemento de previsualización para descargar.',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }

    const originalImageContainer = elementToCapture.querySelector<HTMLDivElement>('#cover-image-container');
    if (!originalImageContainer) {
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo encontrar el sub-elemento contenedor de la imagen original.',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }
    const oicWidth = originalImageContainer.offsetWidth;
    const oicHeight = originalImageContainer.offsetHeight;


    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null, // Crucial for transparency
        width: elementToCapture.offsetWidth,
        height: elementToCapture.offsetHeight,
        scale: window.devicePixelRatio || 1,
        logging: false,
        imageTimeout: 30000,
        removeContainer: true,
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone: (documentClone) => {
          // Force transparency on root elements of the cloned document
          documentClone.documentElement.style.setProperty('background-color', 'transparent', 'important');
          documentClone.body.style.setProperty('background-color', 'transparent', 'important');

          const clonedCard = documentClone.getElementById('cover-preview-for-canvas');
          const clonedCardContent = documentClone.getElementById('card-content-for-canvas');
          const imageContainer = documentClone.getElementById('cover-image-container');

          if (clonedCard) {
            clonedCard.style.setProperty('background-color', 'transparent', 'important');
            clonedCard.style.boxShadow = 'none';
            clonedCard.style.border = 'none';
          }
          if (clonedCardContent) {
            clonedCardContent.style.setProperty('background-color', 'transparent', 'important');
          }

          if (imageContainer) {
            imageContainer.style.width = `${oicWidth}px`;
            imageContainer.style.height = `${oicHeight}px`;
            imageContainer.style.backgroundSize = 'cover';
            imageContainer.style.backgroundPosition = 'center center';
            imageContainer.style.backgroundRepeat = 'no-repeat';
            imageContainer.style.borderRadius = '0.375rem';
            imageContainer.style.overflow = 'hidden';
            // Ensure the image container itself is transparent for the capture
            imageContainer.style.setProperty('background-color', 'transparent', 'important');
          }
        },
      });
      const imageMimeType = 'image/png';
      const imageUrlToDownload = canvas.toDataURL(imageMimeType);

      const link = document.createElement('a');
      link.href = imageUrlToDownload;
      link.download = 'spotify_cover.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Descarga Iniciada',
        description: 'Tu portada personalizada se está descargando.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error al generar la imagen para descarga con html2canvas:', error);
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo generar la imagen de la portada. Revisa la consola para más detalles e inténtalo de nuevo.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [toast]);

  const totalDurationSeconds = (previewState.durationMinutes * 60) + previewState.durationSeconds;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Music2 size={36} className="text-primary" />
          <h1 className="text-4xl font-bold">SpotOn Cover</h1>
        </div>
        <p className="text-muted-foreground">Crea tu portada de canción perfecta, al estilo Spotify.</p>
      </header>

      <div className="flex flex-col items-center gap-8 lg:gap-12 w-full max-w-3xl px-4">
        <div className="w-full">
          <CoverForm
            onFormChange={handleFormChange}
            initialValues={initialFormValues}
            onDownload={handleDownload}
          />
        </div>

        <div className="w-full mt-8 flex justify-center">
          <CoverPreview
            ref={coverPreviewRef}
            songTitle={previewState.songTitle}
            artistName={previewState.artistName}
            imageUrl={previewState.coverImageUrl}
            durationSeconds={totalDurationSeconds}
            progressPercentage={previewState.progressPercentage}
            isPlaying={previewState.isPlaying}
            onPlayPauseToggle={handlePlayPauseToggle}
          />
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SpotOn Cover. Todos los derechos reservados (aplicación conceptual).</p>
        <p>Inspirado en la interfaz de usuario de Spotify. No afiliado a Spotify.</p>
      </footer>
    </main>
  );
}


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
  coverImageUrl: 'https://placehold.co/600x600.png',
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

  const handleFormChange = useCallback((values: Partial<CoverFormValues & { coverImageUrl?: string | null }>) => {
    setPreviewState(prevState => {
      const updatedState = {
        ...prevState,
        ...values,
      };

      if (values.coverImageUrl !== undefined) {
        updatedState.coverImageUrl = values.coverImageUrl;
      }
      
      if (values.durationMinutes !== undefined) {
        updatedState.durationMinutes = isNaN(Number(values.durationMinutes)) ? prevState.durationMinutes : Number(values.durationMinutes);
      }
      if (values.durationSeconds !== undefined) {
        updatedState.durationSeconds = isNaN(Number(values.durationSeconds)) ? prevState.durationSeconds : Number(values.durationSeconds);
      }
      if (values.progressPercentage !== undefined) {
        updatedState.progressPercentage = isNaN(Number(values.progressPercentage)) ? prevState.progressPercentage : Number(values.progressPercentage);
      }
      
      return updatedState;
    });
  }, []);

  const handlePlayPauseToggle = useCallback(() => {
    setPreviewState(prevState => ({ ...prevState, isPlaying: !prevState.isPlaying }));
  }, []);

  useEffect(() => {
    if (!previewState.coverImageUrl) {
      setPreviewState(prevState => ({
        ...prevState,
        coverImageUrl: initialFormValues.coverImageUrl
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewState.coverImageUrl]);

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

    try {
      // Aumentar la demora para asegurar que estilos, fuentes e imágenes se hayan renderizado completamente
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentado a 1000ms

      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true, 
        useCORS: true,    
        backgroundColor: null, // Dejar que el fondo del elemento se use
        width: elementToCapture.offsetWidth, 
        height: elementToCapture.offsetHeight, 
        scale: 1, // Mantener escala 1 para depurar problemas de diseño primero
        logging: true, 
        imageTimeout: 20000, // Aumentar tiempo de espera para imágenes
        removeContainer: true,
        scrollX: 0, // Asegurar que la captura empiece en el origen del elemento
        scrollY: 0,
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

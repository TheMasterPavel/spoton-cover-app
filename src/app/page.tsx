
'use client';

import { useState, useCallback, useEffect, useRef } from 'react'; // Add useRef
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Music2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas'; // Import html2canvas

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
  const coverPreviewRef = useRef<HTMLDivElement>(null); // Create a ref for CoverPreview

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
    if (!coverPreviewRef.current) {
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo encontrar el elemento de previsualización para descargar.',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }

    try {
      // Asegurarse de que la imagen de next/image esté completamente cargada
      // A veces html2canvas puede tener problemas con imágenes cargadas de forma asíncrona.
      // Pequeña demora para dar tiempo a que las imágenes se procesen si es necesario.
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(coverPreviewRef.current, {
        useCORS: true, 
        backgroundColor: null, 
        logging: false, // Desactivar logs de html2canvas en consola
        // Forzar que se renderice con el tamaño actual del elemento, sin escalar por dpi inicialmente
        // ya que el Card tiene un max-w-sm. El tamaño resultante dependerá de eso.
        // Si se necesita una resolución específica, se pueden añadir width/height aquí, pero puede distorsionar.
        onclone: (documentClone) => {
          // Si hay problemas con next/image, aquí se podrían reemplazar por <img> normales
          // pero usualmente `unoptimized` y `priority` en `next/image` ayudan.
        }
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
      console.error('Error al generar la imagen para descarga:', error);
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo generar la imagen de la portada. Inténtalo de nuevo.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [toast]); // coverPreviewRef es estable, toast también.

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
            ref={coverPreviewRef} // Pass the ref here
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

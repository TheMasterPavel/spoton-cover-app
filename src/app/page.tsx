
'use client';

import { useState, useCallback, useEffect } from 'react';
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Music2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const handleFormChange = useCallback((values: Partial<CoverFormValues & { coverImageUrl?: string | null }>) => {
    setPreviewState(prevState => {
      const updatedState = {
        ...prevState,
        ...values,
      };

      // Ensure coverImageUrl is only updated if explicitly provided in values
      if (values.coverImageUrl !== undefined) {
        updatedState.coverImageUrl = values.coverImageUrl;
      }
      
      // Coerce duration and progress to numbers, defaulting to previous state if NaN
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
        coverImageUrl: 'https://placehold.co/600x600.png'
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount

  const handleDownload = (imageUrlToDownload: string | null | undefined) => {
    if (!imageUrlToDownload) {
      toast({
        title: 'Error de Descarga',
        description: 'No hay imagen para descargar.',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrlToDownload;
    link.download = 'spotify_cover.png'; // Desired filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'Descarga Iniciada',
      description: 'Tu portada se está descargando.',
      duration: 3000,
    });
  };

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

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full max-w-5xl items-start">
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          <CoverPreview
            songTitle={previewState.songTitle}
            artistName={previewState.artistName}
            imageUrl={previewState.coverImageUrl}
            durationSeconds={totalDurationSeconds}
            progressPercentage={previewState.progressPercentage}
            isPlaying={previewState.isPlaying}
            onPlayPauseToggle={handlePlayPauseToggle}
          />
        </div>
        <div className="w-full lg:w-1/2">
          <CoverForm
            onFormChange={handleFormChange}
            initialValues={initialFormValues}
            currentCoverImageUrl={previewState.coverImageUrl}
            onDownload={handleDownload}
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

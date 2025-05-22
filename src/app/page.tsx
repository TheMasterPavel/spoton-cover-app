
'use client';

import { useState, useCallback, useEffect } from 'react';
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Music2 } from 'lucide-react';

const initialFormValues: CoverFormValues & { coverImageUrl?: string | null } = {
  songTitle: 'Awesome Tune',
  artistName: 'The Cool Cats',
  coverImageFile: undefined,
  coverImageUrl: 'https://placehold.co/600x600.png',
  durationMinutes: 3,
  durationSeconds: 30,
  progressPercentage: 40,
};

export default function HomePage() {
  const [previewState, setPreviewState] = useState({
    ...initialFormValues,
    isPlaying: false,
  });

  const handleFormChange = useCallback((values: Partial<CoverFormValues & { coverImageUrl?: string | null }>) => {
    setPreviewState(prevState => ({
      ...prevState,
      ...values,
      // Ensure durationMinutes and durationSeconds are numbers, providing defaults if undefined/NaN
      durationMinutes: isNaN(Number(values.durationMinutes)) ? prevState.durationMinutes : Number(values.durationMinutes),
      durationSeconds: isNaN(Number(values.durationSeconds)) ? prevState.durationSeconds : Number(values.durationSeconds),
      progressPercentage: isNaN(Number(values.progressPercentage)) ? prevState.progressPercentage : Number(values.progressPercentage),
    }));
  }, []);

  const handlePlayPauseToggle = useCallback(() => {
    setPreviewState(prevState => ({ ...prevState, isPlaying: !prevState.isPlaying }));
  }, []);

  // Set a default placeholder image if none is provided from initial values or form changes.
  // This effect runs once on mount.
  useEffect(() => {
    if (!previewState.coverImageUrl) {
      setPreviewState(prevState => ({
        ...prevState,
        coverImageUrl: 'https://placehold.co/600x600.png'
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const totalDurationSeconds = (previewState.durationMinutes * 60) + previewState.durationSeconds;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Music2 size={36} className="text-primary" />
          <h1 className="text-4xl font-bold">SpotOn Cover</h1>
        </div>
        <p className="text-muted-foreground">Craft your perfect song cover, Spotify style.</p>
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
          />
        </div>
      </div>
      
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SpotOn Cover. All rights reserved (concept app).</p>
        <p>Inspired by Spotify UI. Not affiliated with Spotify.</p>
      </footer>
    </main>
  );
}

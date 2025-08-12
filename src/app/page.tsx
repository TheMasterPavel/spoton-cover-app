
'use client';
import React, { Suspense } from 'react';
import { StripePaymentHandler } from '@/components/StripePaymentHandler';
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const initialFormValues: CoverFormValues & { coverImageUrl?: string | null } = {
  songTitle: 'Melodía Increíble',
  artistName: 'Los Gatos Geniales',
  coverImageFile: undefined,
  coverImageUrl: 'https://placehold.co/600x600.png',
  durationMinutes: 3,
  durationSeconds: 30,
  progressPercentage: 40,
};

function HomePageContent() {
  const [previewState, setPreviewState] = React.useState({
    ...initialFormValues,
    isPlaying: false,
    themeMode: 'dark',
  });
  const coverPreviewRef = React.useRef<HTMLDivElement>(null);

  const handleFormChange = React.useCallback((newValues: Partial<CoverFormValues & { coverImageUrl?: string | null; coverImageFile?: FileList | undefined }>) => {
    setPreviewState(currentPreviewState => {
      const updatedState = { ...currentPreviewState };

      if (newValues.songTitle !== undefined) updatedState.songTitle = newValues.songTitle;
      if (newValues.artistName !== undefined) updatedState.artistName = newValues.artistName;
      
      if (newValues.durationMinutes !== undefined) {
        updatedState.durationMinutes = isNaN(Number(newValues.durationMinutes)) ? currentPreviewState.durationMinutes : Number(newValues.durationMinutes);
      } else if (newValues.hasOwnProperty('durationMinutes') && newValues.durationMinutes === null) {
         updatedState.durationMinutes = initialFormValues.durationMinutes;
      }

      if (newValues.durationSeconds !== undefined) {
        updatedState.durationSeconds = isNaN(Number(newValues.durationSeconds)) ? currentPreviewState.durationSeconds : Number(newValues.durationSeconds);
      } else if (newValues.hasOwnProperty('durationSeconds') && newValues.durationSeconds === null) {
         updatedState.durationSeconds = initialFormValues.durationSeconds;
      }

      if (newValues.progressPercentage !== undefined) {
        updatedState.progressPercentage = isNaN(Number(newValues.progressPercentage)) ? currentPreviewState.progressPercentage : Number(newValues.progressPercentage);
      } else if (newValues.hasOwnProperty('progressPercentage') && newValues.progressPercentage === null) {
         updatedState.progressPercentage = initialFormValues.progressPercentage;
      }
      
      if (newValues.hasOwnProperty('coverImageFile')) {
        updatedState.coverImageFile = newValues.coverImageFile;
        updatedState.coverImageUrl = newValues.coverImageUrl ?? currentPreviewState.coverImageUrl;
      } else if (newValues.hasOwnProperty('coverImageUrl')) { 
        updatedState.coverImageUrl = newValues.coverImageUrl;
        if (newValues.coverImageUrl !== currentPreviewState.coverImageUrl) {
            updatedState.coverImageFile = undefined;
        }
      }
      
      return updatedState;
    });
  }, []);

  const handlePlayPauseToggle = React.useCallback(() => {
    setPreviewState(prevState => ({ ...prevState, isPlaying: !prevState.isPlaying }));
  }, []);
  
  const handleThemeChange = (theme: 'dark' | 'light') => {
      setPreviewState(prevState => ({ ...prevState, themeMode: theme }));
  };

  return (
    <StripePaymentHandler 
      previewState={previewState} 
      setPreviewState={setPreviewState} 
      coverPreviewRef={coverPreviewRef}
    >
      {({ onDownload, isProcessingPayment }) => (
        <main className="flex flex-col items-center justify-start py-10 px-4 space-y-8 min-h-screen">
          <div className="w-full max-w-sm">
            <CoverPreview
              ref={coverPreviewRef}
              songTitle={previewState.songTitle}
              artistName={previewState.artistName}
              imageUrl={previewState.coverImageUrl}
              durationSeconds={previewState.durationMinutes * 60 + previewState.durationSeconds}
              progressPercentage={previewState.progressPercentage}
              isPlaying={previewState.isPlaying}
              onPlayPauseToggle={handlePlayPauseToggle}
              themeMode={previewState.themeMode}
            />
            <div className="flex gap-2 mt-4 mb-6 justify-center">
              <Button 
                onClick={() => handleThemeChange('light')} 
                disabled={previewState.themeMode === 'light' || isProcessingPayment}
                variant={previewState.themeMode === 'light' ? "default" : "outline"}
              >
                Elementos Negros
              </Button>
              <Button 
                onClick={() => handleThemeChange('dark')} 
                disabled={previewState.themeMode === 'dark' || isProcessingPayment}
                variant={previewState.themeMode === 'dark' ? "default" : "outline"}
              >
                Elementos Blancos
              </Button>
            </div>
          </div>

          <Separator className="w-full max-w-md" />
          
          <CoverForm
            initialValues={previewState}
            onFormChange={handleFormChange}
            onDownload={onDownload}
            isProcessingPayment={isProcessingPayment}
          />
        </main>
      )}
    </StripePaymentHandler>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <HomePageContent />
    </Suspense>
  );
}


'use client';
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CoverPreviewProps {
  songTitle: string;
  artistName: string;
  imageUrl?: string | null;
  durationSeconds: number;
  progressPercentage: number;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  themeMode: 'dark' | 'light';
}

export const CoverPreview = React.forwardRef<HTMLDivElement, CoverPreviewProps>(
  (
    {
      songTitle,
      artistName,
      imageUrl,
      durationSeconds,
      progressPercentage,
      isPlaying,
      onPlayPauseToggle,
      themeMode,
    },
    ref
  ) => {
    const currentTimeSeconds = (progressPercentage / 100) * durationSeconds;

    const textColor = themeMode === 'light' ? 'text-background' : 'text-foreground';
    const mutedTextColor = themeMode === 'light' ? 'text-neutral-600' : 'text-muted-foreground';
    const iconColor = themeMode === 'light' ? 'text-background hover:text-neutral-700' : 'text-muted-foreground hover:text-foreground';
    const playButtonBg = themeMode === 'light' ? 'bg-background text-foreground hover:bg-neutral-800' : 'bg-foreground text-background hover:bg-foreground/90';
    const playButtonIconFill = themeMode === 'light' ? 'fill-foreground' : 'fill-background';
    const placeholderIconColor = themeMode === 'light' ? 'text-neutral-400/80' : 'text-muted-foreground/50';

    return (
      <Card
        ref={ref}
        id="cover-preview-for-canvas"
        className="w-full max-w-sm bg-card shadow-xl border-none rounded-lg overflow-hidden"
      >
        <CardContent 
          id="card-content-for-canvas"
          className="p-6 flex flex-col items-center space-y-6 bg-card"
        >
          <div 
            id="cover-image-container"
            className="w-full aspect-square rounded-md overflow-hidden shadow-lg bg-muted flex items-center justify-center"
            style={imageUrl ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            } : {}}
            data-ai-hint={imageUrl ? "album cover" : "abstract music"}
          >
            {!imageUrl && (
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-music", placeholderIconColor)}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            )}
          </div>

          <div className="w-full text-left">
            <h2 className={cn("text-2xl font-bold", textColor)}>
              {songTitle || 'Título de la Canción'}
            </h2>
            <p className={cn("text-sm", mutedTextColor)}>
              {artistName || 'Nombre del Artista'}
            </p>
          </div>

          <div className="w-full space-y-2">
            <Slider
              value={[progressPercentage]}
              max={100}
              step={1}
              themeMode={themeMode} // Pass themeMode to Slider
              className="w-full" // Removed old complex Tailwind classes for slider
              aria-label="Progreso de la canción"
              disabled
            />
            <div className={cn("flex justify-between text-xs", mutedTextColor)}>
              <span>{formatTime(currentTimeSeconds)}</span>
              <span>{formatTime(durationSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center justify-around w-full space-x-2">
            <Button variant="ghost" size="icon" className={iconColor}>
              <Shuffle size={20} />
            </Button>
            <Button variant="ghost" size="icon" className={iconColor}>
              <SkipBack size={24} />
            </Button>
            <Button
              variant="default"
              size="icon"
              className={cn("rounded-full h-12 w-12", playButtonBg)}
              onClick={onPlayPauseToggle}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={28} className={playButtonIconFill} /> : <Play size={28} className={playButtonIconFill} />}
            </Button>
            <Button variant="ghost" size="icon" className={iconColor}>
              <SkipForward size={24} />
            </Button>
            <Button variant="ghost" size="icon" className={iconColor}>
              <Repeat size={20} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

CoverPreview.displayName = 'CoverPreview';

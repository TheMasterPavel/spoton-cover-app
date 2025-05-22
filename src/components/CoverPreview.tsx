
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
  themeMode: 'dark' | 'light'; // 'dark' = elementos blancos, 'light' = elementos negros
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

    // Colores base según el themeMode
    const cardBgColor = themeMode === 'light' ? 'bg-neutral-200' : 'bg-card';
    const primaryTextColor = themeMode === 'light' ? 'text-neutral-800' : 'text-foreground'; // Negro/Gris oscuro para light, Blanco para dark
    const secondaryTextColor = themeMode === 'light' ? 'text-neutral-600' : 'text-muted-foreground'; // Gris medio para light, Gris suave para dark
    
    const controlIconColor = themeMode === 'light' ? 'text-neutral-600 hover:text-neutral-900' : 'text-muted-foreground hover:text-foreground';
    
    const playButtonClasses = themeMode === 'light' 
      ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-900' // Botón oscuro con icono claro
      : 'bg-foreground text-background hover:bg-foreground/90'; // Botón claro con icono oscuro (original dark)

    const playButtonIconFillClass = themeMode === 'light' ? 'fill-neutral-100' : 'fill-background';
    
    const placeholderSvgColor = themeMode === 'light' ? 'text-neutral-500' : 'text-muted-foreground/50';


    return (
      <Card
        ref={ref}
        id="cover-preview-for-canvas"
        className={cn(
          "w-full max-w-sm shadow-xl border-none rounded-lg overflow-hidden",
          // No aplicar color de fondo a la Card directamente, se hará en CardContent
          // para facilitar la transparencia en html2canvas para el padding de la Card si lo tuviera.
        )}
      >
        <CardContent 
          id="card-content-for-canvas"
          className={cn(
            "p-6 flex flex-col items-center space-y-6",
            cardBgColor // El fondo se aplica aquí
          )}
        >
          <div 
            id="cover-image-container"
            className={cn(
              "w-full aspect-square rounded-md overflow-hidden shadow-lg flex items-center justify-center",
              imageUrl ? '' : (themeMode === 'light' ? 'bg-neutral-300' : 'bg-muted') // Fondo para placeholder
            )}
            style={imageUrl ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            } : {}}
            data-ai-hint={imageUrl ? "album cover" : "abstract music"}
          >
            {!imageUrl && (
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-music", placeholderSvgColor)}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            )}
          </div>

          <div className="w-full text-left">
            <h2 className={cn("text-2xl font-bold", primaryTextColor)}>
              {songTitle || 'Título de la Canción'}
            </h2>
            <p className={cn("text-sm", secondaryTextColor)}>
              {artistName || 'Nombre del Artista'}
            </p>
          </div>

          <div className="w-full space-y-2">
            <Slider
              value={[progressPercentage]}
              max={100}
              step={1}
              themeMode={themeMode} 
              className="w-full" 
              aria-label="Progreso de la canción"
              disabled
            />
            <div className={cn("flex justify-between text-xs", secondaryTextColor)}>
              <span>{formatTime(currentTimeSeconds)}</span>
              <span>{formatTime(durationSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center justify-around w-full space-x-2">
            <Button variant="ghost" size="icon" className={controlIconColor}>
              <Shuffle size={20} />
            </Button>
            <Button variant="ghost" size="icon" className={controlIconColor}>
              <SkipBack size={24} />
            </Button>
            <Button
              variant="default"
              size="icon"
              className={cn("rounded-full h-12 w-12", playButtonClasses)}
              onClick={onPlayPauseToggle}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={28} className={playButtonIconFillClass} /> : <Play size={28} className={playButtonIconFillClass} />}
            </Button>
            <Button variant="ghost" size="icon" className={controlIconColor}>
              <SkipForward size={24} />
            </Button>
            <Button variant="ghost" size="icon" className={controlIconColor}>
              <Repeat size={20} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

CoverPreview.displayName = 'CoverPreview';


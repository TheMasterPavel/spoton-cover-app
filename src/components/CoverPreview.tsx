import Image from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface CoverPreviewProps {
  songTitle: string;
  artistName: string;
  imageUrl?: string | null;
  durationSeconds: number; // Total duration in seconds
  progressPercentage: number; // Current progress as a percentage (0-100)
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
}

export function CoverPreview({
  songTitle,
  artistName,
  imageUrl,
  durationSeconds,
  progressPercentage,
  isPlaying,
  onPlayPauseToggle,
}: CoverPreviewProps) {
  const currentTimeSeconds = (progressPercentage / 100) * durationSeconds;

  return (
    <Card className="w-full max-w-sm bg-card shadow-xl border-none rounded-lg overflow-hidden">
      <CardContent className="p-6 flex flex-col items-center space-y-6">
        <div className="relative w-full aspect-square rounded-md overflow-hidden shadow-lg">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={songTitle || 'Album art'}
              layout="fill"
              objectFit="cover"
              className="rounded-md"
              data-ai-hint="album cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center rounded-md" data-ai-hint="abstract music">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music text-muted-foreground/50"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
          )}
        </div>

        <div className="w-full text-center">
          <h2 className="text-2xl font-bold text-foreground truncate" title={songTitle || "Song Title"}>
            {songTitle || 'Song Title'}
          </h2>
          <p className="text-muted-foreground text-sm truncate" title={artistName || "Artist Name"}>
            {artistName || 'Artist Name'}
          </p>
        </div>

        <div className="w-full space-y-2">
          <Slider
            value={[progressPercentage]}
            max={100}
            step={1}
            className="w-full [&>span:first-child>span]:bg-primary [&>span:nth-child(2)]:bg-spotify-green"
            aria-label="Song progress"
            disabled // Visually represents progress, not user-interactive in this preview
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTimeSeconds)}</span>
            <span>{formatTime(durationSeconds)}</span>
          </div>
        </div>

        <div className="flex items-center justify-around w-full space-x-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Shuffle size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <SkipBack size={24} />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full h-12 w-12"
            onClick={onPlayPauseToggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={28} className="fill-background" /> : <Play size={28} className="fill-background ml-1" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <SkipForward size={24} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Repeat size={20} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

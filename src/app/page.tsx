
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Music2, ShieldCheck, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export default function HomePage() {
  const { toast } = useToast();
  const [previewState, setPreviewState] = useState({
    ...initialFormValues,
    isPlaying: false,
  });
  const coverPreviewRef = useRef<HTMLDivElement>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  const handleFormChange = useCallback((newValues: Partial<CoverFormValues & { coverImageUrl?: string | null; coverImageFile?: FileList | undefined }>) => {
    setPreviewState(currentPreviewState => {
      const updatedState = { ...currentPreviewState };

      // Merge known fields carefully
      if (newValues.songTitle !== undefined) updatedState.songTitle = newValues.songTitle;
      if (newValues.artistName !== undefined) updatedState.artistName = newValues.artistName;
      
      if (newValues.durationMinutes !== undefined) {
        updatedState.durationMinutes = isNaN(Number(newValues.durationMinutes)) ? currentPreviewState.durationMinutes : Number(newValues.durationMinutes);
      } else if (newValues.hasOwnProperty('durationMinutes') && newValues.durationMinutes === null) { // Allow resetting to initial or null
         updatedState.durationMinutes = initialFormValues.durationMinutes;
      }

      if (newValues.durationSeconds !== undefined) {
        updatedState.durationSeconds = isNaN(Number(newValues.durationSeconds)) ? currentPreviewState.durationSeconds : Number(newValues.durationSeconds);
      } else if (newValues.hasOwnProperty('durationSeconds') && newValues.durationSeconds === null) { // Allow resetting
         updatedState.durationSeconds = initialFormValues.durationSeconds;
      }

      if (newValues.progressPercentage !== undefined) {
        updatedState.progressPercentage = isNaN(Number(newValues.progressPercentage)) ? currentPreviewState.progressPercentage : Number(newValues.progressPercentage);
      } else if (newValues.hasOwnProperty('progressPercentage') && newValues.progressPercentage === null) { // Allow resetting
         updatedState.progressPercentage = initialFormValues.progressPercentage;
      }
      
      // Explicitly handle image fields only if they are part of newValues
      // This ensures slider changes or text input changes don't accidentally clear the image
      if (newValues.hasOwnProperty('coverImageFile')) {
        updatedState.coverImageFile = newValues.coverImageFile;
      }
      if (newValues.hasOwnProperty('coverImageUrl')) {
        updatedState.coverImageUrl = newValues.coverImageUrl;
      }
      
      return updatedState;
    });
  }, []);


  const handlePlayPauseToggle = useCallback(() => {
    setPreviewState(prevState => ({ ...prevState, isPlaying: !prevState.isPlaying }));
  }, []);

  useEffect(() => {
    // This effect ensures that if an image is cleared (e.g. user removes a file),
    // it reverts to the initial placeholder, not just blank.
    if (!previewState.coverImageUrl && !previewState.coverImageFile && initialFormValues.coverImageUrl) { 
      setPreviewState(prevState => ({
        ...prevState,
        coverImageUrl: initialFormValues.coverImageUrl
      }));
    }
  }, [previewState.coverImageUrl, previewState.coverImageFile, initialFormValues.coverImageUrl]);

  const captureAndDownloadCover = useCallback(async () => {
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
      // Brief delay to allow DOM updates and image rendering
      await new Promise(resolve => setTimeout(resolve, 500)); 

      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null, 
        width: elementToCapture.offsetWidth,
        height: elementToCapture.offsetHeight,
        scale: 2, 
        logging: false, 
        imageTimeout: 15000, 
        scrollX: 0,
        scrollY: -window.scrollY, 
        onclone: (documentClone) => {
          // Ensure the cloned document's root elements are transparent for the capture
          documentClone.documentElement.style.setProperty('background-color', 'transparent', 'important');
          documentClone.body.style.setProperty('background-color', 'transparent', 'important');
          
          const clonedCard = documentClone.getElementById('cover-preview-for-canvas');
          const clonedCardContent = documentClone.getElementById('card-content-for-canvas');
          const imageContainerClone = documentClone.getElementById('cover-image-container');

          if (clonedCard) {
            clonedCard.style.setProperty('background-color', 'transparent', 'important');
            clonedCard.style.setProperty('background', 'transparent', 'important'); // Ensure all background properties are transparent
            clonedCard.style.boxShadow = 'none';
            clonedCard.style.border = 'none';
          }
          if (clonedCardContent) {
            clonedCardContent.style.setProperty('background-color', 'transparent', 'important');
            clonedCardContent.style.setProperty('background', 'transparent', 'important');
          }

          if (imageContainerClone) {
            imageContainerClone.style.width = `${oicWidth}px`;
            imageContainerClone.style.height = `${oicHeight}px`;
            
            // Explicitly re-apply background image styles to the clone
            if (previewState.coverImageUrl) {
              imageContainerClone.style.backgroundImage = `url(${previewState.coverImageUrl})`;
              imageContainerClone.style.backgroundSize = 'cover';
              imageContainerClone.style.backgroundPosition = 'center center';
              imageContainerClone.style.backgroundRepeat = 'no-repeat';
              imageContainerClone.style.backgroundColor = ''; // Ensure no competing background color
            } else {
              // Handle placeholder: make background transparent and clear any potential lingering backgroundImage
              imageContainerClone.style.setProperty('background-color', 'transparent', 'important');
              imageContainerClone.style.backgroundImage = '';
            }
            
            imageContainerClone.style.borderRadius = '0.375rem'; // Corresponds to rounded-md
            imageContainerClone.style.overflow = 'hidden'; // Important for cover effect
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
  }, [toast, previewState.coverImageUrl]); // Added previewState.coverImageUrl

  const handleInitiateDownload = () => {
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPaymentAndDownload = () => {
    setIsPaymentDialogOpen(false);
    toast({
      title: "Pago Confirmado (Simulado)",
      description: "Gracias por tu compra. Iniciando descarga...",
      className: "bg-green-600 text-white", 
      duration: 3000,
    });
    captureAndDownloadCover();
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

      <div className="flex flex-col items-center gap-8 lg:gap-12 w-full max-w-3xl px-4">
        
        <div className="w-full">
          <CoverForm
            onFormChange={handleFormChange}
            initialValues={initialFormValues}
            onDownload={handleInitiateDownload}
          />
        </div>
        
        <div className="w-full max-w-sm mx-auto space-y-4">
          <div className="flex items-center justify-between p-3 bg-card rounded-lg shadow-md">
              <p className="text-sm font-medium text-foreground flex items-center">
                <Palette size={18} className="mr-2 text-primary"/>
                Elementos Previsualización:
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setThemeMode('dark')} 
                  variant={themeMode === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  disabled={themeMode === 'dark'}
                  aria-label="Cambiar a elementos blancos (fondo oscuro previsualización)"
                  className={themeMode === 'dark' ? 'border-primary text-primary' : ''}
                >
                  Blancos
                </Button>
                <Button 
                  onClick={() => setThemeMode('light')} 
                  variant={themeMode === 'light' ? 'default' : 'outline'}
                  size="sm"
                  disabled={themeMode === 'light'}
                  aria-label="Cambiar a elementos negros (fondo claro previsualización)"
                   className={themeMode === 'light' ? 'border-primary text-primary' : ''}
                >
                  Negros
                </Button>
              </div>
          </div>
          <Separator />
        </div>


        <div className="w-full mt-2 flex justify-center">
          <CoverPreview
            ref={coverPreviewRef}
            songTitle={previewState.songTitle}
            artistName={previewState.artistName}
            imageUrl={previewState.coverImageUrl}
            durationSeconds={totalDurationSeconds}
            progressPercentage={previewState.progressPercentage}
            isPlaying={previewState.isPlaying}
            onPlayPauseToggle={handlePlayPauseToggle}
            themeMode={themeMode}
          />
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SpotOn Cover. Todos los derechos reservados (aplicación conceptual).</p>
        <p>Inspirado en la interfaz de usuario de Spotify. No afiliado a Spotify.</p>
      </footer>

      <AlertDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
              Confirmar Compra
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de adquirir tu portada personalizada por un precio único de <strong>0,99€</strong>.
              Este es un pago simulado para demostración.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPaymentAndDownload} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Pagar 0,99€ y Descargar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

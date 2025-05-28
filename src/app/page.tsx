
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Music2, ShieldCheck, Palette, Loader2 } from 'lucide-react';
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
import { createCheckoutSession } from '@/lib/stripeActions';
import { loadStripe, type Stripe } from '@stripe/stripe-js';

const initialFormValues: CoverFormValues & { coverImageUrl?: string | null } = {
  songTitle: 'Melodía Increíble',
  artistName: 'Los Gatos Geniales',
  coverImageFile: undefined,
  coverImageUrl: 'https://placehold.co/600x600.png',
  durationMinutes: 3,
  durationSeconds: 30,
  progressPercentage: 40,
};

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error("La clave publicable de Stripe no está configurada.");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);


  const handleFormChange = useCallback((newValues: Partial<CoverFormValues & { coverImageUrl?: string | null; coverImageFile?: FileList | undefined }>) => {
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
  }, [initialFormValues.durationMinutes, initialFormValues.durationSeconds, initialFormValues.progressPercentage, initialFormValues.coverImageUrl]);


  const handlePlayPauseToggle = useCallback(() => {
    setPreviewState(prevState => ({ ...prevState, isPlaying: !prevState.isPlaying }));
  }, []);

  useEffect(() => {
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
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null, 
        width: elementToCapture.offsetWidth,
        height: elementToCapture.offsetHeight,
        scale: 2, 
        logging: true, 
        imageTimeout: 20000, 
        scrollX: 0,
        scrollY: typeof window !== 'undefined' ? -window.scrollY : 0,
        onclone: (documentClone) => {
          documentClone.documentElement.style.setProperty('background-color', 'transparent', 'important');
          documentClone.body.style.setProperty('background-color', 'transparent', 'important');
          
          const clonedCard = documentClone.getElementById('cover-preview-for-canvas');
          const clonedCardContent = documentClone.getElementById('card-content-for-canvas');
          const imageContainerClone = documentClone.getElementById('cover-image-container');

          if (clonedCard) {
            clonedCard.style.setProperty('background-color', 'transparent', 'important');
            clonedCard.style.setProperty('background', 'transparent', 'important');
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
            
            if (previewState.coverImageUrl) {
              imageContainerClone.style.backgroundImage = `url(${previewState.coverImageUrl})`;
              imageContainerClone.style.backgroundSize = 'cover';
              imageContainerClone.style.backgroundPosition = 'center center';
              imageContainerClone.style.backgroundRepeat = 'no-repeat';
            } else {
              imageContainerClone.style.setProperty('background-color', 'transparent', 'important');
              imageContainerClone.style.backgroundImage = ''; 
            }
            
            imageContainerClone.style.borderRadius = '0.375rem'; 
            imageContainerClone.style.overflow = 'hidden'; 
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
  }, [toast, previewState.coverImageUrl]); 

  const handleInitiateDownload = () => {
    setIsPaymentDialogOpen(true);
  };

  const handleStripeCheckout = async () => {
    setIsProcessingPayment(true);
    // No cerramos el diálogo aquí, se cierra si Stripe redirige o por el usuario
    
    try {
      localStorage.setItem('spotOnCoverPreviewState', JSON.stringify(previewState));
    } catch (e) {
      console.error("Error al guardar estado en localStorage:", e);
      toast({
        title: "Error",
        description: "No se pudo guardar el estado de tu portada. Por favor, intenta de nuevo.",
        variant: "destructive",
        duration: 3000
      });
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false); // Cerrar dialogo en caso de error
      return;
    }

    const { sessionId, error: sessionError } = await createCheckoutSession();

    if (sessionError || !sessionId) {
      toast({
        title: 'Error al Iniciar Pago',
        description: sessionError || 'No se pudo crear la sesión de pago. Inténtalo de nuevo.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState'); 
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false); // Cerrar dialogo en caso de error
      return;
    }

    const stripe = await getStripe();
    if (!stripe) {
        toast({
            title: 'Error de Stripe',
            description: 'No se pudo cargar la librería de Stripe. Revisa la configuración.',
            variant: 'destructive',
            duration: 5000,
        });
        localStorage.removeItem('spotOnCoverPreviewState');
        setIsProcessingPayment(false);
        setIsPaymentDialogOpen(false); // Cerrar dialogo en caso de error
        return;
    }

    const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

    if (stripeError) {
      console.error('Error al redirigir a Stripe Checkout:', stripeError);
      toast({
        title: 'Error al Redirigir a Pago',
        description: stripeError.message || 'No se pudo redirigir a la página de pago. Inténtalo de nuevo.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false); // Cerrar dialogo en caso de error
    }
    // Si todo va bien, la página redirigirá, no es necesario resetear isProcessingPayment aquí.
    // El diálogo se cerrará automáticamente si la redirección ocurre.
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCanceled = urlParams.get('payment_canceled');

    const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
    if (savedStateString) {
      try {
        const savedState = JSON.parse(savedStateString);
        if (JSON.stringify(savedState) !== JSON.stringify(previewState)) {
            setPreviewState(savedState);
        }
      } catch (e) {
        console.error("Error al parsear estado de localStorage:", e);
      }
    }
    
    if (paymentSuccess) {
      toast({
        title: '¡Pago Exitoso!',
        description: 'Gracias por tu compra. Iniciando descarga de tu portada...',
        className: 'bg-green-600 text-white',
        duration: 4000,
      });
      setTimeout(() => {
        if (savedStateString) { 
            captureAndDownloadCover();
        } else {
            console.warn("Pago exitoso pero no se encontró estado guardado para la descarga.")
        }
        localStorage.removeItem('spotOnCoverPreviewState');
        window.history.replaceState(null, '', window.location.pathname);
      }, 500); 
    }

    if (paymentCanceled) {
      toast({
        title: 'Pago Cancelado',
        description: 'El proceso de pago fue cancelado. Puedes intentarlo de nuevo.',
        variant: 'destructive',
        duration: 4000,
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, captureAndDownloadCover]); 
  // Nota: previewState se omitió intencionadamente de las dependencias para evitar
  // re-ejecutar este efecto cada vez que previewState cambie, ya que solo nos
  // interesa al cargar la página y al restaurar el estado desde localStorage.
  // captureAndDownloadCover tiene sus propias dependencias.

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
            isProcessingPayment={isProcessingPayment}
          />
        </div>
        
        <div className="w-full max-w-sm mx-auto space-y-4">
          <div className="flex items-center justify-between p-3 bg-card rounded-lg shadow-md">
              <p className="text-sm font-medium text-foreground flex items-center">
                <Palette size={18} className="mr-2 text-primary"/>
                Previsualización (Elementos):
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setThemeMode('dark')} 
                  variant={themeMode === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  disabled={themeMode === 'dark'}
                  aria-label="Cambiar a elementos blancos (fondo oscuro previsualización)"
                  className={themeMode === 'dark' ? 'border-primary text-primary cursor-not-allowed' : 'border-input hover:bg-accent hover:text-accent-foreground'}
                >
                  Blancos
                </Button>
                <Button 
                  onClick={() => setThemeMode('light')} 
                  variant={themeMode === 'light' ? 'default' : 'outline'}
                  size="sm"
                  disabled={themeMode === 'light'}
                  aria-label="Cambiar a elementos negros (fondo claro previsualización)"
                  className={themeMode === 'light' ? 'border-primary text-primary cursor-not-allowed' : 'border-input hover:bg-accent hover:text-accent-foreground'}
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
              Serás redirigido a Stripe para completar el pago de forma segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingPayment} onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStripeCheckout} // <--- AQUÍ ESTÁ EL CAMBIO IMPORTANTE
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pagar 0,99€ y Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

    
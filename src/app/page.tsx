'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
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
import { createCheckoutSession } from '@/lib/stripeActions'; // Assuming this is the correct path
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useRouter and useSearchParams


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
  const router = useRouter();
  const searchParams = useSearchParams();

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
  }, []);

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

    // Capture dimensions from the live DOM element
    const oicWidth = originalImageContainer.offsetWidth;
    const oicHeight = originalImageContainer.offsetHeight;


    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        logging: false, 
        width: elementToCapture.offsetWidth,
        height: elementToCapture.offsetHeight,
        scale: 2, // window.devicePixelRatio || 1, 
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
            clonedCard.style.boxShadow = 'none';
            clonedCard.style.border = 'none';
          }
          if (clonedCardContent) {
            clonedCardContent.style.setProperty('background-color', 'transparent', 'important');
          }

          if (imageContainerClone) {
            // Apply captured dimensions to the cloned container
            imageContainerClone.style.width = `${oicWidth}px`;
            imageContainerClone.style.height = `${oicHeight}px`;

            if (previewState.coverImageUrl) {
                // Re-apply background image styles explicitly to the clone
                imageContainerClone.style.backgroundImage = `url(${previewState.coverImageUrl})`;
                imageContainerClone.style.backgroundSize = 'cover';
                imageContainerClone.style.backgroundPosition = 'center';
                imageContainerClone.style.backgroundRepeat = 'no-repeat';
                // No explicit background-color if image is present
            } else {
                // If no image, ensure placeholder container is transparent
                imageContainerClone.style.backgroundImage = ''; // Clear any potential inherited BG image
                imageContainerClone.style.setProperty('background-color', 'transparent', 'important');
            }
            imageContainerClone.style.borderRadius = '0.375rem'; 
            imageContainerClone.style.overflow = 'hidden';
          }
        },
      });

      const imageUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageUrl;
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
      console.error('Error al generar la imagen:', error);
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo generar la imagen de la portada. Revisa la consola e inténtalo de nuevo.',
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

    try {
      localStorage.setItem('spotOnCoverPreviewState', JSON.stringify(previewState));
    } catch (e) {
      console.error("Error al guardar estado en localStorage:", e);
      toast({
        title: "Error",
        description: "No se pudo guardar el estado de tu portada.",
        variant: "destructive",
        duration: 3000,
      });
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false);
      return;
    }

    const { sessionId, error: sessionError } = await createCheckoutSession();

    if (sessionError || !sessionId) {
      toast({
        title: 'Error al Iniciar Pago',
        description: sessionError || 'No se pudo crear la sesión de pago.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false);
      return;
    }

    const stripe = await getStripe();
    if (!stripe) {
      toast({
        title: 'Error de Stripe',
        description: 'No se pudo cargar la librería de Stripe.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false);
      return;
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      toast({
        title: 'Error al Redirigir',
        description: error.message || 'No se pudo redirigir a Stripe.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState');
    }
    // setIsProcessingPayment and setIsPaymentDialogOpen are handled by page navigation or error
  };

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const paymentCanceled = searchParams.get('payment_canceled');
    const currentPath = window.location.pathname;

    if (paymentSuccess === 'true') {
      toast({
        title: '¡Pago Exitoso!',
        description: 'Tu descarga comenzará en breve.',
        duration: 5000,
      });
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
      if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          setPreviewState(savedState); // Restore state
          // Wait for state to apply and preview to re-render before downloading
          setTimeout(() => {
             captureAndDownloadCover();
          }, 500);
        } catch (e) {
          console.error("Error al restaurar estado desde localStorage:", e);
        }
      } else {
        // Fallback if no saved state, maybe just download with current (potentially default) state
        // or show another message. For now, we assume state restoration is key.
         captureAndDownloadCover();
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      router.replace(currentPath, { scroll: false }); // Remove query params
    } else if (paymentCanceled === 'true') {
      toast({
        title: 'Pago Cancelado',
        description: 'Has cancelado el proceso de pago.',
        variant: 'destructive',
        duration: 5000,
      });
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
       if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          setPreviewState(savedState); // Restore state
        } catch (e) {
          console.error("Error al restaurar estado desde localStorage:", e);
        }
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      router.replace(currentPath, { scroll: false }); // Remove query params
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, toast]); // captureAndDownloadCover is not stable, but it's complex to make it so here


  return (
    <>
      <main className="flex flex-col items-center justify-center py-10 px-4 space-y-8">
        <CoverForm
          initialValues={previewState}
          onFormChange={handleFormChange}
          onDownload={handleInitiateDownload}
          isProcessingPayment={isProcessingPayment}
        />
        <Separator />
        <div className="flex gap-2 mb-4">
            <Button 
                onClick={() => setThemeMode('light')} 
                disabled={themeMode === 'light' || isProcessingPayment}
                variant={themeMode === 'light' ? "default" : "outline"}
            >
                Elementos Negros
            </Button>
            <Button 
                onClick={() => setThemeMode('dark')} 
                disabled={themeMode === 'dark' || isProcessingPayment}
                variant={themeMode === 'dark' ? "default" : "outline"}
            >
                Elementos Blancos
            </Button>
        </div>
        <CoverPreview
          ref={coverPreviewRef}
          songTitle={previewState.songTitle}
          artistName={previewState.artistName}
          imageUrl={previewState.coverImageUrl}
          durationSeconds={previewState.durationMinutes * 60 + previewState.durationSeconds}
          progressPercentage={previewState.progressPercentage}
          isPlaying={previewState.isPlaying}
          onPlayPauseToggle={handlePlayPauseToggle}
          themeMode={themeMode}
        />
      </main>

      <AlertDialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar pago y descargar?</AlertDialogTitle>
            <AlertDialogDescription>
              Para continuar con la descarga de tu portada personalizada (0,99€), serás redirigido a Stripe para completar el pago de forma segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingPayment} onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStripeCheckout} disabled={isProcessingPayment}>
              {isProcessingPayment ? 'Procesando...' : 'Pagar 0,99€ y Continuar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

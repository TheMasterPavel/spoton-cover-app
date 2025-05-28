
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
import { createCheckoutSession } from '@/lib/stripeActions'; // Ensure this path is correct
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useRouter, useSearchParams } from 'next/navigation';


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

    const oicWidth = originalImageContainer.offsetWidth;
    const oicHeight = originalImageContainer.offsetHeight;


    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        logging: true, 
        width: elementToCapture.offsetWidth,
        height: elementToCapture.offsetHeight,
        scale: 2, 
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
            imageContainerClone.style.width = `${oicWidth}px`;
            imageContainerClone.style.height = `${oicHeight}px`;

            if (previewState.coverImageUrl) {
                imageContainerClone.style.backgroundImage = `url(${previewState.coverImageUrl})`;
                imageContainerClone.style.backgroundSize = 'cover';
                imageContainerClone.style.backgroundPosition = 'center';
                imageContainerClone.style.backgroundRepeat = 'no-repeat';
            } else {
                imageContainerClone.style.backgroundImage = ''; 
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
  }, [toast, previewState.coverImageUrl]); // oicWidth and oicHeight removed from dependencies

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
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

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
          setPreviewState(savedState); 
          setTimeout(() => {
             captureAndDownloadCover();
          }, 500); // Small delay to ensure state is applied before capture
        } catch (e) {
          console.error("Error al restaurar estado desde localStorage:", e);
           // Fallback: attempt download even if state restoration fails, though it might use default state
          captureAndDownloadCover();
        }
      } else {
         // If no saved state, attempt download (might use default state or current state if any)
         captureAndDownloadCover();
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      if (currentPath) router.replace(currentPath, { scroll: false }); 
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
          setPreviewState(savedState); 
        } catch (e) {
          console.error("Error al restaurar estado desde localStorage:", e);
          // No need to trigger download on cancel
        }
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      if (currentPath) router.replace(currentPath, { scroll: false }); 
    }
  }, [searchParams, router, toast, captureAndDownloadCover]);


  return (
    <>
      <main className="flex flex-col items-center justify-start py-10 px-4 space-y-8 min-h-screen">
        <div className="w-full max-w-sm"> {/* Container for Preview and Theme Buttons */}
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
            <div className="flex gap-2 mt-4 mb-6 justify-center">
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
        </div>

        <Separator className="w-full max-w-md" />
        
        <CoverForm
          initialValues={previewState}
          onFormChange={handleFormChange}
          onDownload={handleInitiateDownload}
          isProcessingPayment={isProcessingPayment}
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


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
import { createCheckoutSession } from '@/lib/stripeActions'; // Importar la Server Action
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

// Promesa para cargar Stripe.js solo una vez
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    console.log('Stripe Publishable Key:', publishableKey); // LOG
    if (!publishableKey) {
      console.error("La clave publicable de Stripe (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) no está configurada en las variables de entorno.");
      // No se muestra toast aquí directamente, el fallo se maneja en handleStripeCheckout
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
      
      // Manejo específico para la imagen para evitar reseteos no deseados
      if (newValues.hasOwnProperty('coverImageFile')) { // Si coverImageFile está en newValues, es una subida directa
        updatedState.coverImageFile = newValues.coverImageFile;
        updatedState.coverImageUrl = newValues.coverImageUrl ?? currentPreviewState.coverImageUrl; // Usar la nueva URL si existe
      } else if (newValues.hasOwnProperty('coverImageUrl')) { // Si solo coverImageUrl está, es de la IA o un placeholder
        updatedState.coverImageUrl = newValues.coverImageUrl;
        if (newValues.coverImageUrl !== currentPreviewState.coverImageUrl) { // Si la URL cambió, resetear el FileList
            updatedState.coverImageFile = undefined;
        }
      }
      // Si ni coverImageFile ni coverImageUrl están en newValues, se conservan los valores actuales de updatedState
      
      return updatedState;
    });
  }, []);

  const handlePlayPauseToggle = useCallback(() => {
    setPreviewState(prevState => ({ ...prevState, isPlaying: !prevState.isPlaying }));
  }, []);

  // Asegura que siempre haya una imagen de portada (placeholder si es necesario)
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

    // Capturar dimensiones del contenedor de imagen real
    const oicWidth = originalImageContainer.offsetWidth;
    const oicHeight = originalImageContainer.offsetHeight;


    try {
      // Pequeña demora para asegurar que las fuentes y estilos se apliquen
      await new Promise(resolve => setTimeout(resolve, 1500)); // Aumentada ligeramente

      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null, // Para fondo transparente
        logging: true, // Habilitar logs para depuración
        width: elementToCapture.offsetWidth,
        height: elementToCapture.offsetHeight,
        scale: 2, // Usar devicePixelRatio para mejor calidad en pantallas HiDPI
        scrollX: 0,
        scrollY: typeof window !== 'undefined' ? -window.scrollY : 0, // Manejar scroll de la página
        onclone: (documentClone) => {
          // Forzar fondo transparente para el clon que usa html2canvas
          documentClone.documentElement.style.setProperty('background-color', 'transparent', 'important');
          documentClone.body.style.setProperty('background-color', 'transparent', 'important');
          
          const clonedCard = documentClone.getElementById('cover-preview-for-canvas');
          const clonedCardContent = documentClone.getElementById('card-content-for-canvas');
          const imageContainerClone = documentClone.getElementById('cover-image-container');

          if (clonedCard) {
            clonedCard.style.setProperty('background-color', 'transparent', 'important');
            clonedCard.style.boxShadow = 'none'; // Quitar sombra para la descarga
            clonedCard.style.border = 'none'; // Quitar borde para la descarga
          }
          if (clonedCardContent) {
            clonedCardContent.style.setProperty('background-color', 'transparent', 'important');
          }

          if (imageContainerClone) {
            // Aplicar dimensiones capturadas al clon
            imageContainerClone.style.width = `${oicWidth}px`;
            imageContainerClone.style.height = `${oicHeight}px`;

            if (previewState.coverImageUrl) {
                // Re-apply background image styles directly for html2canvas
                imageContainerClone.style.backgroundImage = `url(${previewState.coverImageUrl})`;
                imageContainerClone.style.backgroundSize = 'cover';
                imageContainerClone.style.backgroundPosition = 'center';
                imageContainerClone.style.backgroundRepeat = 'no-repeat';
                // Ensure no conflicting background color if image is present
                imageContainerClone.style.backgroundColor = ''; 
            } else {
                // Si no hay imagen, el placeholder SVG está dentro, asegurar fondo transparente
                imageContainerClone.style.backgroundImage = ''; // Limpiar por si acaso
                imageContainerClone.style.setProperty('background-color', 'transparent', 'important');
            }
            imageContainerClone.style.borderRadius = '0.375rem'; // Mantener el borde redondeado del contenedor
            imageContainerClone.style.overflow = 'hidden'; // Importante para que el cover no se salga
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
  }, [previewState.coverImageUrl, toast]); // oicWidth y oicHeight se definen dentro, no son dependencias.

  // Abre el diálogo de pago
  const handleInitiateDownload = () => {
    setIsPaymentDialogOpen(true);
  };

  // Maneja el proceso de checkout con Stripe
  const handleStripeCheckout = async () => {
    console.log('handleStripeCheckout: Iniciando proceso de pago...'); // LOG 1
    setIsProcessingPayment(true); // Disable buttons

    try {
      console.log('handleStripeCheckout: Guardando estado en localStorage...'); // LOG 2
      localStorage.setItem('spotOnCoverPreviewState', JSON.stringify(previewState));
    } catch (e) {
      console.error("handleStripeCheckout: Error al guardar estado en localStorage:", e); // LOG 2.E
      toast({
        title: "Error",
        description: "No se pudo guardar el estado de tu portada.",
        variant: "destructive",
        duration: 3000,
      });
      setIsProcessingPayment(false); // Re-enable buttons
      setIsPaymentDialogOpen(false); // Close dialog
      return;
    }

    console.log('handleStripeCheckout: Llamando a createCheckoutSession Server Action...'); // LOG 3
    const { sessionId, error: sessionError } = await createCheckoutSession();
    console.log('handleStripeCheckout: Resultado de createCheckoutSession:', { sessionId, sessionError }); // LOG 4

    if (sessionError || !sessionId) {
      toast({
        title: 'Error al Iniciar Pago',
        description: sessionError || 'No se pudo crear la sesión de pago.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState'); // Clean up if session creation failed
      setIsProcessingPayment(false); // Re-enable buttons
      setIsPaymentDialogOpen(false); // Close dialog
      return;
    }

    console.log('handleStripeCheckout: Obteniendo instancia de Stripe.js...'); // LOG 5
    const stripe = await getStripe();
    console.log('handleStripeCheckout: Instancia de Stripe.js obtenida:', stripe ? 'Éxito' : 'Fallo'); // LOG 6

    if (!stripe) {
      toast({
        title: 'Error de Stripe',
        description: 'No se pudo cargar la librería de Stripe. Verifica la clave publicable (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState'); // Clean up
      setIsProcessingPayment(false); // Re-enable buttons
      setIsPaymentDialogOpen(false); // Close dialog
      return;
    }

    console.log('handleStripeCheckout: Redirigiendo a Stripe Checkout con session ID:', sessionId); // LOG 7
    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      console.error('handleStripeCheckout: Error al redirigir a Stripe:', error); // LOG 7.E
      toast({
        title: 'Error al Redirigir',
        description: error.message || 'No se pudo redirigir a Stripe.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState'); // Clean up
      // Si redirectToCheckout falla, el usuario sigue en la página, así que reseteamos estado.
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false); // Cierra el diálogo si la redirección falla
    }
    // Si la redirección es exitosa, no se necesita resetear isProcessingPayment aquí
    // porque la página cambiará. El diálogo se cerrará por el cambio de página.
  };

  // Efecto para manejar el retorno de Stripe
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const paymentCanceled = searchParams.get('payment_canceled');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    if (paymentSuccess === 'true') {
      console.log('useEffect: Pago exitoso detectado.');
      toast({
        title: '¡Pago Exitoso!',
        description: 'Tu descarga comenzará en breve.',
        duration: 5000,
      });
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
      if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          // Es crucial restaurar el estado ANTES de llamar a captureAndDownloadCover
          setPreviewState(savedState); 
          // Pequeña demora para asegurar que el estado se aplique al DOM antes de capturar
          setTimeout(() => {
             captureAndDownloadCover();
          }, 500); // Ajusta si es necesario
        } catch (e) {
          console.error("useEffect: Error al restaurar estado desde localStorage tras pago exitoso:", e);
          // Intenta descargar de todas formas si la restauración falla
          captureAndDownloadCover();
        }
      } else {
         console.warn("useEffect: No se encontró estado guardado para restaurar tras pago exitoso. Descargando con estado actual.");
         captureAndDownloadCover();
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      // Limpiar parámetros de la URL
      if (currentPath) router.replace(currentPath, { scroll: false }); 
    } else if (paymentCanceled === 'true') {
      console.log('useEffect: Pago cancelado detectado.');
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
          setPreviewState(savedState); // Restaurar estado
        } catch (e) {
          console.error("useEffect: Error al restaurar estado desde localStorage tras pago cancelado:", e);
        }
      } else {
        console.warn("useEffect: No se encontró estado guardado para restaurar tras pago cancelado.");
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      if (currentPath) router.replace(currentPath, { scroll: false }); // Limpiar parámetros URL
    }
  }, [searchParams, router, toast, captureAndDownloadCover]); // captureAndDownloadCover es una dependencia


  return (
    <>
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
          onDownload={handleInitiateDownload} // Esto abre el diálogo de pago
          isProcessingPayment={isProcessingPayment}
        />
      </main>

      <AlertDialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        // No cerrar el diálogo si se está procesando el pago, a menos que se cancele explícitamente
        if (!isProcessingPayment) {
            setIsPaymentDialogOpen(open);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pago y descargar</AlertDialogTitle>
            <AlertDialogDescription>
              Para continuar con la descarga de tu portada personalizada (0,99€), serás redirigido a Stripe para completar el pago de forma segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingPayment} onClick={() => {
                setIsPaymentDialogOpen(false);
                // Es importante resetear isProcessingPayment si el usuario cancela aquí
                // por si hubo algún error previo que lo dejó en true sin redirigir.
                if (isProcessingPayment) setIsProcessingPayment(false); 
            }}>
                Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStripeCheckout} disabled={isProcessingPayment}>
              {isProcessingPayment ? 'Procesando...' : 'Pagar 0,99€ y Continuar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    

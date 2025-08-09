
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
import { createCheckoutSession } from '@/lib/stripeActions';
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
    console.log('LOG: Stripe Publishable Key:', publishableKey);
    if (!publishableKey) {
      console.error("LOG ERROR: La clave publicable de Stripe (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) no está configurada en las variables de entorno.");
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
      } else if (newValues.hasOwnProperty('coverImageUrl')) { // Only for AI generation or explicit URL change
        updatedState.coverImageUrl = newValues.coverImageUrl;
        if (newValues.coverImageUrl !== currentPreviewState.coverImageUrl) { // if AI sets new image, clear file
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
    // If no image is actively set (neither URL nor file), AND there's a default placeholder, use it.
    if (!previewState.coverImageUrl && !previewState.coverImageFile && initialFormValues.coverImageUrl) { 
      setPreviewState(prevState => ({
        ...prevState,
        coverImageUrl: initialFormValues.coverImageUrl
      }));
    }
  }, [previewState.coverImageUrl, previewState.coverImageFile, initialFormValues.coverImageUrl]);
  
  const captureAndDownloadCover = useCallback(async () => {
    console.log('LOG: Iniciando captura y descarga...');
    const elementToCapture = coverPreviewRef.current;
    
    if (!elementToCapture) {
      toast({
        title: 'Error de Descarga',
        description: 'El elemento a capturar no existe. No se puede descargar.',
        variant: 'destructive',
        duration: 5000,
      });
      console.error('LOG ERROR: El ref `coverPreviewRef.current` es nulo.');
      return;
    }

    try {
      console.log('LOG: Llamando a html2canvas...');
      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true, 
        backgroundColor: null,
        scale: 2,
        onclone: (documentClone) => {
          const imageContainerClone = documentClone.getElementById('cover-image-container');
          if (imageContainerClone && previewState.coverImageUrl) {
            return new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const ctx = tempCanvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  const dataURL = tempCanvas.toDataURL('image/png');
                  imageContainerClone.style.backgroundImage = `url(${dataURL})`;
                }
                resolve();
              };
              img.onerror = () => {
                 console.error('LOG ERROR: La imagen no se pudo cargar desde la URL:', previewState.coverImageUrl);
                 resolve(); // Resolve anyway to not block the process
              };
              img.src = previewState.coverImageUrl;
            });
          }
          return Promise.resolve();
        },
      });
      
      console.log('LOG: html2canvas completado. Creando URL de la imagen...');
      const imageUrl = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'spoton_cover.png';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Descarga Iniciada',
        description: 'Tu portada personalizada se está descargando.',
        duration: 3000,
      });
      console.log('LOG: Descarga iniciada exitosamente.');

    } catch (error) {
      console.error('LOG ERROR: Fallo en html2canvas:', error);
      toast({
        title: 'Error de Descarga',
        description: (error instanceof Error ? `html2canvas falló: ${error.message}` : 'No se pudo generar la imagen. Revisa la consola para más detalles.'),
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [toast, previewState.coverImageUrl]);

  const handleInitiateDownload = () => {
    setIsPaymentDialogOpen(true);
  };

  const handleStripeCheckout = async () => {
    console.log('LOG 1: handleStripeCheckout: Iniciando proceso de pago...');
    setIsProcessingPayment(true);

    try {
      console.log('LOG 2: handleStripeCheckout: Guardando estado en localStorage...', previewState);
      localStorage.setItem('spotOnCoverPreviewState', JSON.stringify(previewState));
    } catch (e) {
      console.error("LOG 2.E: handleStripeCheckout: Error al guardar estado en localStorage:", e);
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

    console.log('LOG 3: handleStripeCheckout: Llamando a createCheckoutSession Server Action...');
    const { sessionId, error: sessionError } = await createCheckoutSession();
    console.log('LOG 4: handleStripeCheckout: Resultado de createCheckoutSession:', { sessionId, sessionError });

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

    console.log('LOG 5: handleStripeCheckout: Obteniendo instancia de Stripe.js...');
    const stripe = await getStripe();
    console.log('LOG 6: handleStripeCheckout: Instancia de Stripe.js obtenida:', stripe ? 'Éxito' : 'Fallo');

    if (!stripe) {
      toast({
        title: 'Error de Stripe',
        description: 'No se pudo cargar la librería de Stripe. Verifica la clave publicable (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false);
      return;
    }

    console.log('LOG 7: handleStripeCheckout: Redirigiendo a Stripe Checkout con session ID:', sessionId);
    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      console.error('LOG 7.E: handleStripeCheckout: Error al redirigir a Stripe:', error);
      toast({
        title: 'Error al Redirigir',
        description: error.message || 'No se pudo redirigir a Stripe.',
        variant: 'destructive',
        duration: 5000,
      });
      localStorage.removeItem('spotOnCoverPreviewState'); // Limpiar en caso de error de redirección
      setIsProcessingPayment(false);
      setIsPaymentDialogOpen(false); // Cerrar diálogo en caso de error
    }
    // Si la redirección tiene éxito, el usuario abandona esta página, no es necesario setIsProcessingPayment(false) aquí.
  };

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const paymentCanceled = searchParams.get('payment_canceled');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    if (paymentSuccess === 'true') {
      console.log('LOG STRIPE SUCCESS: Detectado payment_success=true');
      toast({
        title: '¡Pago Exitoso!',
        description: 'Tu descarga comenzará en breve.',
        duration: 5000,
      });
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
      console.log('LOG STRIPE SUCCESS: savedStateString de localStorage:', savedStateString ? 'Encontrado' : 'NO Encontrado');

      if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          console.log('LOG STRIPE SUCCESS: Estado parseado de localStorage:', savedState);
          setPreviewState(savedState); 
          console.log('LOG STRIPE SUCCESS: setPreviewState llamado con estado guardado. Programando descarga...');
          // Dar tiempo a React para actualizar el estado y re-renderizar antes de capturar
          setTimeout(() => {
             console.log('LOG STRIPE SUCCESS: Timeout completado, llamando a captureAndDownloadCover.');
             captureAndDownloadCover();
             localStorage.removeItem('spotOnCoverPreviewState'); // Limpiar después de usar
             console.log('LOG STRIPE SUCCESS: localStorage limpiado.');
             if (currentPath) router.replace(currentPath, { scroll: false }); // Limpiar URL
             console.log('LOG STRIPE SUCCESS: URL limpiada.');
          }, 1000); // 1000ms de demora para asegurar renderizado completo de la imagen
        } catch (e) {
          console.error("LOG STRIPE SUCCESS: Error al restaurar estado desde localStorage:", e);
          // Intentar descargar con el estado actual como fallback, aunque podría no ser el correcto
          captureAndDownloadCover();
          localStorage.removeItem('spotOnCoverPreviewState');
          if (currentPath) router.replace(currentPath, { scroll: false });
        }
      } else {
         console.warn("LOG STRIPE SUCCESS: No se encontró estado guardado. Intentando descargar con estado actual.");
         captureAndDownloadCover(); // Podría no ser el estado correcto
         // No limpiar localStorage si no se encontró nada
         if (currentPath) router.replace(currentPath, { scroll: false });
      }
    } else if (paymentCanceled === 'true') {
      console.log('LOG STRIPE CANCELED: Detectado payment_canceled=true');
      toast({
        title: 'Pago Cancelado',
        description: 'Has cancelado el proceso de pago.',
        variant: 'destructive',
        duration: 5000,
      });
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
      console.log('LOG STRIPE CANCELED: savedStateString de localStorage:', savedStateString ? 'Encontrado' : 'NO Encontrado');
       if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          console.log('LOG STRIPE CANCELED: Estado parseado de localStorage:', savedState);
          setPreviewState(savedState);
          console.log('LOG STRIPE CANCELED: setPreviewState llamado con estado guardado.');
        } catch (e) {
          console.error("LOG STRIPE CANCELED: Error al restaurar estado desde localStorage:", e);
        }
      } else {
        console.warn("LOG STRIPE CANCELED: No se encontró estado guardado para restaurar.");
      }
      localStorage.removeItem('spotOnCoverPreviewState'); // Limpiar en cualquier caso de cancelación
      console.log('LOG STRIPE CANCELED: localStorage limpiado.');
      if (currentPath) router.replace(currentPath, { scroll: false }); // Limpiar URL
      console.log('LOG STRIPE CANCELED: URL limpiada.');
    }
  }, [searchParams, router, toast, captureAndDownloadCover]);


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
          onDownload={handleInitiateDownload}
          isProcessingPayment={isProcessingPayment}
        />
      </main>

      <AlertDialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        // Permitir cerrar el diálogo si no se está procesando el pago.
        // Si se está procesando, el diálogo se gestionará por la lógica de pago.
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
                // Si el usuario cancela mientras estaba procesando (raro, pero posible si la redirección falla),
                // resetear el estado de procesamiento.
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

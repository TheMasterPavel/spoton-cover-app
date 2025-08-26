
'use client';
import type { ChangeEvent } from 'react';
import React, { Suspense, useEffect, useCallback, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import { loadStripe, type Stripe } from '@stripe/stripe-js';

import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession } from '@/lib/stripeActions';
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
      console.error("Stripe key not found.");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Este es el contenido real de la página que depende de los hooks del lado del cliente.
function HomePageContent() {
  const [previewState, setPreviewState] = useState({
    ...initialFormValues,
    isPlaying: false,
    themeMode: 'dark' as 'dark' | 'light',
  });
  const coverPreviewRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // Trigger para la descarga post-pago
  const [isReadyToDownload, setIsReadyToDownload] = useState(false);

  const captureAndDownloadCover = useCallback(async () => {
    const elementToCapture = coverPreviewRef.current;
    if (!elementToCapture) {
      toast({
        title: 'Error de Descarga',
        description: 'El elemento de previsualización no fue encontrado.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const canvas = await html2canvas(elementToCapture, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null, 
        scale: 2,
      });
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
      });
    } catch (error) {
      console.error('Error en html2canvas:', error);
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo generar la imagen. Revisa la consola.',
        variant: 'destructive',
      });
    }
  }, [coverPreviewRef, toast]);
  
  // useEffect para activar la descarga DESPUÉS de que el estado se haya restaurado y renderizado
  useEffect(() => {
    if (isReadyToDownload) {
      // Pequeño delay para asegurar que el DOM está 100% actualizado con el estado restaurado
      const timer = setTimeout(() => {
        captureAndDownloadCover();
        setIsReadyToDownload(false); // Resetear el trigger
      }, 100); 

      return () => clearTimeout(timer);
    }
  }, [isReadyToDownload, captureAndDownloadCover]);


  const handleStripeCheckout = useCallback(async () => {
    setIsPaymentDialogOpen(false); // Close dialog immediately
    setIsProcessingPayment(true);

    try {
      localStorage.setItem('spotOnCoverPreviewState', JSON.stringify(previewState));
    } catch (e) {
      toast({
        title: "Error de Almacenamiento",
        description: "No se pudo guardar el estado de tu portada.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
      return;
    }

    const { sessionId, error: sessionError } = await createCheckoutSession();
    if (sessionError || !sessionId) {
      toast({
        title: 'Error al Iniciar Pago',
        description: sessionError || 'No se pudo crear la sesión de pago.',
        variant: 'destructive',
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessingPayment(false);
      return;
    }

    const stripe = await getStripe();
    if (!stripe) {
      toast({
        title: 'Error de Configuración',
        description: 'No se pudo cargar Stripe.',
        variant: 'destructive',
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessingPayment(false);
      return;
    }

    try {
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (error: any) {
       toast({
        title: 'Error de Redirección',
        description: 'No se pudo redirigir a la página de pago.',
        variant: 'destructive',
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessingPayment(false);
    }
  }, [previewState, toast]);

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const paymentCanceled = searchParams.get('payment_canceled');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const handleSuccess = () => {
      toast({
        title: '¡Pago Exitoso!',
        description: 'Tu descarga comenzará en breve.',
      });
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
      if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          setPreviewState(savedState);
          // Activar la descarga en el siguiente renderizado
          setIsReadyToDownload(true);
        } catch (e) {
          console.error("Fallo al parsear el estado guardado desde localStorage", e);
          toast({ title: 'Error', description: 'No se pudo restaurar tu diseño.', variant: 'destructive'});
        } finally {
          localStorage.removeItem('spotOnCoverPreviewState');
          if (currentPath) router.replace(currentPath, { scroll: false });
        }
      } else {
         toast({ title: 'Aviso', description: 'No se encontró un diseño guardado. Descargando la portada actual.'});
         captureAndDownloadCover();
         if (currentPath) router.replace(currentPath, { scroll: false });
      }
    };

    const handleCancel = () => {
      toast({
        title: 'Pago Cancelado',
        description: 'Has cancelado el proceso de pago.',
        variant: 'destructive',
      });
      // Restaurar el estado en cancelación para no perder el trabajo
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
      if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          setPreviewState(savedState);
        } catch (e) { /* No hacer nada si falla */ }
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      if (currentPath) router.replace(currentPath, { scroll: false });
    };

    if (paymentSuccess === 'true') {
      handleSuccess();
    } else if (paymentCanceled === 'true') {
      handleCancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, toast]);

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
  
  const handleThemeChange = (theme: 'dark' | 'light') => {
      setPreviewState(prevState => ({ ...prevState, themeMode: theme }));
  };

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
          onDownload={captureAndDownloadCover}
          isProcessingPayment={isProcessingPayment}
        />
      </main>

      <AlertDialog open={isPaymentDialogOpen} onOpenChange={(open) => {
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
            <AlertDialogCancel disabled={isProcessingPayment} onClick={() => setIsPaymentDialogOpen(false)}>
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

// Envolvemos el contenido en <Suspense> para manejar correctamente los hooks de cliente como useSearchParams
export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <HomePageContent />
    </Suspense>
  );
}

    
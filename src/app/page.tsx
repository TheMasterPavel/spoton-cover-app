
'use client';
import type { ChangeEvent } from 'react';
import React, { Suspense, useEffect, useCallback, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { CoverForm } from '@/components/CoverForm';
import { CoverPreview } from '@/components/CoverPreview';
import type { CoverFormValues, EmailFormValues } from '@/lib/schema';
import { CoverFormSchema, EmailFormSchema } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession } from '@/lib/stripeActions';
import { saveEmailAction } from '@/lib/emailActions';

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
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';


const initialFormValues: CoverFormValues & { coverImageUrl?: string | null } = {
  songTitle: 'Nombre de la cancion',
  artistName: 'Artista',
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
  const [previewState, setPreviewState] = useState(() => {
     if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('spoton_cover_state');
      if (savedState) {
        try {
          return JSON.parse(savedState);
        } catch (e) {
          console.error("Failed to parse saved state from localStorage", e);
          // Fallback to initial state if parsing fails
        }
      }
    }
    return {
      ...initialFormValues,
      isPlaying: false,
      themeMode: 'dark' as 'dark' | 'light',
    };
  });
  const coverContentRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentAlertOpen, setIsPaymentAlertOpen] = useState(false);
  const [isEmailAlertOpen, setIsEmailAlertOpen] = useState(false);
  const [emailForFreeDownload, setEmailForFreeDownload] = useState('');
  const [emailError, setEmailError] = useState('');


  const captureAndDownloadCover = useCallback(async () => {
    setIsProcessing(true);
    // Ensure the DOM is updated before capturing
    await new Promise(resolve => setTimeout(resolve, 100)); 

    const elementToCapture = coverContentRef.current;
    if (!elementToCapture) {
      toast({
        title: 'Error de Descarga',
        description: 'El elemento de previsualización no fue encontrado.',
        variant: 'destructive',
      });
       setIsProcessing(false);
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
    } finally {
       setIsProcessing(false);
    }
  }, [coverContentRef, toast]);
  

  const handleStripeCheckout = useCallback(async () => {
    setIsProcessing(true);
    
    // Save current state to localStorage before redirecting
    localStorage.setItem('spoton_cover_state', JSON.stringify(previewState));

    try {
        const { sessionId, error: sessionError } = await createCheckoutSession();

        if (sessionError || !sessionId) {
            throw new Error(sessionError || 'No se pudo crear la sesión de pago.');
        }

        const stripe = await getStripe();
        if (!stripe) {
            throw new Error('No se pudo cargar Stripe.');
        }

        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
        if (stripeError) throw stripeError;

    } catch (error: any) {
       toast({
        title: 'Error en el Proceso de Pago',
        description: error.message || 'Ocurrió un error inesperado.',
        variant: 'destructive',
      });
       setIsProcessing(false);
    }
  }, [previewState, toast]);

  const handleFreeDownload = useCallback(async () => {
    // 1. Validate email
    const validationResult = EmailFormSchema.safeParse({ email: emailForFreeDownload });
    if (!validationResult.success) {
      setEmailError(validationResult.error.errors[0].message);
      return;
    }
    
    setIsProcessing(true);
    setEmailError('');

    try {
      // 2. Call server action to save email
      const result = await saveEmailAction({ email: emailForFreeDownload });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // 3. Close dialog and show success toast
      setIsEmailAlertOpen(false);
      toast({
        title: '¡Gracias!',
        description: 'Tu descarga gratuita comenzará en breve.',
      });
      
      // 4. Trigger download
      await captureAndDownloadCover();
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo procesar tu solicitud.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setEmailForFreeDownload(''); // Reset email field
    }
  }, [emailForFreeDownload, toast, captureAndDownloadCover]);


  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const paymentCanceled = searchParams.get('payment_canceled');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const handleSuccess = async () => {
      toast({
        title: '¡Pago Exitoso!',
        description: 'Gracias por tu compra. La descarga comenzará ahora.',
      });
      
      // The state should already be restored via useState initializer
      await captureAndDownloadCover();

      // Clean up localStorage and URL params
      localStorage.removeItem('spoton_cover_state');
      if (currentPath) router.replace(currentPath, { scroll: false });
    };

    const handleCancel = () => {
      toast({
        title: 'Pago Cancelado',
        description: 'Has cancelado el proceso de pago.',
        variant: 'destructive',
      });
      localStorage.removeItem('spoton_cover_state');
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
            ref={coverContentRef}
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
              disabled={previewState.themeMode === 'light' || isProcessing}
              variant={previewState.themeMode === 'light' ? "default" : "outline"}
            >
              Elementos Negros
            </Button>
            <Button 
              onClick={() => handleThemeChange('dark')} 
              disabled={previewState.themeMode === 'dark' || isProcessing}
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
          onCheckoutRequest={() => setIsPaymentAlertOpen(true)}
          onFreeDownloadRequest={() => setIsEmailAlertOpen(true)}
          isProcessing={isProcessing}
        />
      </main>
      
      {/* Payment Confirmation Dialog */}
      <AlertDialog open={isPaymentAlertOpen} onOpenChange={setIsPaymentAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmación de Pago</AlertDialogTitle>
            <AlertDialogDescription>
              Serás redirigido a Stripe para completar de forma segura el pago de 0,99€.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStripeCheckout} disabled={isProcessing}>
               {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pagar y Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email for Free Download Dialog */}
      <AlertDialog open={isEmailAlertOpen} onOpenChange={setIsEmailAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descarga Gratuita</AlertDialogTitle>
            <AlertDialogDescription>
              Introduce tu email para recibir tu descarga gratuita. No te enviaremos spam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={emailForFreeDownload}
              onChange={(e) => setEmailForFreeDownload(e.target.value)}
              disabled={isProcessing}
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && <p className="text-sm text-destructive mt-2">{emailError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} onClick={() => setEmailError('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFreeDownload} disabled={isProcessing || !emailForFreeDownload}>
               {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Descargar
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

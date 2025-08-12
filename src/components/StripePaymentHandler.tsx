
'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/lib/stripeActions';
import type { CoverFormValues } from '@/lib/schema';
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

interface StripePaymentHandlerProps {
  children: (props: { onDownload: () => void, isProcessingPayment: boolean }) => React.ReactNode;
  previewState: CoverFormValues & { coverImageUrl?: string | null, isPlaying: boolean, themeMode: 'dark' | 'light' };
  setPreviewState: React.Dispatch<React.SetStateAction<any>>;
  coverPreviewRef: React.RefObject<HTMLDivElement>;
}

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

export function StripePaymentHandler({
  children,
  previewState,
  setPreviewState,
  coverPreviewRef,
}: StripePaymentHandlerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

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

  const handleStripeCheckout = useCallback(async () => {
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
          setTimeout(() => {
            captureAndDownloadCover();
            localStorage.removeItem('spotOnCoverPreviewState');
            if (currentPath) router.replace(currentPath, { scroll: false });
          }, 1000);
        } catch (e) {
            captureAndDownloadCover();
            localStorage.removeItem('spotOnCoverPreviewState');
            if (currentPath) router.replace(currentPath, { scroll: false });
        }
      } else {
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
      const savedStateString = localStorage.getItem('spotOnCoverPreviewState');
      if (savedStateString) {
        try {
          const savedState = JSON.parse(savedStateString);
          setPreviewState(savedState);
        } catch (e) {
            // Do nothing
        }
      }
      localStorage.removeItem('spotOnCoverPreviewState');
      if (currentPath) router.replace(currentPath, { scroll: false });
    };

    if (paymentSuccess === 'true') {
      handleSuccess();
    } else if (paymentCanceled === 'true') {
      handleCancel();
    }
  }, [searchParams, router, toast, captureAndDownloadCover, setPreviewState]);

  const onDownload = () => setIsPaymentDialogOpen(true);

  return (
    <>
      {children({ onDownload, isProcessingPayment })}
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

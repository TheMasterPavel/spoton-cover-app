
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
import type { CoverFormValues, ShippingFormValues, EmailFormValues } from '@/lib/schema';
import { ShippingFormSchema, EmailFormSchema } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession, createShippingCheckoutSession } from '@/lib/stripeActions';
import { saveEmailAction } from '@/lib/actions';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';


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
  const coverContentRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);
  const [isUpsellDialogOpen, setIsUpsellDialogOpen] = useState(false);

  // Trigger para la descarga post-pago
  const [isReadyToDownload, setIsReadyToDownload] = useState(false);

  const captureAndDownloadCover = useCallback(async () => {
    const elementToCapture = coverContentRef.current;
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
      // After successful download, show the upsell dialog
      setTimeout(() => setIsUpsellDialogOpen(true), 500);

    } catch (error) {
      console.error('Error en html2canvas:', error);
      toast({
        title: 'Error de Descarga',
        description: 'No se pudo generar la imagen. Revisa la consola.',
        variant: 'destructive',
      });
    }
  }, [coverContentRef, toast]);
  
  useEffect(() => {
    if (isReadyToDownload) {
      const timer = setTimeout(() => {
        captureAndDownloadCover();
        setIsReadyToDownload(false);
      }, 100); 

      return () => clearTimeout(timer);
    }
  }, [isReadyToDownload, captureAndDownloadCover]);


  const handleStripeCheckout = useCallback(async (shippingDetails: ShippingFormValues) => {
    setIsProcessing(true);

    try {
      localStorage.setItem('spotOnCoverPreviewState', JSON.stringify(previewState));
    } catch (e) {
      toast({
        title: "Error de Almacenamiento",
        description: "No se pudo guardar el estado de tu portada.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    const { sessionId, error: sessionError } = await createShippingCheckoutSession(shippingDetails);
    if (sessionError || !sessionId) {
      toast({
        title: 'Error al Iniciar Pago',
        description: sessionError || 'No se pudo crear la sesión de pago.',
        variant: 'destructive',
      });
      localStorage.removeItem('spotOnCoverPreviewState');
      setIsProcessing(false);
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
      setIsProcessing(false);
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
      setIsProcessing(false);
    }
  }, [previewState, toast]);

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const paymentCanceled = searchParams.get('payment_canceled');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const handleSuccess = () => {
      toast({
        title: '¡Pago Exitoso!',
        description: 'Gracias por tu compra. Tu funda está en camino.',
      });
      // Clear local storage but don't trigger a download for the case
      localStorage.removeItem('spotOnCoverPreviewState');
      if (currentPath) router.replace(currentPath, { scroll: false });
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

  const onEmailSubmit = async (data: EmailFormValues) => {
      setIsProcessing(true);
      try {
        await saveEmailAction(data);
        toast({
            title: "¡Email Guardado!",
            description: "Gracias. Tu descarga comenzará ahora.",
        });
        setIsEmailDialogOpen(false);
        captureAndDownloadCover();
      } catch (error) {
        toast({
            title: "Error",
            description: "No se pudo guardar el email. Inténtalo de nuevo.",
            variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
  };

  const onShippingSubmit = async (data: ShippingFormValues) => {
      setIsShippingDialogOpen(false); // Close this dialog
      await handleStripeCheckout(data);
  };
  
  const emailForm = useForm<EmailFormValues>({ resolver: zodResolver(EmailFormSchema) });
  const shippingForm = useForm<ShippingFormValues>({ resolver: zodResolver(ShippingFormSchema) });

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
          onDownloadRequest={() => setIsEmailDialogOpen(true)}
          onOrderRequest={() => setIsShippingDialogOpen(true)}
          isProcessing={isProcessing}
        />
      </main>
      
      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Descargar Imagen Gratis</DialogTitle>
                <DialogDescription>
                    Introduce tu email para descargar la imagen. Te prometemos no enviar spam.
                </DialogDescription>
            </DialogHeader>
            <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField
                        control={emailForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="tu@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button>
                      </DialogClose>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin" /> : 'Descargar'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      {/* Shipping Dialog */}
      <Dialog open={isShippingDialogOpen} onOpenChange={setIsShippingDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Pedir Funda Personalizada</DialogTitle>
                <DialogDescription>
                    Rellena tus datos para recibir la funda con tu diseño. Serás redirigido para el pago seguro (9,99€).
                </DialogDescription>
            </DialogHeader>
            <Form {...shippingForm}>
                 <form onSubmit={shippingForm.handleSubmit(onShippingSubmit)} className="space-y-3 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField control={shippingForm.control} name="firstName" render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Tu nombre" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={shippingForm.control} name="lastName" render={({ field }) => (
                            <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input placeholder="Tus apellidos" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={shippingForm.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Dirección Completa</FormLabel><FormControl><Input placeholder="Calle, número, piso, puerta..." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <div className="grid grid-cols-3 gap-3">
                        <FormField control={shippingForm.control} name="city" render={({ field }) => (
                            <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input placeholder="Ciudad" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={shippingForm.control} name="postalCode" render={({ field }) => (
                            <FormItem><FormLabel>Cód. Postal</FormLabel><FormControl><Input placeholder="CP" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={shippingForm.control} name="country" render={({ field }) => (
                            <FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="País" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                     <div className="grid grid-cols-2 gap-3">
                        <FormField control={shippingForm.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="+34 600 000 000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={shippingForm.control} name="phoneModel" render={({ field }) => (
                           <FormItem><FormLabel>Modelo de Móvil</FormLabel><FormControl><Input placeholder="Ej: iPhone 15 Pro" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <DialogFooter className="pt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isProcessing}>
                             {isProcessing ? <Loader2 className="animate-spin" /> : 'Pagar 9,99€ y Pedir'}
                        </Button>
                    </DialogFooter>
                 </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      {/* Upsell Dialog */}
      <AlertDialog open={isUpsellDialogOpen} onOpenChange={setIsUpsellDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¡Convierte tu Arte en una Funda!</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Te encanta tu diseño? Recíbelo como una funda exclusiva para tu móvil por solo 9,99€.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsUpsellDialogOpen(false)}>
              No, gracias
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                setIsUpsellDialogOpen(false);
                setIsShippingDialogOpen(true);
            }}>
              ¡Sí, la quiero!
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

    

'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CoverFormSchema, type CoverFormValues } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateAlbumCoverAction } from '@/lib/actions';
import { Loader2, Sparkles, CreditCard, Trash2 } from 'lucide-react';
import React from 'react';

interface CoverFormProps {
  onFormChange: (values: Partial<CoverFormValues & { coverImageUrl?: string | null; coverImageFile?: FileList | undefined }>) => void;
  initialValues: CoverFormValues & { coverImageUrl?: string | null };
  onDownload: () => void; 
  isProcessingPayment: boolean; 
}

export function CoverForm({ onFormChange, initialValues, onDownload, isProcessingPayment }: CoverFormProps) {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const { toast } = useToast();

  const form = useForm<CoverFormValues>({
    resolver: zodResolver(CoverFormSchema),
    defaultValues: {
      songTitle: initialValues.songTitle,
      artistName: initialValues.artistName,
      coverImageFile: initialValues.coverImageFile,
      durationMinutes: initialValues.durationMinutes,
      durationSeconds: initialValues.durationSeconds,
      progressPercentage: initialValues.progressPercentage,
    },
  });

  const { watch, setValue, reset, getValues } = form;

  useEffect(() => {
    const subscription = watch((formStateFromRHF, { name, type }) => {
      const { coverImageFile, ...otherRelevantState } = formStateFromRHF;
      if (name && otherRelevantState.hasOwnProperty(name as keyof typeof otherRelevantState)) {
        if (name !== 'coverImageFile') {
            onFormChange({ [name]: otherRelevantState[name as keyof typeof otherRelevantState] });
        }
      } else if (type === 'change') { 
        onFormChange(otherRelevantState);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onFormChange]);


  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFormChange({ coverImageFile: event.target.files, coverImageUrl: reader.result as string });
        setValue('coverImageFile', event.target.files, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      onFormChange({ coverImageFile: undefined, coverImageUrl: initialValues.coverImageUrl });
      setValue('coverImageFile', undefined);
    }
  };

  const handleGenerateAiCover = async () => {
    const { songTitle, artistName } = getValues();
    if (!songTitle || !artistName) {
      toast({
        title: 'Información Faltante',
        description: 'Por favor, introduce un título de canción y nombre de artista para generar una portada con IA.',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const result = await generateAlbumCoverAction({ songTitle, artistName });
      if (result.albumCoverDataUri && result.albumCoverDataUri.startsWith('data:image')) {
        onFormChange({ coverImageUrl: result.albumCoverDataUri, coverImageFile: undefined });
        setValue('coverImageFile', undefined); 
        toast({
          title: '¡Portada IA Generada!',
          description: 'La IA ha creado una portada única para ti.',
          duration: 3000,
        });
      } else {
        throw new Error('La IA no devolvió una imagen válida.');
      }
    } catch (error) {
      console.error('Error en Generación de Portada IA:', error);
      toast({
        title: 'Falló la Generación IA',
        description: (error as Error).message || 'No se pudo generar la portada IA. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
        duration: 5000,
      });
      if (!getValues('coverImageFile') && initialValues.coverImageUrl) { // Check initialValues.coverImageUrl
         onFormChange({ coverImageUrl: initialValues.coverImageUrl });
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleResetForm = () => {
    reset({
      songTitle: initialValues.songTitle,
      artistName: initialValues.artistName,
      coverImageFile: undefined, // Always reset file input visually
      durationMinutes: initialValues.durationMinutes,
      durationSeconds: initialValues.durationSeconds,
      progressPercentage: initialValues.progressPercentage,
    });
    onFormChange({ 
      ...initialValues, 
      coverImageUrl: initialValues.coverImageUrl, 
      coverImageFile: undefined 
    });
    const fileInput = document.getElementById('coverImageFile-input') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const onSubmitTriggerPaymentDialog = () => { 
    onDownload();
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitTriggerPaymentDialog)} className="space-y-6 p-4 md:p-6 rounded-lg shadow-lg bg-card w-full max-w-md">
          <FormField
            control={form.control}
            name="songTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título de la Canción</FormLabel>
                <FormControl>
                  <Input placeholder="Introduce el título de la canción" {...field} className="bg-input text-foreground placeholder:text-muted-foreground/70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="artistName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Artista</FormLabel>
                <FormControl>
                  <Input placeholder="Introduce el nombre del artista" {...field} className="bg-input text-foreground placeholder:text-muted-foreground/70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormItem>
            <FormLabel htmlFor="coverImageFile-input">Imagen de Portada (Opcional)</FormLabel>
            <FormControl>
               <Input 
                id="coverImageFile-input"
                type="file" 
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </FormControl>
            <FormMessage>{form.formState.errors.coverImageFile?.message as string}</FormMessage>
          </FormItem>

          <Button
            type="button"
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
            onClick={handleGenerateAiCover}
            disabled={isGeneratingAi || !watch('songTitle') || !watch('artistName') || isProcessingPayment}
          >
            {isGeneratingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generar Portada con IA
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (Min)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="MM" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} min="0" max="599" className="bg-input text-foreground placeholder:text-muted-foreground/70"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationSeconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración (Seg)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="SS" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value,10))} min="0" max="59" className="bg-input text-foreground placeholder:text-muted-foreground/70"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="progressPercentage"
            render={({ field: { onChange: onSliderChange, value, ...restField } }) => ( 
              <FormItem>
                <FormLabel>Progreso: {value !== undefined && value !== null ? value : 0}%</FormLabel>
                <FormControl>
                   <Slider
                    value={[value !== undefined && value !== null ? value : 0]}
                    onValueChange={(vals) => onSliderChange(vals[0])}
                    max={100}
                    step={1}
                    themeMode={watch('songTitle') ? 'dark' : 'light'} // This themeMode might be different from page's themeMode
                    className="[&>span:first-child>span]:bg-primary [&>span:nth-child(2)]:bg-spotify-green"
                    aria-label="Porcentaje de progreso de la canción"
                    {...restField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <Button type="button" variant="outline" onClick={handleResetForm} className="w-full sm:w-auto" disabled={isProcessingPayment}>
              <Trash2 className="mr-2 h-4 w-4" /> Reiniciar
            </Button>
            <Button type="submit" className="w-full flex-grow bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isProcessingPayment}>
              {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" /> }
              Pagar 0,99€ y Descargar
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

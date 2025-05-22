
'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CoverFormSchema, type CoverFormValues } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // No se usa directamente pero es bueno tenerlo si se necesitara.
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateAlbumCoverAction } from '@/lib/actions';
import { Loader2, Sparkles, Download, Trash2 } from 'lucide-react';
import React from 'react';

interface CoverFormProps {
  onFormChange: (values: Partial<CoverFormValues & { coverImageUrl?: string | null }>) => void;
  initialValues: CoverFormValues & { coverImageUrl?: string | null };
  onDownload: () => void; // Ya no necesita currentCoverImageUrl
}

export function CoverForm({ onFormChange, initialValues, onDownload }: CoverFormProps) {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const { toast } = useToast();

  const form = useForm<CoverFormValues>({
    resolver: zodResolver(CoverFormSchema),
    defaultValues: initialValues,
  });

  const { watch, setValue, reset, getValues } = form; // Agregado getValues

  React.useEffect(() => {
    const subscription = watch((values, { name }) => {
      // Solo actualiza coverImageUrl si no es un cambio de imagen (ya manejado en handleImageUpload/handleGenerateAiCover)
      // Esto previene que onFormChange sin coverImageUrl borre la imagen actual en el estado padre.
      if (name === 'coverImageFile') {
        // La lógica de coverImageUrl se maneja en handleImageUpload y handleGenerateAiCover
        // Solo pasamos el archivo aquí.
        onFormChange({ coverImageFile: values.coverImageFile });
      } else {
        onFormChange(values as Partial<CoverFormValues>);
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
      onFormChange({ coverImageFile: undefined, coverImageUrl: initialValues.coverImageUrl || 'https://placehold.co/600x600.png' });
      setValue('coverImageFile', undefined);
    }
  };

  const handleGenerateAiCover = async () => {
    const { songTitle, artistName } = getValues(); // Usar getValues para obtener los valores actuales del formulario
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
      if (result.albumCoverDataUri) {
        onFormChange({ coverImageUrl: result.albumCoverDataUri, coverImageFile: undefined });
        // setValue('coverImageFile', undefined); // No es necesario si la IA no establece este campo
        toast({
          title: '¡Portada IA Generada!',
          description: 'La IA ha creado una portada única para ti.',
          duration: 3000,
        });
      } else {
        throw new Error('La IA no devolvió una imagen.');
      }
    } catch (error) {
      console.error('Error en Generación de Portada IA:', error);
      toast({
        title: 'Falló la Generación IA',
        description: (error as Error).message || 'No se pudo generar la portada IA. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
        duration: 5000,
      });
      // Restablece a la imagen de placeholder o la inicial si falla la IA
      onFormChange({ coverImageUrl: initialValues.coverImageUrl || 'https://placehold.co/600x600.png' }); 
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleResetForm = () => {
    reset(initialValues); 
    onFormChange({ ...initialValues, coverImageUrl: initialValues.coverImageUrl || 'https://placehold.co/600x600.png' }); 
  };

  // El formulario ahora solo llama a onDownload, que obtiene la URL de la imagen del estado padre.
  const onSubmit = () => {
    onDownload();
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-6 rounded-lg shadow-lg bg-card w-full">
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
                onChange={handleImageUpload} // RHF se encarga del valor a través de setValue en handleImageUpload
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
            disabled={isGeneratingAi || !watch('songTitle') || !watch('artistName')}
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
                    <Input type="number" placeholder="MM" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value,10))} min="0" max="599" className="bg-input text-foreground placeholder:text-muted-foreground/70"/>
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
                    <Input type="number" placeholder="SS" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value,10))} min="0" max="59" className="bg-input text-foreground placeholder:text-muted-foreground/70"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="progressPercentage"
            render={({ field: { onChange, value, ...restField } }) => ( 
              <FormItem>
                <FormLabel>Progreso: {value !== undefined && value !== null ? value : 0}%</FormLabel>
                <FormControl>
                   <Slider
                    value={[value !== undefined && value !== null ? value : 0]}
                    onValueChange={(vals) => onChange(vals[0])}
                    max={100}
                    step={1}
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
             <Button type="button" variant="outline" onClick={handleResetForm} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" /> Reiniciar
            </Button>
            <Button type="submit" className="w-full flex-grow bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="mr-2 h-4 w-4" /> Descargar Portada
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}


'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CoverFormSchema, type CoverFormValues } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label no se usa directamente, pero es referenciado por FormLabel
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateAlbumCoverAction } from '@/lib/actions';
import { Loader2, Sparkles, Download, Trash2 } from 'lucide-react';
import React from 'react';

interface CoverFormProps {
  onFormChange: (values: Partial<CoverFormValues & { coverImageUrl?: string | null; coverImageFile?: FileList | undefined }>) => void;
  initialValues: CoverFormValues & { coverImageUrl?: string | null }; // Used for reset and initial RHF values
  onDownload: () => void;
}

export function CoverForm({ onFormChange, initialValues, onDownload }: CoverFormProps) {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const { toast } = useToast();

  const form = useForm<CoverFormValues>({
    resolver: zodResolver(CoverFormSchema),
    defaultValues: { // RHF gets its initial structure from here
      songTitle: initialValues.songTitle,
      artistName: initialValues.artistName,
      coverImageFile: initialValues.coverImageFile,
      durationMinutes: initialValues.durationMinutes,
      durationSeconds: initialValues.durationSeconds,
      progressPercentage: initialValues.progressPercentage,
    },
  });

  const { watch, setValue, reset, getValues } = form;

  React.useEffect(() => {
    const subscription = watch((formStateFromRHF, { name }) => {
      // coverImageFile changes are handled by its own input onChange -> handleImageUpload
      // which directly calls onFormChange with coverImageUrl and coverImageFile.
      // So, we only need to call onFormChange here for other field changes.
      if (name !== 'coverImageFile') {
        // For other fields (songTitle, artistName, durations, progress),
        // send up their current state from RHF.
        // Exclude coverImageFile from this update path, as it's handled by handleImageUpload.
        const { coverImageFile, ...otherRelevantState } = formStateFromRHF;
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
        // Send both the new image URL for preview and the file itself for RHF & state
        onFormChange({ coverImageFile: event.target.files, coverImageUrl: reader.result as string });
        setValue('coverImageFile', event.target.files, { shouldValidate: true }); // Update RHF
      };
      reader.readAsDataURL(file);
    } else {
      // If file is cleared, reset to placeholder and clear file in RHF
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
        // AI generated an image, clear any user-uploaded file.
        onFormChange({ coverImageUrl: result.albumCoverDataUri, coverImageFile: undefined });
        setValue('coverImageFile', undefined); // Clear file from RHF
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
      // On failure, revert to initial placeholder. Don't clear coverImageFile if user had one before trying AI.
      onFormChange({ coverImageUrl: initialValues.coverImageUrl }); 
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleResetForm = () => {
    reset({ // Reset RHF to initial values
      songTitle: initialValues.songTitle,
      artistName: initialValues.artistName,
      coverImageFile: initialValues.coverImageFile, // usually undefined
      durationMinutes: initialValues.durationMinutes,
      durationSeconds: initialValues.durationSeconds,
      progressPercentage: initialValues.progressPercentage,
    }); 
    // Also reset HomePage state (including coverImageUrl)
    onFormChange({ ...initialValues, coverImageUrl: initialValues.coverImageUrl }); 
  };

  const onSubmit = () => {
    onDownload(); // HomePage's onDownload uses its own previewState
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
                // RHF's setValue is called within handleImageUpload for the 'coverImageFile' field.
                // So we don't use field.onChange here.
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
                    onValueChange={(vals) => onChange(vals[0])} // RHF onChange handles the number
                    max={100}
                    step={1}
                    className="[&>span:first-child>span]:bg-primary [&>span:nth-child(2)]:bg-spotify-green" // Assuming --spotify-green is a valid CSS var or this is Tailwind JIT
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

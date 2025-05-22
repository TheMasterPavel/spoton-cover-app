
'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CoverFormSchema, type CoverFormValues } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { generateAlbumCoverAction } from '@/lib/actions';
import { Loader2, UploadCloud, Sparkles, Download, Trash2 } from 'lucide-react';
import React from 'react';

interface CoverFormProps {
  onFormChange: (values: Partial<CoverFormValues & { coverImageUrl?: string | null }>) => void;
  initialValues: CoverFormValues & { coverImageUrl?: string | null };
}

export function CoverForm({ onFormChange, initialValues }: CoverFormProps) {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<CoverFormValues>({
    resolver: zodResolver(CoverFormSchema),
    defaultValues: initialValues,
  });

  const { watch, setValue, reset } = form;

  // Watch form values to update preview
  // This is a bit heavy, consider debouncing or updating on blur for performance if needed.
  React.useEffect(() => {
    const subscription = watch((values) => {
      onFormChange(values as Partial<CoverFormValues>);
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
      onFormChange({ coverImageFile: undefined, coverImageUrl: null });
      setValue('coverImageFile', undefined);
    }
  };

  const handleGenerateAiCover = async () => {
    const { songTitle, artistName } = form.getValues();
    if (!songTitle || !artistName) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a song title and artist name to generate an AI cover.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const result = await generateAlbumCoverAction({ songTitle, artistName });
      if (result.albumCoverDataUri) {
        onFormChange({ coverImageUrl: result.albumCoverDataUri, coverImageFile: undefined });
        setValue('coverImageFile', undefined); // Clear file input if AI image is generated
        toast({
          title: 'AI Cover Generated!',
          description: 'The AI has crafted a unique cover for you.',
        });
      } else {
        throw new Error('AI did not return an image.');
      }
    } catch (error) {
      console.error('AI Cover Generation Error:', error);
      toast({
        title: 'AI Generation Failed',
        description: (error as Error).message || 'Could not generate AI cover. Please try again.',
        variant: 'destructive',
      });
      onFormChange({ coverImageUrl: null }); // Clear image on failure
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleResetForm = () => {
    reset(initialValues); // Resets react-hook-form
    onFormChange({ ...initialValues, coverImageUrl: initialValues.coverImageUrl || null }); // Resets parent state
  };

  const onSubmit = (_values: CoverFormValues) => {
    // Main form submission could trigger download or other actions
    // For now, download is separate.
    setShowPaymentDialog(true);
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
                <FormLabel>Song Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter song title" {...field} className="bg-input text-foreground placeholder:text-muted-foreground/70" />
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
                <FormLabel>Artist Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter artist name" {...field} className="bg-input text-foreground placeholder:text-muted-foreground/70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormItem>
            <FormLabel htmlFor="coverImageFile-input">Cover Image (Optional)</FormLabel>
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
            disabled={isGeneratingAi || !watch('songTitle') || !watch('artistName')}
          >
            {isGeneratingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate AI Cover
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Min)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="MM" {...field} min="0" max="599" className="bg-input text-foreground placeholder:text-muted-foreground/70"/>
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
                  <FormLabel>Duration (Sec)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="SS" {...field} min="0" max="59" className="bg-input text-foreground placeholder:text-muted-foreground/70"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="progressPercentage"
            render={({ field: { onChange, value, ...restField } }) => ( // Destructure field to correctly pass value to Slider
              <FormItem>
                <FormLabel>Progress: {value}%</FormLabel>
                <FormControl>
                   <Slider
                    value={[value]}
                    onValueChange={(vals) => onChange(vals[0])}
                    max={100}
                    step={1}
                    className="[&>span:first-child>span]:bg-primary [&>span:nth-child(2)]:bg-spotify-green"
                    aria-label="Song progress percentage"
                    {...restField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <Button type="button" variant="outline" onClick={handleResetForm} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button type="submit" className="w-full flex-grow bg-primary hover:bg-primary/90 text-primary-foreground">
              <Download className="mr-2 h-4 w-4" /> Download Cover (€0.99)
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Download</AlertDialogTitle>
            <AlertDialogDescription>
              To download your SpotOn Cover as a PNG image with a transparent background (named spotify_cover.png), a one-time payment of €0.99 is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              toast({ title: 'Payment Gateway', description: 'Redirecting to payment... (Mocked)' });
              setShowPaymentDialog(false);
              // Actual payment integration would go here
            }}>
              Proceed to Payment (€0.99)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

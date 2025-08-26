
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const CoverFormSchema = z.object({
  songTitle: z.string().min(1, 'El título de la canción es obligatorio.'),
  artistName: z.string().min(1, 'El nombre del artista es obligatorio.'),
  coverImageFile: z
    .custom<FileList>()
    .refine(files => files === undefined || files === null || files.length === 0 || (files?.[0]?.size <= MAX_FILE_SIZE), 'El tamaño máximo del archivo es 5MB.')
    .refine(
      files => files === undefined || files === null || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      'Solo se admiten formatos .jpg, .jpeg, .png y .webp.'
    )
    .optional(),
  durationMinutes: z.coerce.number().min(0, 'Mínimo 0 minutos').max(599, 'Máximo 599 minutos'),
  durationSeconds: z.coerce.number().min(0, 'Mínimo 0 segundos').max(59, 'Los segundos deben estar entre 0-59'),
  progressPercentage: z.coerce.number().min(0).max(100),
});

export type CoverFormValues = z.infer<typeof CoverFormSchema>;

export const EmailFormSchema = z.object({
  email: z.string().email('Por favor, introduce un email válido.'),
});

export type EmailFormValues = z.infer<typeof EmailFormSchema>;

export const ShippingFormSchema = z.object({
    firstName: z.string().min(1, 'El nombre es obligatorio.'),
    lastName: z.string().min(1, 'Los apellidos son obligatorios.'),
    address: z.string().min(5, 'La dirección es obligatoria.'),
    city: z.string().min(2, 'La ciudad es obligatoria.'),
    postalCode: z.string().min(4, 'El código postal es obligatorio.'),
    country: z.string().min(2, 'El país es obligatorio.'),
    phone: z.string().min(8, 'El teléfono es obligatorio.'),
    phoneModel: z.string().min(2, 'El modelo del móvil es obligatorio.'),
});

export type ShippingFormValues = z.infer<typeof ShippingFormSchema>;

    
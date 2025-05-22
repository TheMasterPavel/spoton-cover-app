import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const CoverFormSchema = z.object({
  songTitle: z.string().min(1, 'Song title is required.'),
  artistName: z.string().min(1, 'Artist name is required.'),
  coverImageFile: z
    .custom<FileList>()
    .refine(files => files === undefined || files === null || files.length === 0 || (files?.[0]?.size <= MAX_FILE_SIZE), 'Max file size is 5MB.')
    .refine(
      files => files === undefined || files === null || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      'Only .jpg, .jpeg, .png and .webp formats are supported.'
    )
    .optional(),
  durationMinutes: z.coerce.number().min(0).max(599, 'Max 599 minutes'), // Max ~10 hours
  durationSeconds: z.coerce.number().min(0).max(59, 'Seconds must be 0-59'),
  progressPercentage: z.coerce.number().min(0).max(100),
});

export type CoverFormValues = z.infer<typeof CoverFormSchema>;

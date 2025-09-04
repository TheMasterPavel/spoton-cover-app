
'use server';

import { z } from 'zod';
import { EmailFormSchema } from './schema';

type SaveEmailInput = z.infer<typeof EmailFormSchema>;
type SaveEmailOutput = { success?: boolean, error?: string };

/**
 * Server action to save a user's email for a free download.
 * In a real app, this would save to a database (e.g., Firestore, Postgres).
 * For this demo, it just logs the email to the server console.
 * @param data The user's email address.
 * @returns A promise that resolves to a success or error object.
 */
export async function saveEmailAction(data: SaveEmailInput): Promise<SaveEmailOutput> {
  // 1. Validate the input on the server side to be safe.
  const validationResult = EmailFormSchema.safeParse(data);
  if (!validationResult.success) {
    console.error('Server-side validation failed:', validationResult.error.flatten());
    return { error: 'El email proporcionado no es válido.' };
  }

  const { email } = validationResult.data;

  try {
    // 2. "Save" the email by logging it.
    // In a real application, you would add database logic here.
    // Example: await db.collection('subscribers').add({ email, subscribedAt: new Date() });
    console.log(`[Free Download] User subscribed with email: ${email}`);

    // TODO: Integrate with an email service like SendGrid or Resend to send a "thank you" email.
    
    // 3. Return success.
    return { success: true };
    
  } catch (error) {
    console.error('Failed to save email:', error);
    // This would catch errors from the database or email service.
    return { error: 'Ocurrió un error en el servidor. Por favor, inténtalo de nuevo.' };
  }
}

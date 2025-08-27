
'use server';

import Stripe from 'stripe';
import type { ShippingFormValues } from '@/lib/schema';

// Lee las variables de entorno una sola vez.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

let stripe: Stripe | null = null;
let stripeError: string | null = null;

if (!stripeSecretKey) {
  stripeError = 'Error de configuración del servidor: La variable de entorno STRIPE_SECRET_KEY no está definida. Por favor, configúrala en Vercel.';
  console.error(stripeError);
} else {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
    typescript: true,
  });
}

if (!appUrl) {
    const urlError = 'Error de configuración del servidor: La variable de entorno NEXT_PUBLIC_APP_URL no está definida. Por favor, configúrala en Vercel.';
    console.error(urlError);
    // Añade el nuevo error al error existente si lo hay.
    stripeError = stripeError ? `${stripeError} ${urlError}` : urlError;
}

// TODO: Configurar un servicio de envío de correos (Ej: Resend, SendGrid) para la confirmación de pedido.
async function sendOrderConfirmationEmail(shippingDetails: ShippingFormValues) {
    // La información del cliente, como el email, no se pasa directamente aquí.
    // La mejor práctica es obtener el email del cliente desde el objeto de la sesión de Stripe
    // después de un pago exitoso, usando un webhook de Stripe (payment_intent.succeeded).
    console.log(`TODO: Enviar email de confirmación de pedido para el modelo ${shippingDetails.phoneModel}`);
}

interface CreateCheckoutSessionPayload {
  shippingDetails: ShippingFormValues;
  coverImageDataUri: string;
}


interface CreateCheckoutSessionResponse {
  sessionId?: string;
  error?: string;
}

export async function createShippingCheckoutSession(payload: CreateCheckoutSessionPayload): Promise<CreateCheckoutSessionResponse> {
  const { shippingDetails, coverImageDataUri } = payload;
  console.log('StripeActions: Iniciando createShippingCheckoutSession...');
  
  if (stripeError || !stripe) {
    console.error('StripeActions Error: Stripe no está inicializado o faltan variables de entorno.');
    return { error: stripeError || 'Stripe no está inicializado.' };
  }

  // TODO: Una vez que el envío de correos esté configurado, podrías llamar a la función
  // de confirmación desde un webhook de Stripe para mayor fiabilidad.
  // Por ahora, lo dejamos como un marcador de posición.
  // await sendOrderConfirmationEmail(shippingDetails);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Funda de Móvil Personalizada - SpotOn Cover',
              description: `Diseño para el modelo: ${shippingDetails.phoneModel}`,
              images: [coverImageDataUri], // ¡CLAVE! Guardamos la imagen aquí.
            },
            unit_amount: 999, // 9.99€
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: ['ES', 'US', 'GB', 'DE', 'FR', 'IT', 'PT', 'MX'], // Ejemplo de países
      },
      metadata: {
        // Guardamos los datos que no son de envío estándar
        firstName: shippingDetails.firstName,
        lastName: shippingDetails.lastName,
        phone: shippingDetails.phone,
        phoneModel: shippingDetails.phoneModel
      },
      success_url: `${appUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?payment_canceled=true`,
    });

    if (!session.id) {
      console.error('StripeActions Error: Stripe session.id no fue devuelto.');
      return { error: 'No se pudo crear la ID de la sesión de Stripe.' };
    }

    console.log(`StripeActions: Sesión de Stripe para funda creada. Session ID: ${session.id}`);
    return { sessionId: session.id };

  } catch (error) {
    console.error('StripeActions Error al crear sesión para funda:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
    return { error: `Error del servidor al crear sesión de pago: ${errorMessage}` };
  }
}


'use server';

import Stripe from 'stripe';

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
    // Este error se añade al principal si ambos faltan.
    const urlError = 'Error de configuración del servidor: La variable de entorno NEXT_PUBLIC_APP_URL no está definida. Por favor, configúrala en Vercel.';
    console.error(urlError);
    stripeError = stripeError ? `${stripeError} ${urlError}` : urlError;
}


interface CreateCheckoutSessionResponse {
  sessionId?: string;
  error?: string;
}

export async function createCheckoutSession(): Promise<CreateCheckoutSessionResponse> {
  console.log('StripeActions: Iniciando createCheckoutSession...');

  // Si hubo un error en la inicialización, no continuar.
  if (stripeError || !stripe) {
    console.error('StripeActions Error: Stripe no está inicializado o faltan variables de entorno.');
    return { error: stripeError || 'Stripe no está inicializado.' };
  }

  try {
    console.log('StripeActions: Intentando crear sesión de Stripe Checkout...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Portada de Canción Personalizada - SpotOn Cover',
              description: 'Descarga de tu portada de canción personalizada estilo Spotify.',
            },
            unit_amount: 99, // 0.99€
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?payment_canceled=true`,
    });

    if (!session.id) {
      console.error('StripeActions Error: Stripe session.id no fue devuelto después de la creación.');
      return { error: 'No se pudo crear la ID de la sesión de Stripe desde la API.' };
    }

    console.log(`StripeActions: Sesión de Stripe Checkout creada exitosamente. Session ID: ${session.id}`);
    return { sessionId: session.id };

  } catch (error) {
    console.error('StripeActions Error: Excepción al crear la sesión de Stripe Checkout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al interactuar con la API de Stripe.';
    return { error: `Error del servidor al crear sesión de pago: ${errorMessage}` };
  }
}

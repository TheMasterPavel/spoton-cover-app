
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
    const urlError = 'Error de configuración del servidor: La variable de entorno NEXT_PUBLIC_APP_URL no está definida. Por favor, configúrala en Vercel.';
    console.error(urlError);
    // Añade el nuevo error al error existente si lo hay.
    stripeError = stripeError ? `${stripeError} ${urlError}` : urlError;
}

interface CreateCheckoutSessionResponse {
  sessionId?: string;
  error?: string;
}

export async function createCheckoutSession(): Promise<CreateCheckoutSessionResponse> {
  console.log('StripeActions: Iniciando createCheckoutSession para descarga digital...');
  
  if (stripeError || !stripe) {
    console.error('StripeActions Error: Stripe no está inicializado o faltan variables de entorno.');
    return { error: stripeError || 'Stripe no está inicializado.' };
  }

  const successUrl = `${appUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/?payment_canceled=true`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Portada Personalizada de SpotOn Cover',
              description: 'Descarga digital de la imagen de portada generada.',
              // Puedes añadir una imagen genérica si quieres
              // images: ['URL_DE_IMAGEN_GENERICA_SI_LA_TIENES'], 
            },
            unit_amount: 99, // 0.99€
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.id) {
      console.error('StripeActions Error: Stripe session.id no fue devuelto.');
      return { error: 'No se pudo crear la ID de la sesión de Stripe.' };
    }

    console.log(`StripeActions: Sesión de Stripe para descarga creada. Session ID: ${session.id}`);
    return { sessionId: session.id };

  } catch (error) {
    console.error('StripeActions Error al crear sesión de descarga:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
    return { error: `Error del servidor al crear sesión de pago: ${errorMessage}` };
  }
}

    

'use server';

import Stripe from 'stripe';

// Inicializa Stripe con tu clave secreta
// Asegúrate de que STRIPE_SECRET_KEY esté en tus variables de entorno (.env.local para desarrollo)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('StripeActions FATAL ERROR: STRIPE_SECRET_KEY no está definida en las variables de entorno del servidor.');
}

const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2024-06-20', // Usa la última versión de la API
});

interface CreateCheckoutSessionResponse {
  sessionId?: string;
  error?: string;
}

export async function createCheckoutSession(): Promise<CreateCheckoutSessionResponse> {
  console.log('StripeActions: Iniciando createCheckoutSession...');

  if (!stripeSecretKey) {
    // Este log ya está arriba, pero es bueno tenerlo aquí también por si acaso.
    console.error('StripeActions Error: STRIPE_SECRET_KEY no está configurada. No se puede inicializar Stripe.');
    return { error: 'Error de configuración del servidor: Clave secreta de Stripe no encontrada.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  console.log(`StripeActions: NEXT_PUBLIC_APP_URL leída del entorno: ${appUrl}`);

  if (!appUrl) {
    console.error('StripeActions Error: NEXT_PUBLIC_APP_URL no está configurada en las variables de entorno del servidor.');
    return { error: 'Error de configuración del servidor: La URL de la aplicación no está configurada.' };
  }

  try {
    console.log('StripeActions: Intentando crear sesión de Stripe Checkout...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur', // Cambia a tu moneda si es necesario
            product_data: {
              name: 'Portada de Canción Personalizada - SpotOn Cover',
              description: 'Descarga de tu portada de canción personalizada estilo Spotify.',
            },
            unit_amount: 99, // Precio en céntimos (0.99€)
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


'use server';

import Stripe from 'stripe';

// Inicializa Stripe con tu clave secreta
// Asegúrate de que STRIPE_SECRET_KEY esté en tus variables de entorno (.env.local)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // Usa la última versión de la API
});

interface CreateCheckoutSessionResponse {
  sessionId?: string;
  error?: string;
}

export async function createCheckoutSession(): Promise<CreateCheckoutSessionResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return { error: 'La URL de la aplicación no está configurada en las variables de entorno.' };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur', // Cambia a tu moneda si es necesario
            product_data: {
              name: 'Portada de Canción Personalizada - SpotOn Cover',
              description: 'Descarga de tu portada de canción personalizada estilo Spotify.',
              // Puedes añadir una URL a una imagen del producto si quieres
              // images: [`${appUrl}/product-image.png`],
            },
            unit_amount: 99, // Precio en céntimos (0.99€)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?payment_canceled=true`,
      // Puedes añadir metadata si necesitas pasar información adicional
      // metadata: {
      //   userId: 'some_user_id', // Ejemplo
      // },
    });

    if (!session.id) {
      return { error: 'No se pudo crear la ID de la sesión de Stripe.' };
    }

    return { sessionId: session.id };
  } catch (error) {
    console.error('Error al crear la sesión de Stripe Checkout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear la sesión de pago.';
    return { error: `Error del servidor: ${errorMessage}` };
  }
}

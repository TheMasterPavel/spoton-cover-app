// /pages/api/checkout_sessions.ts

import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Carátula personalizada',
              description: 'Descarga tu carátula musical en PNG',
            },
            unit_amount: 99, // 0.99 € en centavos
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
    })

    res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Error al crear sesión de Stripe:', error)
    res.status(500).json({ error: 'Algo salió mal' })
  }
}
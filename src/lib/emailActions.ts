
'use server';

import { EmailFormSchema, type EmailFormValues } from '@/lib/schema';

// TODO: Configurar un servicio de envío de correos (Ej: Resend, SendGrid, Nodemailer)
// 1. Instalar el paquete necesario (ej: `npm install resend`)
// 2. Obtener una clave de API del servicio de correo.
// 3. Añadir la clave a las variables de entorno en Vercel (ej: RESEND_API_KEY).
// 4. Inicializar el cliente del servicio de correo aquí.
// const resend = new Resend(process.env.RESEND_API_KEY);

async function sendThankYouEmail(email: string) {
    console.log(`Simulando envío de email de agradecimiento a: ${email}`);
    // TODO: Implementar la lógica de envío de email aquí.
    /* Ejemplo con Resend:
    try {
        await resend.emails.send({
            from: 'SpotOn Cover <noreply@yourdomain.com>',
            to: email,
            subject: '¡Gracias por usar SpotOn Cover!',
            html: '<p>Gracias por descargar tu portada personalizada. ¡Esperamos que te encante!</p>'
        });
        console.log('Email de agradecimiento enviado exitosamente.');
    } catch (error) {
        console.error('Error al enviar email de agradecimiento:', error);
    }
    */
}


export async function saveEmailAction(input: EmailFormValues) {
  const validation = EmailFormSchema.safeParse(input);

  if (!validation.success) {
    throw new Error('Datos de email inválidos.');
  }

  const { email } = validation.data;

  console.log(`Email capturado para descarga gratuita: ${email}`);
  
  // TODO: Una vez configurado el servicio de correo, descomentar la siguiente línea.
  // await sendThankYouEmail(email);

  return { success: true, email };
}

    
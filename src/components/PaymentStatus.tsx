// src/components/PaymentStatus.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function PaymentStatus() {
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment_success');
  const paymentCanceled = searchParams.get('payment_canceled');

  return (
    <>
      {paymentSuccess && (
        <p style={{ color: 'green' }}>✅ ¡Pago realizado con éxito!</p>
      )}
      {paymentCanceled && (
        <p style={{ color: 'red' }}>❌ El pago fue cancelado.</p>
      )}
    </>
  );
}

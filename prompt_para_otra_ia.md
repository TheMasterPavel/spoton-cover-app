
# Prompt para Recrear la App "SpotOn Cover"

## 1. Resumen del Proyecto

Quiero que crees una aplicación web completa llamada **"SpotOn Cover"**. El objetivo de esta aplicación es permitir a los usuarios diseñar y descargar una imagen personalizada que imita la interfaz "Ahora suena" (Now Playing) de Spotify. La aplicación debe tener una interfaz de previsualización en tiempo real, un formulario para personalizar los detalles, la capacidad de generar una portada con IA si el usuario no sube una, y una funcionalidad de descarga monetizada a través de Stripe.

## 2. Stack Tecnológico Requerido

*   **Framework Principal:** Next.js (usando el App Router).
*   **Lenguaje:** TypeScript.
*   **Componentes de UI:** React con componentes de **shadcn/ui**. Debes usar los componentes predeterminados de shadcn/ui como `Card`, `Input`, `Button`, `Slider`, `AlertDialog`, `Toast`, etc.
*   **Estilos:** Tailwind CSS. El tema debe estar configurado en `src/app/globals.css` para que coincida con la paleta de colores de Spotify.
*   **Gestión de Formularios:** `react-hook-form` con `zod` para la validación de esquemas.
*   **Captura de DOM a Imagen:** Usar la librería `html2canvas` para convertir el componente de previsualización en una imagen PNG descargable.
*   **Funcionalidad de IA:** Usar **Genkit** con un modelo de generación de imágenes de Google (como Gemini) para crear portadas de álbumes. La funcionalidad debe estar encapsulada en una "Server Action" de Next.js.
*   **Pasarela de Pago:** Usar **Stripe** para procesar los pagos para la descarga de la imagen. La creación de la sesión de checkout de Stripe debe ser manejada a través de una "Server Action" de Next.js.

## 3. Guía de Estilo y UI/UX

La interfaz debe estar fuertemente inspirada en la UI de Spotify.

*   **Paleta de Colores (configurada en `globals.css` usando variables CSS HSL):**
    *   Fondo principal (`--background`): Charcoal oscuro (`#121212`).
    *   Texto primario y controles (`--foreground`): Blanco (`#FFFFFF`).
    *   Texto secundario y detalles (`--muted-foreground`): Gris suave (`#B3B3B3`).
    *   Color de acento (`--primary`, `--accent`): Verde Spotify (`#1DB954`).
    *   Elementos de tarjeta (`--card`): Un gris ligeramente más claro que el fondo.
*   **Fuente:** Una fuente sans-serif limpia y moderna como Inter o Geist Sans.
*   **Diseño General:** La página principal (`src/app/page.tsx`) debe ser de una sola columna, centrada. En la parte superior se mostrará la previsualización (`CoverPreview`) y debajo un separador y el formulario de configuración (`CoverForm`).

## 4. Descripción Detallada de los Componentes y Funcionalidades

### 4.1. Componente de Previsualización (`CoverPreview.tsx`)

Este componente es el corazón visual de la aplicación. Es un componente de React que muestra una tarjeta (`Card` de shadcn/ui) con el siguiente contenido:

1.  **Imagen de Portada:** Un contenedor de aspecto cuadrado (`aspect-square`) con esquinas redondeadas.
    *   Si se proporciona una URL de imagen (subida por el usuario, generada por IA o la de por defecto), debe mostrarse como imagen de fondo (`background-image`).
    *   Si no hay imagen, debe mostrar un ícono de música sobre un fondo de color neutro.
2.  **Información de la Canción:** Debajo de la imagen:
    *   **Título de la canción:** Texto grande y en negrita.
    *   **Nombre del artista:** Texto más pequeño y de color gris suave.
3.  **Barra de Progreso:**
    *   Un componente `Slider` de shadcn/ui (deshabilitado para la interacción del usuario) que representa visualmente el progreso de la canción.
    *   Debajo del slider, dos etiquetas de texto que muestran el tiempo actual y la duración total en formato `MM:SS`.
4.  **Controles de Reproducción:** Una fila de botones (`Button` de shadcn/ui) con íconos de `lucide-react`:
    *   `Shuffle`, `SkipBack`, `Play`/`Pause` (este debe ser un botón más grande, circular, y cambiar de ícono al hacer clic), `SkipForward`, `Repeat`.
5.  **Selector de Tema (fuera de la tarjeta, pero controla su apariencia):**
    *   Dos botones ("Elementos Negros" y "Elementos Blancos") que permiten al usuario cambiar la apariencia de la tarjeta de previsualización entre un tema claro y oscuro (afectando colores de fondo, texto e íconos de la tarjeta).

### 4.2. Componente de Formulario (`CoverForm.tsx`)

Este componente (`Form` de shadcn/ui) permite al usuario configurar la previsualización.

1.  **Campos de Entrada (`Input` de shadcn/ui):**
    *   Título de la canción (texto).
    *   Nombre del artista (texto).
    *   Duración (Minutos y Segundos, dos campos numéricos separados).
    *   Subida de imagen (`<input type="file">`): Permite al usuario subir su propia imagen. Debe validar el tamaño (<5MB) y el tipo (jpg, png, webp).
2.  **Slider de Progreso:** Un `Slider` de shadcn/ui que permite al usuario ajustar el porcentaje de progreso de la canción.
3.  **Botones de Acción:**
    *   **Generar Portada con IA:** Un botón que, al ser presionado, llama a una Server Action. Utiliza el título de la canción y el nombre del artista como prompt para que Genkit genere una imagen de portada. La imagen resultante (en formato Data URI) debe reemplazar la imagen actual en la previsualización. El botón debe mostrar un estado de carga mientras la IA trabaja.
    *   **Reiniciar:** Un botón que resetea todos los campos del formulario y la previsualización a sus valores iniciales.
    *   **Pagar y Descargar:** El botón principal del formulario. Este botón **no realiza la descarga directamente**, sino que abre un `AlertDialog` para confirmar el pago.

### 4.3. Flujo de Pago y Descarga (`page.tsx` y `stripeActions.ts`)

Este es el flujo más complejo y debe implementarse con cuidado.

1.  **Confirmación de Pago:**
    *   Al hacer clic en "Pagar y Descargar", se abre un `AlertDialog` de shadcn/ui.
    *   Este diálogo informa al usuario que será redirigido a Stripe para realizar un pago de 0,99 €.
    *   Tiene dos botones: "Cancelar" y "Pagar 0,99€ y Continuar".
2.  **Interacción con Stripe:**
    *   Al hacer clic en "Pagar y Continuar", se activa la función `handleStripeCheckout`.
    *   Esta función primero **guarda el estado actual de la previsualización en `localStorage`**.
    *   Luego, llama a una **Server Action** (`createCheckoutSession` en `src/lib/stripeActions.ts`).
    *   La Server Action (usando la clave secreta de Stripe) crea una sesión de pago y devuelve su `sessionId`.
    *   El frontend recibe el `sessionId` y usa la librería `@stripe/stripe-js` (`loadStripe`) para redirigir al usuario a la página de pago de Stripe.
3.  **Retorno a la Aplicación y Descarga:**
    *   Stripe redirigirá de vuelta a la aplicación con parámetros en la URL (`payment_success=true` o `payment_canceled=true`).
    *   Un `useEffect` en la página principal debe detectar estos parámetros.
    *   Si `payment_success` es `true`:
        *   Se muestra un `Toast` de éxito.
        *   **Se restaura el estado de la previsualización desde `localStorage`**.
        *   Después de un breve `setTimeout` (para asegurar que el DOM se actualice), se llama a la función `captureAndDownloadCover`.
        *   Se limpia `localStorage` y los parámetros de la URL.
4.  **Función de Captura y Descarga (`captureAndDownloadCover`):**
    *   Utiliza `html2canvas` sobre el `div` del componente `CoverPreview`.
    *   Debe configurarse con `useCORS: true` y `allowTaint: true` para manejar imágenes de dominios externos.
    *   Genera un Data URI de la imagen PNG a partir del canvas.
    *   Crea un elemento `<a>` en el DOM, le asigna el Data URI a su `href` y el nombre `spoton_cover.png` a `download`.
    *   Simula un clic en el enlace para iniciar la descarga y luego lo elimina del DOM.
    *   Debe tener un manejo de errores robusto con `try...catch` y mostrar notificaciones (`Toast`) en caso de fallo.

## 5. Configuración del Proyecto

*   **`next.config.ts`:** Debe estar configurado para permitir imágenes del dominio `placehold.co` y tener una configuración `experimental.allowedDevOrigins` para facilitar el desarrollo en entornos como Cloud Workstations o Codespaces.
*   **Variables de Entorno (`.env.local`):**
    *   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Clave publicable de Stripe.
    *   `STRIPE_SECRET_KEY`: Clave secreta de Stripe.
    *   `NEXT_PUBLIC_APP_URL`: La URL base de la aplicación (ej. `http://localhost:3000`).
    *   `GEMINI_API_KEY`: Clave API para el modelo de IA de Google.
*   **Estructura de Archivos Sugerida:**
    ```
    /src
    ├── /app
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── /ai
    │   ├── /flows
    │   │   └── generate-album-cover.ts
    │   └── genkit.ts
    ├── /components
    │   ├── /ui (componentes de shadcn)
    │   ├── CoverPreview.tsx
    │   └── CoverForm.tsx
    ├── /hooks
    │   └── use-toast.ts
    └── /lib
        ├── actions.ts (para las server actions de IA)
        ├── schema.ts (esquemas de Zod)
        ├── stripeActions.ts (para las server actions de Stripe)
        └── utils.ts
    ```

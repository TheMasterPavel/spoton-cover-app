# **App Name**: SpotOn Cover

## Core Features:

- Canvas Rendering: Renderizado en canvas de una imagen de portada de canción (subida por el usuario o generada por IA) con esquinas redondeadas, título de la canción, nombre del artista, barra de progreso de reproducción y botones de control multimedia (play, anterior, siguiente, aleatorio, repetir).
- Input Handling: Campos de entrada para que el usuario pueda subir su imagen de portada (opcional), introducir el título de la canción, nombre del artista, duración de la canción y progreso actual de reproducción.
- AI Placeholder Generation: Si no se sube ninguna imagen, se generará una portada estilizada de forma automática usando una herramienta de IA basada en el título y artista proporcionado.
- Monetized Download Functionality: Para poder descargar la imagen generada (formato PNG, fondo transparente, con nombre `spotify_cover.png`), el usuario deberá realizar un pago único de **0,99 €** mediante un sistema de pago integrado (por ejemplo, Stripe o Firebase Extensions).
- Reset Functionality: Botón para resetear todos los campos e imagen a sus valores iniciales para permitir comenzar de nuevo fácilmente.

## Style Guidelines:

- Inspirado directamente en la UI de Spotify.
- Fondo principal: Charcoal oscuro `#121212`
- Texto primario y controles: Blanco puro `#FFFFFF`
- Texto secundario y detalles: Gris suave `#B3B3B3`
- Color de acento (botones activos, sliders, etc.): Verde Spotify `#1DB954`
- Fuente sans-serif limpia y moderna (por ejemplo: `Inter`, `Helvetica`, `Arial`).
- Fondo transparente.
- Imagen de la carátula en la parte superior (centrada, con esquinas redondeadas).
- Debajo, el título de la canción (en blanco) y el nombre del artista (en gris).
- Barra de progreso de reproducción con estilo plano.
- Controles en forma de íconos lineales: Aleatorio 🔀, Atrás ⏮️, Play/Pausa ▶️⏸️, Siguiente ⏭️, Repetir 🔁
- Interfaz responsive compatible con PC y móvil.
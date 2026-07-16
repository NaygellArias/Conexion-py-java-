// Elementos del DOM
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');
const statusDiv = document.getElementById('status');

// Dirección del servidor WebSocket de Ngrok (asegúrate de que coincida con tu sesión actual)
const socket = new WebSocket("wss://gully-unscrew-spiny.ngrok-free.dev");

// Manejo de estados de la conexión
socket.onopen = () => { 
    statusDiv.innerText = "¡Conectado! Apunta a tu mano"; 
    statusDiv.style.backgroundColor = "rgba(46, 117, 89, 0.9)"; // Verde translúcido
};

socket.onclose = () => { 
    statusDiv.innerText = "Desconectado del servidor"; 
    statusDiv.style.backgroundColor = "rgba(186, 45, 50, 0.9)"; // Rojo translúcido
};

// Función de procesamiento que se ejecuta por cada fotograma recibido de la cámara
function onResults(results) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Dibujamos la cámara centrada en el canvas
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    let linea = "";
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const manos = [];
        for (const landmarks of results.multiHandLandmarks) {
            
            const puntos = landmarks.map(lm => {
                // Ajuste de coordenadas para adaptarlas a la proporción 16:9 de la PC
                // MediaPipe entrega lm.y de 0 a 1 (alto completo de la cámara de celular 4:3)
                // Hacemos un recorte virtual arriba y abajo para simular el formato panorámico 16:9
                let ajustadoY = (lm.y - 0.125) / 0.75; 
                
                // Limitamos los valores entre 0 y 1 para evitar desbordes fuera del cuadro
                let xFinal = Math.max(0, Math.min(1, lm.x));
                let yFinal = Math.max(0, Math.min(1, ajustadoY));
                
                return `${xFinal.toFixed(4)},${yFinal.toFixed(4)},${lm.z.toFixed(4)}`;
            });
            
            manos.push(puntos.join(";"));
        }
        linea = manos.join("|");
    }

    // Enviar las coordenadas adaptadas por WebSocket
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(linea);
    }
}

// Inicialización de la librería MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

// Configuración recomendada
hands.setOptions({ 
    maxNumHands: 2, 
    modelComplexity: 0, // 0 prioriza la velocidad/reacción, ideal para juegos
    minDetectionConfidence: 0.5, 
    minTrackingConfidence: 0.5 
});

hands.onResults(onResults);

// Inicialización de la cámara del dispositivo móvil
const camera = new Camera(videoElement, {
    onFrame: async () => { 
        await hands.send({image: videoElement}); 
    },
    width: 640,
    height: 480
});

camera.start();

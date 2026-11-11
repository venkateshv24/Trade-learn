// src/workers/socketWorker.js

const WS_URL = 'ws://localhost:8080';
const UI_UPDATE_RATE = 250; // Throttle UI updates to 4 times a second

let socket;
// A Map ensures O(1) deduplication. If TCS ticks 5 times in 250ms, 
// we only hold the absolute latest price in memory.
let tickerBuffer = new Map(); 
let flushInterval;

function initSocket() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[Worker] Connected to Market Firehose');
    
    // Start the dam: Flush batched data to the main thread every 250ms
    flushInterval = setInterval(() => {
      if (tickerBuffer.size > 0) {
        // Convert Map back to a flat array of the latest ticks
        const batchedPayload = Array.from(tickerBuffer.entries()).map(([id, p]) => ({ id, p }));
        
        // IPC (Inter-Process Communication) transfer to the React main thread
        postMessage(batchedPayload);
        
        // Clear the buffer after sending so we don't transmit stale data
        tickerBuffer.clear();
      }
    }, UI_UPDATE_RATE);
  };

  socket.onmessage = (event) => {
    // This runs every 50ms. Keep logic here incredibly lightweight.
    const ticks = JSON.parse(event.data);
    
    for (let i = 0; i < ticks.length; i++) {
      tickerBuffer.set(ticks[i].id, ticks[i].p);
    }
  };

  socket.onerror = (error) => {
    console.error('[Worker] Connection Error:', error);
  };

  socket.onclose = () => {
    console.log('[Worker] Disconnected from Exchange');
    // CRITICAL BOTTLENECK AVOIDANCE: 
    // If you do not clear this interval, the worker leaks memory and drains the CPU.
    clearInterval(flushInterval); 
  };
}

// Boot the socket when the worker thread spins up
initSocket();
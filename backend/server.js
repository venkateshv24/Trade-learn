const { WebSocketServer } = require('ws');

// 1. Initialize the server on port 8080
const wss = new WebSocketServer({ port: 8080 });

// A static list of high-liquidity Indian scrips
const SCRIPS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ITC'];

console.log('Stock Exchange Firehose booting up on ws://localhost:8080...');

// 2. The Connection Event: Fires every time a new browser connects
wss.on('connection', (ws) => {
  console.log('New terminal connected. Allocating resources...');

  // 3. The Firehose: We use setInterval to push data down the pipe every 50ms.
  // This simulates the aggressive tick rate of the NSE/BSE.
  const interval = setInterval(() => {
    // We construct a flat, highly optimized array of objects.
    // Deeply nested JSON will choke the V8 garbage collector during JSON.stringify.
    const payload = SCRIPS.map(id => ({
      id,
      p: parseFloat((Math.random() * 100 + 2000).toFixed(2)) // Mock price around ₹2000
    }));
    
    // Push the stringified binary payload over the TCP connection
    ws.send(JSON.stringify(payload));
  }, 50);

  // 4. The Teardown: Fires when the user closes the tab or loses internet
  ws.on('close', () => {
    // CRITICAL: If you forget this, the setInterval keeps running forever.
    // 1,000 disconnected users = 1,000 ghost loops = Server Out Of Memory (OOM) crash.
    clearInterval(interval);
    console.log('Terminal disconnected. Resources freed.');
  });
  
  // Standard error handling to prevent the Node process from crashing on a bad socket
  ws.on('error', (error) => {
    console.error('Socket encountered an error:', error);
    clearInterval(interval);
  });
});
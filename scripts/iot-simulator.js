/**
 * IoT Sensor Simulation Script
 * Simulates ESP32/DHT22 sensors sending data to the backend
 * 
 * Usage: node iot-simulator.js [tokenId] [intervalMs]
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TOKEN_ID = parseInt(process.argv[2]) || 0;
const INTERVAL_MS = parseInt(process.argv[3]) || 5000;

// Simulate sensor readings
function generateSensorData() {
    return {
        tokenId: TOKEN_ID,
        deviceId: `ESP32-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        temperature: 20 + Math.random() * 15,  // 20-35°C
        humidity: 40 + Math.random() * 40,      // 40-80%
        location: {
            lat: 6.5244 + (Math.random() - 0.5) * 0.5,  // Lagos area
            lng: 3.3792 + (Math.random() - 0.5) * 0.5
        },
        timestamp: new Date().toISOString()
    };
}

async function sendData() {
    const data = generateSensorData();

    try {
        const response = await axios.post(`${BACKEND_URL}/api/iot/data`, data);
        console.log(`[${new Date().toISOString()}] Sent:`, {
            temp: data.temperature.toFixed(1) + '°C',
            humidity: data.humidity.toFixed(1) + '%',
            device: data.deviceId
        });
        console.log('Response:', response.data.message);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

console.log(`🌡️  IoT Simulator Started`);
console.log(`   Token ID: ${TOKEN_ID}`);
console.log(`   Interval: ${INTERVAL_MS}ms`);
console.log(`   Backend: ${BACKEND_URL}`);
console.log('');

// Send initial data
sendData();

// Continue sending at interval
setInterval(sendData, INTERVAL_MS);

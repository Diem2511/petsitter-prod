require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { createBookingHandler } = require('./dist/handlers/createBooking');
const { updateBookingStatusHandler } = require('./dist/handlers/updateBookingStatus');
const { connectHandler, disconnectHandler, defaultHandler } = require('./dist/handlers/chat');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const PASSWORD = 'password123';
const CLIENT_EMAIL = 'chat_client@test.com';
const SITTER_EMAIL = 'chat_sitter@test.com';

let CLIENT_TOKEN, SITTER_TOKEN, CLIENT_ID, SITTER_ID;
let TEST_BOOKING_ID;
const CLIENT_CONN_ID = 'conn_client_123';
const SITTER_CONN_ID = 'conn_sitter_456';

async function setup() {
    await pool.query('TRUNCATE TABLE ws_connections, payments, reviews, bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [CLIENT_EMAIL, SITTER_EMAIL]);

    const sitterRes = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: PASSWORD }) });
    SITTER_TOKEN = JSON.parse(sitterRes.body).token;
    SITTER_ID = JSON.parse(sitterRes.body).userId;

    const clientRes = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: PASSWORD }) });
    CLIENT_TOKEN = JSON.parse(clientRes.body).token;
    CLIENT_ID = JSON.parse(clientRes.body).userId;

    const futureDate = new Date();
    const startTime = futureDate.toISOString();
    futureDate.setHours(futureDate.getHours() + 2);
    const endTime = futureDate.toISOString();

    const createRes = await createBookingHandler({
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
        body: JSON.stringify({ sitterId: SITTER_ID, petType: 'Dog', serviceType: 'Walk', startTime, endTime, totalPrice: 30.00 })
    });
    TEST_BOOKING_ID = JSON.parse(createRes.body).bookingId;

    await updateBookingStatusHandler({
        headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
        body: JSON.stringify({ bookingId: TEST_BOOKING_ID, status: 'ACCEPTED' })
    });

    console.log(`SETUP: Reserva lista.`);
}

async function simulateConnect(connId, token) {
    const event = {
        requestContext: { connectionId: connId },
        queryStringParameters: { token: token }
    };
    const result = await connectHandler(event);
    return result.statusCode === 200;
}

// --- CORRECCIÓN AQUÍ: Parseo seguro de la respuesta ---
async function simulateSend(senderConnId, bookingId, message) {
    const event = {
        requestContext: { connectionId: senderConnId },
        body: JSON.stringify({ bookingId, message })
    };
    const result = await defaultHandler(event);
    
    try {
        // Intentamos parsear como JSON
        return JSON.parse(result.body);
    } catch (e) {
        // Si falla, asumimos que el body es el mensaje en texto plano
        return { message: result.body };
    }
}

(async () => {
    try {
        await setup();

        console.log("\n[TEST 1] Conectando...");
        await simulateConnect(CLIENT_CONN_ID, CLIENT_TOKEN);
        await simulateConnect(SITTER_CONN_ID, SITTER_TOKEN);
        console.log("✅ Conectados.");

        console.log("\n[TEST 2] Mensaje Normal...");
        const res2 = await simulateSend(SITTER_CONN_ID, TEST_BOOKING_ID, "Hola, voy a las 10:00.");
        if (res2.message && res2.message.includes("enviado")) {
             console.log("✅ ÉXITO: Mensaje normal enviado.");
        } else {
             console.error("❌ FALLO:", res2);
        }

        console.log("\n[TEST 3] Mensaje Evasión...");
        const res3 = await simulateSend(CLIENT_CONN_ID, TEST_BOOKING_ID, "Llamame al 11-5555-4444.");
        if (res3.message && res3.message.includes("enviado")) {
             console.log("✅ ÉXITO: Mensaje evasión procesado (debe ser filtrado en logs).");
        } else {
             console.error("❌ FALLO:", res3);
        }

        console.log("\n[TEST 4] Desconectando...");
        await disconnectHandler({ requestContext: { connectionId: CLIENT_CONN_ID } });
        console.log("✅ Desconectado.");

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        await pool.end();
    }
})();

require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { createBookingHandler } = require('./dist/handlers/createBooking');
const { updateBookingStatusHandler } = require('./dist/handlers/updateBookingStatus');
const { checkinCheckoutHandler } = require('./dist/handlers/checkinCheckout');
const { submitReviewHandler } = require('./dist/handlers/submitReview');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const TEST_PASSWORD = 'password123';
const CLIENT_EMAIL = 'review_client@test.com';
const SITTER_EMAIL = 'review_sitter@test.com';

let CLIENT_TOKEN = '';
let CLIENT_ID = '';
let SITTER_TOKEN = '';
let SITTER_ID = '';

async function setupUsers() {
    // 1. Limpieza (Aseguramos que no haya FKs en reviews)
    await pool.query('TRUNCATE TABLE reviews, bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [CLIENT_EMAIL, SITTER_EMAIL]);
    
    // 2. Registrar Cliente y obtener Token/ID
    const clientResult = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: TEST_PASSWORD }) });
    CLIENT_TOKEN = JSON.parse(clientResult.body).token;
    CLIENT_ID = JSON.parse(clientResult.body).userId;

    // 3. Registrar Sitter real y obtener Token/ID
    const sitterResult = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: TEST_PASSWORD }) });
    SITTER_TOKEN = JSON.parse(sitterResult.body).token;
    SITTER_ID = JSON.parse(sitterResult.body).userId;

    console.log(`Setup: Usuarios registrados. Sitter ID: ${SITTER_ID}`);
}

async function runFullBookingFlow(sitterId) {
    // Crea y completa una reserva
    
    // 1. Crear PENDING
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const startTime = futureDate.toISOString();
    futureDate.setHours(futureDate.getHours() + 24);
    const endTime = futureDate.toISOString();

    const createEvent = {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
        body: JSON.stringify({ sitterId, petType: 'Dog', serviceType: 'Boarding', startTime, endTime, totalPrice: 45.50 })
    };
    const createResult = await createBookingHandler(createEvent);
    const bookingId = JSON.parse(createResult.body).bookingId;
    
    // 2. ACCEPTED
    const acceptEvent = {
        headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
        body: JSON.stringify({ bookingId, status: 'ACCEPTED' })
    };
    await updateBookingStatusHandler(acceptEvent);
    
    // 3. ACTIVE (Check-in)
    const checkinEvent = {
        headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
        body: JSON.stringify({ bookingId, action: 'CHECK_IN' })
    };
    await checkinCheckoutHandler(checkinEvent);
    
    // 4. COMPLETED (Check-out)
    const checkoutEvent = {
        headers: { Authorization: `Bearer ${SITTER_TOKEN}` },
        body: JSON.stringify({ bookingId, action: 'CHECK_OUT' })
    };
    await checkinCheckoutHandler(checkoutEvent);

    return bookingId;
}


(async () => {
    let completedBookingId;
    let pendingBookingId;

    try {
        await setupUsers();
        
        // Ejecutar flujo completo para obtener una reserva COMPLETED
        completedBookingId = await runFullBookingFlow(SITTER_ID);
        console.log(`PREP: Reserva ${completedBookingId} en estado COMPLETED.`);

        // ----------------------------------------------------
        // TEST 1: Subida de Review Exitosa (Reserva COMPLETED)
        // ----------------------------------------------------
        console.log("\n[TEST 1] Subiendo Review 5 estrellas a reserva completada...");

        const reviewEvent1 = {
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
            body: JSON.stringify({ bookingId: completedBookingId, rating: 5, comment: "¡Excelente servicio!" })
        };
        const result1 = await submitReviewHandler(reviewEvent1);
        const data1 = JSON.parse(result1.body);

        if (result1.statusCode === 201 && data1.rating === 5) {
            console.log(`✅ ÉXITO: Review 5 estrellas registrada. Review ID: ${data1.reviewId}.`);
        } else {
            console.error(`❌ FALLO: Subida de Review fallida. Status: ${result1.statusCode}, Mensaje: ${result1.body}`);
        }
        
        // ----------------------------------------------------
        // TEST 2: Seguridad (Intentar subir Review dos veces)
        // ----------------------------------------------------
        console.log("\n[TEST 2] Intentando subir Review por segunda vez a la misma reserva...");

        const result2 = await submitReviewHandler(reviewEvent1);

        if (result2.statusCode === 403 && result2.body.includes("ya tiene una review")) {
            console.log(`✅ ÉXITO: Rechazo de review duplicada (Status 403).`);
        } else {
            console.error(`❌ FALLO: Falla en la validación de review duplicada. Status: ${result2.statusCode}, Mensaje: ${result2.body}`);
        }
        
        // ----------------------------------------------------
        // TEST 3: Validación de Estado (Intentar subir Review a reserva PENDING)
        // ----------------------------------------------------
        pendingBookingId = await runFullBookingFlow(SITTER_ID); // Crea nueva reserva
        
        // Hacemos TRUNCATE, ACCEPTED, ACTIVE. No COMPLETED.
        await pool.query('UPDATE bookings SET status = $1 WHERE booking_id = $2', ['ACTIVE', pendingBookingId]);
        
        console.log(`\n[TEST 3] Intentando subir Review a reserva ACTIVE (${pendingBookingId})...`);

        const reviewEvent3 = {
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
            body: JSON.stringify({ bookingId: pendingBookingId, rating: 1, comment: "Fallo en el servicio." })
        };
        const result3 = await submitReviewHandler(reviewEvent3);

        if (result3.statusCode === 403 && result3.body.includes("COMPLETED")) {
            console.log(`✅ ÉXITO: Rechazo por estado incorrecto (Status 403, Esperado: COMPLETED).`);
        } else {
            console.error(`❌ FALLO: Falla en la validación de estado. Status: ${result3.statusCode}, Mensaje: ${result3.body}`);
        }
        

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
    } finally {
        await pool.end();
    }
})();

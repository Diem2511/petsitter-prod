require('dotenv').config();

const { registerHandler } = require('./dist/handlers/register');
const { createBookingHandler } = require('./dist/handlers/createBooking');
const { createPaymentHandler } = require('./dist/handlers/createPayment');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

const pool = new Pool(dbConfig);
const PASSWORD = 'password123';
const CLIENT_EMAIL = 'payer_client@test.com';
const SITTER_EMAIL = 'payee_sitter@test.com';

let CLIENT_TOKEN, SITTER_ID;

async function setup() {
    // 0. ASEGURAR TABLA PAYMENTS (DDL)
    // Como es la primera vez que tocamos pagos, creamos la tabla si no existe.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
            payment_id UUID PRIMARY KEY,
            booking_id UUID REFERENCES bookings(booking_id),
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            payment_method VARCHAR(50),
            status VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    console.log("DB: Tabla 'payments' asegurada.");

    // Limpieza
    await pool.query('TRUNCATE TABLE payments, reviews, bookings RESTART IDENTITY CASCADE;');
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [CLIENT_EMAIL, SITTER_EMAIL]);

    // Registrar Sitter
    const sitterRes = await registerHandler({ body: JSON.stringify({ email: SITTER_EMAIL, user_type: "sitter", password: PASSWORD }) });
    SITTER_ID = JSON.parse(sitterRes.body).userId;

    // Registrar Cliente
    const clientRes = await registerHandler({ body: JSON.stringify({ email: CLIENT_EMAIL, user_type: "client", password: PASSWORD }) });
    CLIENT_TOKEN = JSON.parse(clientRes.body).token;

    console.log("SETUP: Usuarios listos.");
}

(async () => {
    try {
        await setup();

        // 1. Crear una Reserva
        console.log("\n🔄 Creando reserva para pagar...");
        const futureDate = new Date();
        const startTime = futureDate.toISOString();
        futureDate.setHours(futureDate.getHours() + 2);
        const endTime = futureDate.toISOString();

        const createRes = await createBookingHandler({
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
            body: JSON.stringify({ sitterId: SITTER_ID, petType: 'Cat', serviceType: 'Visit', startTime, endTime, totalPrice: 50.00 })
        });
        const bookingId = JSON.parse(createRes.body).bookingId;
        console.log(`   Reserva creada ID: ${bookingId}`);

        // 2. Intentar Pagar
        console.log("\n💳 Ejecutando Pago...");
        const paymentEvent = {
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` },
            body: JSON.stringify({ 
                bookingId: bookingId, 
                amount: 50.00, 
                paymentMethod: 'CREDIT_CARD' 
            })
        };

        const payRes = await createPaymentHandler(paymentEvent);
        const payBody = JSON.parse(payRes.body);

        if (payRes.statusCode === 201) {
            console.log(`✅ ÉXITO: Pago procesado. ID: ${payBody.paymentId}, Status: ${payBody.status}`);
        } else {
            console.error(`❌ FALLO: ${payRes.statusCode} - ${payBody.message}`);
        }

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        await pool.end();
    }
})();

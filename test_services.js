// Carga los handlers
const { createServiceHandler, processPaymentHandler } = require('./dist/handlers/sitterServices');

console.log("--- Ejecutando Prueba Funcional de Servicios y Pagos ---");

// ID de Roberto Gomez (Sitter ID 2)
const ROBERTO_SITTER_ID = '296057a6-68b2-4d7a-b15f-d2b56e63283a';
let testBookingId = 'f4e1f7c5-5555-4444-9999-e685f0990000'; // ID simulado para el pago

(async () => {
    try {
        // ----------------------------------------------------
        // 1. CREACIÓN DE SERVICIO (Para Roberto Gomez)
        // ----------------------------------------------------
        console.log("\n[TEST 1] Creando Servicio 'Alojamiento 24h' para Roberto...");

        const createEvent = {
            body: JSON.stringify({
                sitter_id: ROBERTO_SITTER_ID,
                service_type: "Alojamiento 24h",
                price_ars: 5000.00,
                description: "Cuidado completo de tu mascota en mi hogar."
            })
        };

        // Nota: Si el servicio ya existe, dará error controlado, pero seguimos adelante para probar el pago
        try {
            let result = await createServiceHandler(createEvent);
            if (result.statusCode === 201) {
                const body = JSON.parse(result.body);
                console.log(`✅ ÉXITO: Servicio creado. ID: ${body.service.service_id}, Precio: ${body.service.price_ars}`);
            } else {
                console.log(`ℹ️ INFO: ${JSON.parse(result.body).message}`);
            }
        } catch (e) {
            console.log("Continuando con la prueba de pagos...");
        }

        // ----------------------------------------------------
        // 2. SIMULACIÓN DE PAGO
        // ----------------------------------------------------
        console.log("\n[TEST 2] Simulando Pago para una Reserva...");
        
        // Insertamos una reserva simulada en DB
        const { Pool } = require('pg');
        const { dbConfig } = require('./dist/config/db.config');
        const pool = new Pool(dbConfig);
        
        const PET_ID = 'f4e1f7c5-3333-3333-3333-e685f0990000'; 
        const OWNER_ID = '03c812d4-0466-4e56-b089-8d75225d301c'; 
        const SERVICE_ID_DUMMY = 'f4e1f7c5-2222-2222-2222-e685f0990000'; 

        // CORRECCIÓN AQUI: Agregamos 'password_hash' al insert del usuario
        await pool.query(`
            INSERT INTO users (user_id, first_name, last_name, email, phone_number, user_type, password_hash)
            VALUES ('${OWNER_ID}', 'Dummy', 'Owner', 'owner@dummy.com', '1111111111', 'owner', 'dummy_hash_123')
            ON CONFLICT (user_id) DO NOTHING;
        `);

        await pool.query(`
            INSERT INTO pets (pet_id, owner_id, name, species)
            VALUES ('${PET_ID}', '${OWNER_ID}', 'Boby', 'dog')
            ON CONFLICT (pet_id) DO NOTHING;
        `);

        // Aseguramos que el servicio dummy exista (por si falló el TEST 1 o es otro servicio)
        await pool.query(`
            INSERT INTO services (service_id, sitter_id, service_type, price_ars)
            VALUES ('${SERVICE_ID_DUMMY}', '${ROBERTO_SITTER_ID}', 'Paseo 60min', 3000.00)
            ON CONFLICT (service_id) DO NOTHING;
        `);

        // Insertar/Resetear la reserva a PENDIENTE
        await pool.query(`
            INSERT INTO bookings (booking_id, pet_id, service_id, owner_id, sitter_id, start_time, end_time, total_price, status, payment_status)
            VALUES ($1, $2, $3, $4, $5, NOW() + interval '1 day', NOW() + interval '2 day', 5000.00, 'ACCEPTED', 'PENDING')
            ON CONFLICT (booking_id) DO UPDATE SET payment_status = 'PENDING';
        `, [testBookingId, PET_ID, SERVICE_ID_DUMMY, OWNER_ID, ROBERTO_SITTER_ID]);
        
        console.log("-> Datos de prueba (User, Pet, Booking) insertados correctamente.");

        const paymentEvent = {
            body: JSON.stringify({
                booking_id: testBookingId,
                amount: 5000.00 
            })
        };

        result = await processPaymentHandler(paymentEvent);

        if (result.statusCode === 200) {
            const body = JSON.parse(result.body);
            console.log(`✅ ÉXITO: ${body.message}, Transacción ID: ${body.transactionId}`);

            // 3. VERIFICAR ESTADO EN DB
            const checkQuery = await pool.query(`SELECT payment_status FROM bookings WHERE booking_id = $1`, [testBookingId]);
            if (checkQuery.rows[0].payment_status === 'PAID') {
                console.log("✅ VERIFICACIÓN DB: El estado de la reserva ahora es 'PAID'.");
            } else {
                console.error("❌ FALLO VERIFICACIÓN DB: El estado sigue siendo PENDING.");
            }
        } else {
            console.error("❌ FALLO en Simulación de Pago:", result.statusCode, result.body);
        }
        
        await pool.end();

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
        try {
             const { Pool } = require('pg');
             const { dbConfig } = require('./dist/config/db.config');
             const pool = new Pool(dbConfig);
             await pool.end();
        } catch {}
    }
})();

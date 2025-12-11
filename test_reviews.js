const { submitReviewHandler } = require('./dist/handlers/reviews');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

console.log("--- Ejecutando Prueba Funcional de Reseñas ---");

const TEST_BOOKING_ID = 'f4e1f7c5-5555-4444-9999-e685f0990000'; // La reserva pagada anteriormente

(async () => {
    try {
        console.log(`\n[TEST 1] Intentando dejar una reseña de 5 estrellas para la reserva ${TEST_BOOKING_ID}...`);

        const event = {
            body: JSON.stringify({
                booking_id: TEST_BOOKING_ID,
                rating: 5,
                comment: "¡Roberto es excelente! Cuidó muy bien a Boby."
            })
        };

        const result = await submitReviewHandler(event);
        const body = JSON.parse(result.body);

        if (result.statusCode === 201) {
            console.log(`✅ ÉXITO: Reseña creada. ID: ${body.review.review_id}`);
            console.log(`   Comentario guardado: "${body.review.comment}"`);
        } else if (result.statusCode === 409) {
            console.log(`ℹ️ INFO (Esperado si re-ejecutas): ${body.message}`);
        } else {
            console.error(`❌ FALLO: Código ${result.statusCode}`, body);
        }

        // Verificación en DB del promedio
        const pool = new Pool(dbConfig);
        // Roberto ID
        const ROBERTO_ID = '296057a6-68b2-4d7a-b15f-d2b56e63283a'; 
        
        const avgResult = await pool.query(`
            SELECT AVG(r.rating) as average
            FROM reviews r
            JOIN bookings b ON r.booking_id = b.booking_id
            WHERE b.sitter_id = $1
        `, [ROBERTO_ID]);
        
        console.log(`\n📊 VERIFICACIÓN: Promedio actual de Roberto en DB: ${parseFloat(avgResult.rows[0].average).toFixed(1)} / 5.0`);
        
        await pool.end();

    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
    }
})();

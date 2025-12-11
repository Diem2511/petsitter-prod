const { createReviewHandler } = require('./dist/handlers/reviews');
const { Pool } = require('pg');
const { dbConfig } = require('./dist/config/db.config');

// IDs de la prueba anterior
const BOOKING_ID = 'f4e1f7c5-5555-4444-9999-e685f0990000';
const OWNER_ID = '03c812d4-0466-4e56-b089-8d75225d301c';
const SITTER_ID = '296057a6-68b2-4d7a-b15f-d2b56e63283a'; // Roberto

console.log("--- TEST INTEGRACIÓN: REVIEW -> GRAFO ---");

(async () => {
    const pool = new Pool(dbConfig);
    try {
        // PASO PREVIO: Asegurar que el Sitter exista en Neo4j (Roberto)
        // (En un flujo real, se crea al registrarse, aquí lo forzamos para el test)
        const neo4j = require('neo4j-driver');
        const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'petsitter123'));
        const session = driver.session();
        await session.run(`
            MERGE (s:Person {id: $id}) 
            SET s.name = 'Roberto Sitter'
        `, { id: SITTER_ID });
        await session.close();
        await driver.close();
        console.log("1. Nodo de Roberto asegurado en Neo4j.");

        // PASO 1: Actualizar estado de reserva a COMPLETED en Postgres
        // (El pago ya debería estar PAID del test anterior)
        await pool.query(`
            UPDATE bookings 
            SET status = 'COMPLETED', payment_status = 'PAID' 
            WHERE booking_id = $1
        `, [BOOKING_ID]);
        console.log("2. Reserva marcada como COMPLETED y PAID en Postgres.");

        // PASO 2: Enviar Review
        const event = {
            body: JSON.stringify({
                booking_id: BOOKING_ID,
                reviewer_id: OWNER_ID,
                sitter_id: SITTER_ID,
                rating: 5,
                comment: "Excelente servicio, muy confiable."
            })
        };

        console.log("3. Enviando reseña...");
        const result = await createReviewHandler(event);
        
        if (result.statusCode === 201) {
            console.log("✅ ÉXITO API: Reseña creada.");
            
            // PASO 3: Verificar PostgreSQL
            const pgCheck = await pool.query("SELECT * FROM reviews WHERE booking_id = $1", [BOOKING_ID]);
            console.log(`   Postgres Review ID: ${pgCheck.rows[0].review_id}`);

            // PASO 4: Verificar Neo4j
            // Nos reconectamos solo para verificar
            const vDriver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'petsitter123'));
            const vSession = vDriver.session();
            const cypherRes = await vSession.run(
                "MATCH (s:Person {id: $id}) RETURN s.averageRating, s.reviewCount", 
                { id: SITTER_ID }
            );
            const node = cypherRes.records[0];
            const rating = node.get('s.averageRating');
            
            console.log(`📊 VERIFICACIÓN NEO4J:`);
            console.log(`   Sitter Rating en Grafo: ${rating}`);
            
            if (rating === 5) {
                console.log("✅ PRUEBA SUPERADA: El grafo refleja la calificación.");
            } else {
                console.log("⚠️ ATENCIÓN: El rating en el grafo no coincide (verificar lógica de promedio).");
            }
            
            await vSession.close();
            await vDriver.close();

        } else {
            console.error("❌ ERROR API:", result.statusCode, result.body);
        }

    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        await pool.end();
    }
})();

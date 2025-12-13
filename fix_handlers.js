const fs = require('fs');
const path = require('path');

const handlersDir = path.join(__dirname, 'src', 'handlers');
const files = fs.readdirSync(handlersDir);

files.forEach(file => {
    if (!file.endsWith('.ts')) return;
    
    const filePath = path.join(handlersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Cambiar la importación
    if (content.includes("import { dbConfig } from '../config/db.config';")) {
        // Ya está importado, buscamos el uso incorrecto
        
        // 2. Buscar líneas como: new Pool(dbConfig) o similar y reemplazarlas
        // por el uso directo del pool exportado
        if (content.includes('new Pool')) {
            console.log(`🔧 Arreglando ${file}...`);
            
            // Reemplazo: Quitar 'new Pool(...)' y usar directamente dbConfig.pool
            // OJO: Esto asume que el código usa 'pool.query' después.
            content = content.replace(
                /const pool = new Pool\(.*?\);/s, 
                "const pool = dbConfig.pool;"
            );
            
            // Si importaban Pool de 'pg', ya no hace falta, pero no molesta.
            fs.writeFileSync(filePath, content);
        }
    }
});
console.log('✨ Handlers parcheados.');
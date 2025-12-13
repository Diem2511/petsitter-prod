"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log('🔧 PostgreSQL Config - VERSIÓN CORREGIDA');
// USAR HOSTNAME FIJO - EVITAR DATABASE_URL PROBLEMÁTICO
const SUPABASE_HOST = 'db.qzgdviycwxzmvwtazkis.supabase.co';
const SUPABASE_PASSWORD = 'riXQZxxxxxx4o3Ne'; // Tu password real
console.log('🏷️  Usando hostname fijo:', SUPABASE_HOST);
// Crear connection string manualmente
const connectionString = `postgresql://postgres:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:5432/postgres?sslmode=require`;
console.log('🔗 Connection string generado (seguro):', connectionString.replace(/:[^:@]+@/, ':****@'));
const pool = new pg_1.Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 5,
});
// Test de conexión
setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield pool.connect();
        const result = yield client.query('SELECT NOW() as time');
        console.log('✅ PostgreSQL CONECTADO! Hora:', result.rows[0].time);
        client.release();
    }
    catch (err) {
        console.error('❌ Error conexión PostgreSQL:', err.message);
        console.error('   Host intentado:', SUPABASE_HOST);
    }
}), 2000);
exports.default = pool;

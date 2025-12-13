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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.dbConfig = void 0;
// src/config/db.config.ts
const pg_1 = require("pg");
// Usamos la misma configuración que en index.ts
const connectionString = 'postgresql://postgres:riXQZxxxxxx4o3Ne@db.qzgdviycwxzmvwtazkis.supabase.co:5432/postgres?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});
exports.pool = pool;
// Exportamos como 'dbConfig' para compatibilidad con tus handlers antiguos
exports.dbConfig = {
    pool: pool,
    query: pool.query.bind(pool),
    execute: pool.query.bind(pool),
    getConnection: () => __awaiter(void 0, void 0, void 0, function* () {
        const client = yield pool.connect();
        return {
            query: client.query.bind(client),
            release: () => client.release(),
            end: () => client.release()
        };
    })
};
exports.default = pool;

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Cargar variables de entorno desde el archivo .env
dotenv.config({ path: path_1.default.resolve(__dirname, '../../.env') });
// Configuracion de la Pool de PostgreSQL
const pool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});
/**
 * Funcion Wrapper para ejecutar consultas a la DB.
 * @param text La consulta SQL con placeholders ($1, $2, etc.)
 * @param params Los parametros a sustituir en la consulta
 * @returns El resultado de la consulta.
 */
const query = (text, params) => {
    console.log('SQL Executing:', text, params);
    return pool.query(text, params);
};
exports.query = query;
// Testear la conexion al inicio
pool.connect()
    .then(client => {
    console.log('Conexion a PostgreSQL exitosa!');
    client.release();
})
    .catch(err => {
    console.error('Error al conectar con PostgreSQL:', err.stack);
    console.error('Asegurate que el contenedor "petsitter-postgres" este corriendo.');
});

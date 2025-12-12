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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const app = (0, express_1.default)();
const port = process.env.PORT || 10000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Ruta de prueba para ver si el servidor vive
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Intentamos conectar a Supabase para ver si las credenciales funcionan
    const client = new pg_1.Client({
        connectionString: process.env.DATABASE_URL,
        // Supabase requiere SSL, esto es vital:
        ssl: { rejectUnauthorized: false }
    });
    try {
        yield client.connect();
        const result = yield client.query('SELECT NOW()'); // Pide la hora a la DB
        yield client.end();
        res.send({
            status: 'OK',
            message: '¡El Backend de PetSitter está vivo!',
            database_time: result.rows[0].now
        });
    }
    catch (err) {
        console.error('Error DB:', err);
        res.status(500).send({
            status: 'ERROR',
            message: 'El servidor prende pero falla la DB',
            error: err.message
        });
    }
}));
// Esto es lo que mantiene encendido a Render
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

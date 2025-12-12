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
exports.registerUser = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../utils/db");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv.config({ path: path_1.default.resolve(__dirname, '../../.env') });
// Definimos los tipos correctamente para que TypeScript no genere errores con jwt.sign()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const SALT_ROUNDS = 10;
/**
 * Hashea la contraseña usando bcrypt.
 */
const hashPassword = (password) => {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
/**
 * Compara una contraseña de texto plano con un hash.
 */
const comparePassword = (password, hash) => {
    return bcrypt_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
/**
 * Genera un token JWT para un usuario.
 * Se usa 'as jwt.SignOptions' para satisfacer el compilador TS.
 */
const generateToken = (userId, userType) => {
    const payload = {
        userId,
        userType,
        iat: Math.floor(Date.now() / 1000) - 30, // Issued at 30 seconds ago
    };
    // **CORRECCION TS2769 APLICADA**
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};
exports.generateToken = generateToken;
/**
 * Registra un nuevo usuario en la base de datos (PostgreSQL).
 */
const registerUser = (firstName, lastName, email, password_hash, userType) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `
        INSERT INTO users (first_name, last_name, email, password_hash, user_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id, email, user_type, created_at;
    `;
    const result = yield (0, db_1.query)(sql, [firstName, lastName, email, password_hash, userType]);
    return result.rows[0];
});
exports.registerUser = registerUser;

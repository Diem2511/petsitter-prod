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
exports.registerHandler = void 0;
const pg_1 = require("pg");
const db_config_1 = require("../config/db.config");
const user_service_1 = require("../services/user.service");
const pool = new pg_1.Pool(db_config_1.dbConfig);
const userService = new user_service_1.UserService(pool);
const registerHandler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = JSON.parse(event.body || '{}');
        // Extraemos los campos individuales del body
        const { email, user_type, password, first_name, last_name } = body;
        // Validación básica
        if (!email || !user_type || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Email, password y user_type son requeridos.' }),
            };
        }
        // Llamada corregida: Pasamos argumentos separados en lugar de un objeto
        const { token, userId } = yield userService.registerUser(email, user_type, password, first_name, last_name);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Usuario registrado exitosamente',
                userId,
                token
            }),
        };
    }
    catch (error) {
        console.error('Error en registerHandler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message || 'Error interno del servidor' }),
        };
    }
});
exports.registerHandler = registerHandler;

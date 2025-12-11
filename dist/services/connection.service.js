"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionService = void 0;
class ConnectionService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async addConnection(connectionId, userId) {
        // En una app real usaríamos DynamoDB. Aquí usamos PG para simplificar.
        await this.pool.query('INSERT INTO ws_connections (connection_id, user_id) VALUES ($1, $2) ON CONFLICT (connection_id) DO UPDATE SET user_id = EXCLUDED.user_id', [connectionId, userId]);
    }
    async removeConnection(connectionId) {
        await this.pool.query('DELETE FROM ws_connections WHERE connection_id = $1', [connectionId]);
    }
    async getUserIdByConnectionId(connectionId) {
        const result = await this.pool.query('SELECT user_id FROM ws_connections WHERE connection_id = $1', [connectionId]);
        return result.rows.length > 0 ? result.rows[0].user_id : null;
    }
}
exports.ConnectionService = ConnectionService;

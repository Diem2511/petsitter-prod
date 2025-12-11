// src/services/connection.service.ts
import { Pool } from 'pg';

export class ConnectionService {
    constructor(private pool: Pool) {}

    public async addConnection(connectionId: string, userId: string): Promise<void> {
        // En una app real usaríamos DynamoDB. Aquí usamos PG para simplificar.
        await this.pool.query('INSERT INTO ws_connections (connection_id, user_id) VALUES ($1, $2) ON CONFLICT (connection_id) DO UPDATE SET user_id = EXCLUDED.user_id', [connectionId, userId]);
    }

    public async removeConnection(connectionId: string): Promise<void> {
        await this.pool.query('DELETE FROM ws_connections WHERE connection_id = $1', [connectionId]);
    }

    public async getUserIdByConnectionId(connectionId: string): Promise<string | null> {
        const result = await this.pool.query('SELECT user_id FROM ws_connections WHERE connection_id = $1', [connectionId]);
        return result.rows.length > 0 ? result.rows[0].user_id : null;
    }
}

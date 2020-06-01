"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tedious_1 = require("tedious");
const tarn_1 = require("tarn");
class SQLPool {
    constructor(config) {
        this.config = config;
        this.pool = new tarn_1.Pool({
            create: () => {
                return new Promise((resolve, reject) => {
                    const connection = new tedious_1.Connection(this.config);
                    connection.once('connect', ((error) => {
                        if (error) {
                            console.error(`create: connection.on('connect') event, ConnectionError: ${error}`);
                            return reject(error);
                        }
                        return resolve(connection);
                    }));
                    connection.on('error', ((error) => {
                        console.error(`create: connection.on('error') event, Error: ${error}`);
                        if (error.code === 'ESOCKET')
                            connection['hasError'] = true;
                        return reject(error);
                    }));
                });
            },
            validate: connecion => !connecion['closed'] && !connecion['hasError'],
            destroy: connecion => {
                return new Promise((resolve, reject) => {
                    connecion.on('end', () => resolve());
                    connecion.on('error', (error) => {
                        console.error(`destroy: connection.on('error') event, Error: ${error}`);
                        reject(error);
                    });
                    connecion.close();
                });
            },
            min: this.config.pool.min,
            max: this.config.pool.max,
            idleTimeoutMillis: this.config.pool.idleTimeoutMillis
        });
    }
}
exports.SQLPool = SQLPool;
//# sourceMappingURL=sql-pool.js.map
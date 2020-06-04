"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
dotenv_1.config();
const sql_pool_1 = require("./sql-pool");
const sqlConfigDefault = {
    server: process.env.DB_HOST,
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        }
    },
    options: {
        encrypt: false,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT, undefined),
        requestTimeout: 2 * 60 * 1000,
    },
    pool: {
        min: 0,
        max: 1000,
        idleTimeoutMillis: 20 * 60 * 1000
    },
    batch: {
        min: 0,
        max: 1000,
    }
};
exports.DEFAULT_POOL = new sql_pool_1.SQLPool(sqlConfigDefault);
//# sourceMappingURL=DEFAULT_POOL.js.map
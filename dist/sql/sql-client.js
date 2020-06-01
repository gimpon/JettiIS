"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tedious_1 = require("tedious");
const dateReviver_1 = require("../fuctions/dateReviver");
class SQLClient {
    constructor(sqlPool, user, connection) {
        this.sqlPool = sqlPool;
        this.user = user;
        this.connection = connection;
        this.user = Object.assign({ email: '', isAdmin: false, env: {}, description: '', roles: [] }, user);
    }
    setParams(params, request) {
        for (let i = 0; i < params.length; i++) {
            if (params[i] instanceof Date) {
                request.addParameter(`p${i + 1}`, tedious_1.TYPES.DateTime2, params[i]);
            }
            else if (typeof params[i] === 'number') {
                request.addParameter(`p${i + 1}`, tedious_1.TYPES.Numeric, params[i]);
            }
            else if (typeof params[i] === 'boolean') {
                request.addParameter(`p${i + 1}`, tedious_1.TYPES.Bit, params[i]);
            }
            else
                request.addParameter(`p${i + 1}`, tedious_1.TYPES.NVarChar, params[i]);
        }
    }
    prepareSession(sql) {
        return `
      SET NOCOUNT ON;
      EXEC sys.sp_set_session_context N'user_id', N'${this.user.email}';
      EXEC sys.sp_set_session_context N'isAdmin', N'${this.user.isAdmin}';
      EXEC sys.sp_set_session_context N'roles', N'${JSON.stringify(this.user.roles)}';
      SET NOCOUNT OFF;
      ${sql}
    `;
    }
    manyOrNone(sql, params = []) {
        return (new Promise(async (resolve, reject) => {
            try {
                const connection = this.connection ? this.connection : await this.sqlPool.pool.acquire().promise;
                const request = new tedious_1.Request(this.prepareSession(sql), (error, rowCount, rows) => {
                    if (!this.connection)
                        this.sqlPool.pool.release(connection);
                    if (error)
                        return reject(error);
                    if (!rowCount)
                        return resolve([]);
                    const result = rows.map(row => {
                        const data = {};
                        row.forEach(col => data[col.metadata.colName] = col.value);
                        return this.complexObject(data);
                    });
                    return resolve(result);
                });
                this.setParams(params, request);
                connection.execSql(request);
            }
            catch (error) {
                return reject(error);
            }
        }));
    }
    async manyOrNoneStream(sql, params = [], onRow, onDone) {
        try {
            const connection = this.connection ? this.connection : await this.sqlPool.pool.acquire().promise;
            const request = new tedious_1.Request(this.prepareSession(sql), (error, rowCount, rows) => {
                if (error)
                    throw new Error(error.message);
            });
            request.on('row', (row) => onRow(row, request));
            request.on('done', (rowCount, more) => onDone(rowCount, more));
            this.setParams(params, request);
            connection.execSqlBatch(request);
        }
        catch (error) {
            throw new Error(error);
        }
    }
    oneOrNone(sql, params = []) {
        return new Promise(async (resolve, reject) => {
            try {
                const connection = this.connection ? this.connection : await this.sqlPool.pool.acquire().promise;
                const request = new tedious_1.Request(this.prepareSession(sql), (error, rowCount, rows) => {
                    if (!this.connection)
                        this.sqlPool.pool.release(connection);
                    if (error)
                        return reject(error);
                    if (!rowCount)
                        return resolve(null);
                    const data = {};
                    rows[0].forEach(col => data[col.metadata.colName] = col.value);
                    const result = this.complexObject(data);
                    return resolve(result);
                });
                this.setParams(params, request);
                connection.execSql(request);
            }
            catch (error) {
                return reject(error);
            }
        });
    }
    none(sql, params = []) {
        return new Promise(async (resolve, reject) => {
            try {
                const connection = this.connection ? this.connection : await this.sqlPool.pool.acquire().promise;
                const request = new tedious_1.Request(this.prepareSession(sql), (error, rowCount, rows) => {
                    if (!this.connection)
                        this.sqlPool.pool.release(connection);
                    if (error)
                        return reject(error);
                    return resolve();
                });
                this.setParams(params, request);
                connection.execSql(request);
            }
            catch (error) {
                return reject(error);
            }
        });
    }
    async tx(func, name, isolationLevel = tedious_1.ISOLATION_LEVEL.READ_COMMITTED) {
        const connection = this.connection ? this.connection : await this.sqlPool.pool.acquire().promise;
        await this.beginTransaction(connection, name, isolationLevel);
        try {
            await func(new SQLClient(this.sqlPool, this.user, connection), name, isolationLevel);
            await this.commitTransaction(connection);
        }
        catch (error) {
            try {
                await this.rollbackTransaction(connection);
            }
            catch (_a) { }
            throw new Error(error);
        }
        finally {
            if (!this.connection)
                this.sqlPool.pool.release(connection);
        }
    }
    beginTransaction(connection, name, isolationLevel = tedious_1.ISOLATION_LEVEL.READ_COMMITTED) {
        return new Promise(async (resolve, reject) => {
            connection.beginTransaction(error => {
                if (error)
                    return reject(error);
                return resolve(this);
            }, name, isolationLevel);
        });
    }
    commitTransaction(connection) {
        return new Promise(async (resolve, reject) => {
            connection.commitTransaction(error => {
                if (error)
                    return reject(error);
                return resolve(this);
            });
        });
    }
    rollbackTransaction(connection) {
        return new Promise(async (resolve, reject) => {
            connection.rollbackTransaction(error => {
                if (error)
                    return reject(error);
                return resolve(this);
            });
        });
    }
    complexObject(data) {
        if (!data)
            return data;
        const row = {};
        // tslint:disable-next-line:forin
        for (const k in data) {
            const value = this.toJSON(data[k]);
            if (k.includes('.')) {
                const keys = k.split('.');
                row[keys[0]] = Object.assign(Object.assign({}, row[keys[0]]), { [keys[1]]: value });
            }
            else
                row[k] = value;
        }
        return row;
    }
    toJSON(value) {
        if (typeof value === 'string' && ((value[0] === '{' && value[value.length - 1] === '}') ||
            (value[0] === '[' && value[value.length - 1] === ']')))
            try {
                return JSON.parse(value, dateReviver_1.dateReviverUTC);
            }
            catch (_a) {
                return value;
            }
        else
            return value;
    }
}
exports.SQLClient = SQLClient;
//# sourceMappingURL=sql-client.js.map
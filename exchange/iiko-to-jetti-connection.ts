import { SQLClient } from '../sql/sql-client';
import { SQLPool } from '../sql/sql-pool';
import { ColumnValue, Request } from 'tedious';
import { config as dotenv } from 'dotenv';
import { SQLConnectionConfig } from '../sql/interfaces';

dotenv();

export interface ISyncParams {
  // параметры синхронизации
  project: string,          // проект
  source: string,           // ид база источник
  baseType: string,         // тип базы источника: sql - mssql, pg - postgree
  destination: string,      // ид база приемник
  periodBegin: Date,        // дата с которой синхронизируются данные
  periodEnd: Date,          // дата по которую синхронизируются данные
  startDate: Date,          // начальная дата, с которой для базы источника ведется синхронизация
  lastSyncDate: Date,       // дата последней автосинхронизации
  autosync: boolean,        // автосинхронизация данных
  forcedUpdate: boolean,    // принудитеольное обновление данных (если false - обновляются только новые и у которых не совпадает версия данных)
  logLevel: number          // уровень логирования: 0-ошибки, 1-общая информация, 2-детальная информация
}
///////////////////////////////////////////////////////////
// Коннект с базой обмена
export const ExchangeSqlConfig: SQLConnectionConfig = {
  server: process.env.E_DB_HOST,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.E_DB_USER,
      password: process.env.E_DB_PASSWORD
    }
  },
  options: {
    trustServerCertificate: false,
    encrypt: false,
    database: process.env.E_DB_NAME,
    port: parseInt(process.env.E_DB_PORT as string, undefined),
    instanceName: process.env.E_DB_INSTANCE,
    requestTimeout: 2 * 60 * 1000
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
const exchangeSQLAdmin = new SQLPool(ExchangeSqlConfig);
///////////////////////////////////////////////////////////
// Параметры коннекта с SQL базой
export async function GetSqlConfig(baseid: string): Promise<SQLConnectionConfig> {
  // чтение параметров подключения к базе SQL по ID
  const esql = new SQLClient(exchangeSQLAdmin);
  const bp: any = await esql.oneOrNone(`
    select c.baseType as baseType, c.exchangeType as exchangeType, 
      json_value(c.data, '$.db_host') as db_host,
      json_value(c.data, '$.db_instance') as db_instance,
      json_value(c.data, '$.db_port') as db_port,
      json_value(c.data, '$.db_name') as db_name,
      json_value(c.data, '$.db_user') as db_user,
      json_value(c.data, '$.db_password') as db_password
      from dbo.connections c
      where c.id = @p1 `, [baseid]); 
  const SqlConfig: SQLConnectionConfig = {
    server: bp.db_host,
    authentication: {
      type: 'default',
      options: {
        userName: bp.db_user,
        password: bp.db_password
      }
    },
    options: {
      trustServerCertificate: false,
      encrypt: false,
      database: bp.db_name,
      port: parseInt(bp.db_port as string, undefined),
      instanceName: bp.db_instance,
      requestTimeout: 2 * 60 * 1000
    },
    pool: {
      min: 0,
      max: 1000,
      idleTimeoutMillis: 20 * 60 * 1000
    },
    batch: {
      min: 0,
      max: 10,
    }
  }
  return SqlConfig;
};
///////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////

  
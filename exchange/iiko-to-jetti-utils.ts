import { SQLClient } from '../sql/sql-client';
import { SQLPool } from '../sql/sql-pool';
import { ColumnValue, Request } from 'tedious';
import { config as dotenv } from 'dotenv';
import { SQLConnectionConfig } from '../sql/interfaces';

dotenv();

export type Ref = string | null;
export interface INoSqlDocument {
    id: Ref;
    date: Date;
    type: string;
    code: string;
    description: string;
    company: Ref;
    user: Ref;
    posted: boolean;
    deleted: boolean;
    isfolder: boolean;
    parent: Ref;
    info: string;
    timestamp: Date;
    ExchangeCode: string;
    ExchangeBase: string;
    doc: { [x: string]: any };
}

export async function noSqlDocument(doc: any, tx: SQLClient) {

}

export async function updateDocument(jsonDoc: string, id: string, tx: SQLClient) {
    const response = await tx.oneOrNone(`
      UPDATE Documents
        SET
          type = i.type, parent = i.parent,
          date = i.date, code = i.code, description = i.description,
          posted = i.posted, deleted = i.deleted, isfolder = i.isfolder,
          "user" = i."user", company = i.company, info = i.info, timestamp = GETDATE(),
          doc = i.doc,
          ExchangeCode = i.ExchangeCode, ExchangeBase = i.ExchangeBase
        FROM (
          SELECT *
          FROM OPENJSON(@p1) WITH (
            [id] UNIQUEIDENTIFIER,
            [date] DATETIME,
            [type] NVARCHAR(100),
            [code] NVARCHAR(36),
            [description] NVARCHAR(150),
            [posted] BIT,
            [deleted] BIT,
            [isfolder] BIT,
            [company] UNIQUEIDENTIFIER,
            [user] UNIQUEIDENTIFIER,
            [info] NVARCHAR(max),
            [parent] UNIQUEIDENTIFIER,
            [doc] NVARCHAR(max) N'$.doc' AS JSON,
            [ExchangeCode] NVARCHAR(50),
            [ExchangeBase] NVARCHAR(50)
          )
        ) i
      WHERE Documents.id = i.id;
    SELECT * FROM Documents WHERE id = @p2`, [jsonDoc, id]);
    return response;
}

export async function insertDocument(jsonDoc: string, exchangeCode: string, exchangeBase: string, tx: SQLClient) {
    const response = await tx.oneOrNone(`
        INSERT INTO Documents(
        [type], [date], [code], [description], [posted], [deleted],
        [parent], [isfolder], [company], [user], [info], [doc], [ExchangeCode], [ExchangeBase])
        SELECT
        [type], getdate(), [code], [description], [posted], [deleted],
        [parent], [isfolder], [company], [user], [info], [doc], [ExchangeCode], [ExchangeBase]
        FROM OPENJSON(@p1) WITH (
        [date] DATETIME,
        [type] NVARCHAR(100),
        [code] NVARCHAR(36),
        [description] NVARCHAR(150),
        [posted] BIT,
        [deleted] BIT,
        [parent] UNIQUEIDENTIFIER,
        [isfolder] BIT,
        [company] UNIQUEIDENTIFIER,
        [user] UNIQUEIDENTIFIER,
        [info] NVARCHAR(max),
        [doc] NVARCHAR(max) N'$.doc' AS JSON,
        [ExchangeCode] NVARCHAR(50),
        [ExchangeBase] NVARCHAR(50)
        );
        SELECT * FROM Documents WHERE ExchangeCode = @p2 and ExchangeBase = @p3`, [jsonDoc, exchangeCode, exchangeBase]);
    return response;
}

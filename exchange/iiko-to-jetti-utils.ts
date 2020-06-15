import { SQLClient } from '../sql/sql-client';
import { SQLPool } from '../sql/sql-pool';
import { ColumnValue, Request } from 'tedious';
import { config as dotenv } from 'dotenv';
import { SQLConnectionConfig } from '../sql/interfaces';
import { GetExchangeCatalogID } from './iiko-to-jetti-connection';
import { SetExchangeCatalogID } from './iiko-to-jetti-connection';
import { v1 as uuidv1 } from 'uuid';

dotenv();

export type Ref = string | null;
/*
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
    doc: { [x: string]: any };
}
*/

export async function GetCatalog(project: string, exchangeCode: string, exchangeBase: string, exchangeType: string, tx: SQLClient) {
  // 
  const id: Ref = await GetExchangeCatalogID(project, exchangeCode, exchangeBase, exchangeType);
  const response = await tx.oneOrNone(`SELECT * FROM Documents WHERE id = @p1 `, [id]);  
  return response;
}

export async function InsertCatalog(jsonDoc: string, id: string, source: any, tx: SQLClient) {
  // вставка элемента справочника в базу Jetti
  //! добавить обработку ошибки и откат
  const response = await tx.oneOrNone(`
      INSERT INTO Documents(
      [id], [type], [date], [code], [description], [posted], [deleted],
      [parent], [isfolder], [company], [user], [info], [doc])
      SELECT
      [id], [type], getdate(), [code], [description], [posted], [deleted],
      [parent], [isfolder], [company], [user], [info], [doc]
      FROM OPENJSON(@p1) WITH (
      [id] UNIQUEIDENTIFIER,
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
      [doc] NVARCHAR(max) N'$.doc' AS JSON
      );
      SELECT * FROM Documents WHERE id = @p2`, [jsonDoc, id]);
  await SetExchangeCatalogID(source, id);
  return response;
}

export async function UpdateCatalog(jsonDoc: string, id: string, source: any, tx: SQLClient) {
  // обновление элемента справочника в базу Jetti
  const response = await tx. oneOrNone(`
    UPDATE Documents
      SET
        type = i.type, parent = i.parent,
        date = i.date, code = i.code, description = i.description,
        posted = i.posted, deleted = i.deleted, isfolder = i.isfolder,
        "user" = i."user", company = i.company, info = i.info, timestamp = GETDATE(),
        doc = i.doc
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
          [doc] NVARCHAR(max) N'$.doc' AS JSON
        )
      ) i
    WHERE Documents.id = i.id;
  SELECT * FROM Documents WHERE id = @p2`, [jsonDoc, id]);
  await SetExchangeCatalogID(source, id);
  return response;
}


export async function GetDocument(project: string, exchangeCode: string, exchangeBase: string, exchangeType: string, tx: SQLClient) {
  
}

export async function InsertDocument(jsonDoc: string, exchangeCode: string, exchangeBase: string, tx: SQLClient) {
  const id = uuidv1().toUpperCase();
  const response = await tx.oneOrNone(`
      INSERT INTO Documents(
      [id], [type], [date], [code], [description], [posted], [deleted],
      [parent], [isfolder], [company], [user], [info], [doc], [ExchangeCode], [ExchangeBase])
      SELECT
      [type], getdate(), [code], [description], [posted], [deleted],
      [parent], [isfolder], [company], [user], [info], [doc], [ExchangeCode], [ExchangeBase]
      FROM OPENJSON(@p1) WITH (
      [id] UNIQUEIDENTIFIER,
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

export async function UpdateDocument(jsonDoc: string, id: string, tx: SQLClient) {
    const response = await tx.oneOrNone(`
      UPDATE Documents
        SET
          type = i.type, parent = i.parent,
          date = i.date, code = i.code, description = i.description,
          posted = i.posted, deleted = i.deleted, isfolder = i.isfolder,
          "user" = i."user", company = i.company, info = i.info, timestamp = GETDATE(),
          doc = i.doc
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
            [doc] NVARCHAR(max) N'$.doc' AS JSON
          )
        ) i
      WHERE Documents.id = i.id;
    SELECT * FROM Documents WHERE id = @p2`, [jsonDoc, id]);
    return response;
}


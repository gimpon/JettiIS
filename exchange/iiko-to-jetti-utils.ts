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

export async function updateDocument(doc: any, tx: SQLClient) {

    const nsDoc = await noSqlDocument(doc, tx);
    console.log(noSqlDocument);
    //const jsonDoc = JSON.stringify(noSqlDocument);
    
}
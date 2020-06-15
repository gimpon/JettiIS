import { SQLClient } from '../sql/sql-client';
import { v1 as uuidv1 } from 'uuid';
import { ColumnValue, Request } from 'tedious';
import { config as dotenv } from 'dotenv';

import { SQLPool } from '../sql/sql-pool';
import { ExchangeSqlConfig } from './iiko-to-jetti-connection';
import { ISyncParams } from './iiko-to-jetti-connection';
import { GetSqlConfig } from './iiko-to-jetti-connection';
import { isNull } from 'util';
import { GetCatalog, InsertCatalog, UpdateCatalog } from './iiko-to-jetti-utils';
import { GetDocument } from './iiko-to-jetti-utils';
import { InsertDocument } from './iiko-to-jetti-utils';
import { UpdateDocument } from './iiko-to-jetti-utils';

dotenv();

///////////////////////////////////////////////////////////
interface IiikoCounterpartie {
  project: string,
  id: string,
  baseid: string,
  type: string,
  parent: string,
  mainparent: string,
  code: string,
  name: string,
  deleted: boolean,
  isfolder: boolean,
  isClient: boolean,
  isSuplier: boolean
}
///////////////////////////////////////////////////////////
const transformCounterpartie = (syncParams: ISyncParams, source: any): IiikoCounterpartie => {
  return {
    project: syncParams.project.id,
    id: source.id,
    baseid: syncParams.source.id,
    type: 'Counterpartie',
    parent: source.parent,
    mainparent: source.mainparent,
    code: source.code,
    name: source.name,
    deleted: source.deleted,
    isfolder: false,
    isClient: false,
    isSuplier: true
  }
}  
///////////////////////////////////////////////////////////
const newCounterpartie = (syncParams: ISyncParams, iikoCounterpartie: IiikoCounterpartie): any => {
  return {
    id: uuidv1().toUpperCase(),
    type: 'Catalog.Counterpartie',
    code: syncParams.source.code + '-' + iikoCounterpartie.code,
    description: iikoCounterpartie.name,
    posted: !iikoCounterpartie.deleted,
    deleted: iikoCounterpartie.deleted,
    doc: {
      kind: 'ЮрЛицо',
      FullName: iikoCounterpartie.name,
      Department: null,
      Client: iikoCounterpartie.isClient,
      Supplier: iikoCounterpartie.isSuplier,
      isInternal: false,
      AddressShipping: null,
      AddressBilling: null,
      Phone: null,
      Code1: null,
      Code2: null,
      Code3: null,
      BC: null,
      GLN: null
    },
    parent: syncParams.source.CounterpartieFolder,
    isfolder: iikoCounterpartie.isfolder,
    company: syncParams.source.company,
    user: null,
    info: null
    //,ExchangeCode: iikoCounterpartie.id,
    // ExchangeBase: iikoCounterpartie.baseid
  }
}
///////////////////////////////////////////////////////////
async function syncCounterpartie (syncParams: ISyncParams, iikoCounterpartie: IiikoCounterpartie, destSQL: SQLClient ): Promise<any> {
  let response: any = await GetCatalog(iikoCounterpartie.project, iikoCounterpartie.id, iikoCounterpartie.baseid, 'Counterpartie', destSQL);
  if (response === null) {
    //console.log('insert Counterpartie', iikoCounterpartie.name);
    const NoSqlDocument: any = newCounterpartie(syncParams, iikoCounterpartie);
    const jsonDoc = JSON.stringify(NoSqlDocument);
    response = await InsertCatalog(jsonDoc, NoSqlDocument.id, iikoCounterpartie, destSQL);
  }
  else {
    //console.log('update Counterpartie', iikoCounterpartie.name);
    response.type = 'Catalog.Counterpartie';
    response.code = syncParams.source.code + '-'+iikoCounterpartie.code;
    response.description = iikoCounterpartie.name;
    response.posted = !iikoCounterpartie.deleted;
    response.deleted = !!iikoCounterpartie.deleted;
    response.doc.kind = 'ЮрЛицо';
    response.doc.FullName = iikoCounterpartie.name;
    response.doc.Client = iikoCounterpartie.isClient;
    response.doc.Supplier = iikoCounterpartie.isSuplier;
    response.doc.isInternal = false;
    response.isfolder = iikoCounterpartie.isfolder;
    response.company = syncParams.source.company;
    response.parent = syncParams.source.CounterpartieFolder;
    response.user = null;
    response.info = null;
    //response.ExchangeCode = iikoCounterpartie.id;
    //response.ExchangeBase = iikoCounterpartie.baseid;

    const jsonDoc = JSON.stringify(response);
    response = await UpdateCatalog(jsonDoc, response.id, iikoCounterpartie, destSQL);
  }
  // console.log(response);
  return response;
}
///////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////
export async function ImportCounterpartieToJetti(syncParams: ISyncParams) {
  if (syncParams.baseType=='sql') {
    ImportCounterpartieSQLToJetti(syncParams).catch(() => { });
  }
}
///////////////////////////////////////////////////////////
//const dSQLAdmin = new SQLPool(DestSqlConfig);
//const eSQLAdmin = new SQLPool(SourceSqlConfig);
///////////////////////////////////////////////////////////

export async function ImportCounterpartieSQLToJetti(syncParams: ISyncParams) {

    const ssqlcfg = await GetSqlConfig(syncParams.source.id);
    const ssql = new SQLClient(new SQLPool(ssqlcfg));
    const dsql = new SQLClient(new SQLPool(await GetSqlConfig(syncParams.destination)));

    let i = 0;
    let batch: any[] = [];
    await ssql.manyOrNoneStream(`
        SELECT top 145
            cast(spr.id as nvarchar(50)) as id,
            coalesce(spr.deleted,0) as deleted,
            coalesce(cast(spr.[xml] as xml).value('(/r/name/customValue)[1]' ,'nvarchar(255)'),
              cast(spr.[xml] as xml).value('(/r/name)[1]' ,'nvarchar(255)'), null) as name,
            cast(spr.[xml] as xml).value('(/r/parent)[1]' ,'nvarchar(255)') as parentid,
            cast(spr.[xml] as xml).value('(/r/code)[1]' ,'nvarchar(255)') as code,
            cast(spr.[xml] as xml).value('(/r/supplier)[1]' ,'bit') as isSupplier
        FROM dbo.entity spr
        where spr.type = 'User' and cast(spr.[xml] as xml).value('(/r/supplier)[1]' ,'bit') = 1
        -- and cast(CONVERT(datetime2(0), cast(spr.[xml] as xml).value('(/r/modified)[1]' ,'nvarchar(255)'), 126) as date)>=?
        -- and spr.id = 'A9527964-4184-4191-8D42-37FFBBD6D2BC' -- Ввод остатков 
        --  and spr.id = '0339CD20-594B-4CCC-AF7A-00268C2A8C11'
    `, [],
    async (row: ColumnValue[], req: Request) => {
      // читаем содержимое справочника порциями по ssqlcfg.batch.max
      i++;
      const rawDoc: any = {};
      row.forEach(col => rawDoc[col.metadata.colName] = col.value);
      const iikoCounterpartie: IiikoCounterpartie = transformCounterpartie(syncParams, rawDoc);
      batch.push(iikoCounterpartie);

      if (batch.length === ssqlcfg.batch.max) {
        req.pause();
        console.log('inserting to batch', i, 'docs');
        for (const doc of batch) await syncCounterpartie(syncParams, doc, dsql);
        batch = [];
        req.resume();
      }
    },
    async (rowCount: number, more: boolean) => {
        if (rowCount && !more && batch.length > 0) {
          console.log('inserting tail', batch.length, 'docs');
          for (const doc of batch) await syncCounterpartie(syncParams, doc, dsql);
        }
        // выход из скрипта...
        const dt = new Date();
        console.log('Скрипт переливки завершен. ', dt.toString());
        process.exit(0);
    });    

}

import { SQLClient } from '../sql/sql-client';
import { ColumnValue, Request } from 'tedious';
import { config as dotenv } from 'dotenv';

import { SQLPool } from '../sql/sql-pool';
import { ExchangeSqlConfig } from './iiko-to-jetti-connection';
import { ISyncParams } from './iiko-to-jetti-connection';
import { GetSqlConfig } from './iiko-to-jetti-connection';

dotenv();

///////////////////////////////////////////////////////////
interface ICounterpartie {
  id: string,
  baseid: string,
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
const transformCounterpartie = (syncParams: ISyncParams, source: any): ICounterpartie => {
  return {
    id: source.id,
    baseid: syncParams.source,
    parent: source.parent,
    mainparent: source.mainparent,
    code: source.code,
    name: source.name,
    deleted: source.deleted,
    isfolder: false,
    isClient: false,
    isSuplier: true
  }
  /*
      VATGroup: source.VATGroup,
    barcode: source.barcode,
    classifierId: source.classifierId,
    filialId: '27AF1EE7-EC17-4662-8BC6-5B9306C2A1D6',
    orderId: source.orderId,
    imageURL: source.imageURL,
    name: {
      fullName: source.fullName,
      shortName: source.shortName,
    },
    description: {
      carbohydrates: source.carbohydrates,
      composition: source.composition,
      cookingTime: source.cookingTime,
      fat: source.fat,
      proteins: source.proteins,
      weight: source.weight,
      calorie: source.calorie,
    },
    price: source.price,
  }
  */
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

    const ssqlcfg = await GetSqlConfig(syncParams.source);
    const ssql = new SQLClient(new SQLPool(ssqlcfg));
    const dsql = new SQLClient(new SQLPool(await GetSqlConfig(syncParams.destination)));

    let i = 0;
    let batch: any[] = [];
    await ssql.manyOrNoneStream(`
        SELECT  top 5
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
        --  and spr.id = 'F9FC9171-7DF1-4C45-BA6F-31547263039B'    
    `, [],
    async (row: ColumnValue[], req: Request) => {
      // читаем содержимое справочника порциями по 1000
      i++;
      const rawDoc: any = {};
      row.forEach(col => rawDoc[col.metadata.colName] = col.value);
      const Counterpartie = transformCounterpartie(syncParams, rawDoc);
      batch.push(Counterpartie);
      if (batch.length === ssqlcfg.batch.max) {
        req.pause();
        console.log('inserting to batch', i, 'docs');
        for (const doc of batch) console.log(doc.id,' ', doc.name); 
        //for (const doc of batch) await fb.collection('Lagers').doc(doc.id).set(doc);
        batch = [];
        req.resume();
      }
    },
    async (rowCount: number, more: boolean) => {
        if (rowCount && !more && batch.length > 0) {
          console.log('inserting tail', batch.length, 'docs');
          for (const doc of batch) console.log(doc.id,' ', doc.name); 
        }
        // выход из скрипта...
        console.log('Скрипт переливки завершен.');
        process.exit(0);
    });    

}

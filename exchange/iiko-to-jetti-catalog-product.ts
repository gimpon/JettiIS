import { SQLClient } from '../sql/sql-client';
import { v1 as uuidv1 } from 'uuid';
import { ColumnValue, Request } from 'tedious';
import { config as dotenv } from 'dotenv';

import { SQLPool } from '../sql/sql-pool';
import { ISyncParams, GetSqlConfig, GetExchangeCatalogID } from './iiko-to-jetti-connection';
import { GetCatalog, InsertCatalog, UpdateCatalog } from './iiko-to-jetti-utils';

///////////////////////////////////////////////////////////
interface IiikoProduct {
  project: string,
  id: string,
  baseid: string,
  type: string,
  parent: string,
  mainparent: string,
  code: string,
  name: string,
  deleted: boolean, 
  unit: string,
  unitname: string,
  prodtype: string
}
///////////////////////////////////////////////////////////
const transformProduct = (syncParams: ISyncParams, source: any): IiikoProduct => {
  return {
    project: syncParams.project.id,
    id: source.id,
    baseid: syncParams.source.id,
    type: 'Product',
    parent: source.parent,
    mainparent: source.mainparent,
    code: source.code,
    name: source.name,
    deleted: source.deleted,
    unit: source.unit,
    unitname: source.unitname,
    prodtype: source.prodtype
  }
}  
///////////////////////////////////////////////////////////
const newProduct = (syncParams: ISyncParams, iikoProduct: IiikoProduct): any => {
  return {
    id: uuidv1().toUpperCase(),
    type: 'Catalog.Product',
    code: syncParams.source.code + '-' + iikoProduct.code,
    description: iikoProduct.name,
    posted: !iikoProduct.deleted,
    deleted: !!iikoProduct.deleted,
    doc: {
      ProductKind: null,
      Unit: null
    },
    parent: syncParams.source.ProductFolder,
    isfolder: false,
    company: syncParams.source.company,
    user: null,
    info: null
  }
}
///////////////////////////////////////////////////////////
async function syncProduct (syncParams: ISyncParams, iikoProduct: IiikoProduct, destSQL: SQLClient ): Promise<any> {
  let response: any = await GetCatalog(iikoProduct.project, iikoProduct.id, iikoProduct.baseid, 'Product', destSQL);
  const ProductKind: any = await destSQL.oneOrNone(`SELECT id FROM [dbo].[Catalog.ProductKind.v] WITH (NOEXPAND) where [code]=@p1 `, [iikoProduct.prodtype]);
  //const Unit: any = await destSQL.oneOrNone(`SELECT id FROM [dbo].[Catalog.ProductKind.v] WITH (NOEXPAND) where [code]=@p1 `, [iikoProduct.prodtype]);
  if (response === null) {
    //console.log('insert Product', iikoProduct.name);
    const NoSqlDocument: any = newProduct(syncParams, iikoProduct);
    if (!(ProductKind === null)) NoSqlDocument.doc.ProductKind = ProductKind.id;
    NoSqlDocument.doc.Unit = await GetExchangeCatalogID(iikoProduct.project, iikoProduct.unit, iikoProduct.baseid, 'Unit');
    const jsonDoc = JSON.stringify(NoSqlDocument);
    response = await InsertCatalog(jsonDoc, NoSqlDocument.id, iikoProduct, destSQL);
  }
  else {
    if (syncParams.forcedUpdate) {
      //console.log('update Product', iikoProduct.name);
      response.type = 'Catalog.Product';
      response.code = syncParams.source.code + '-'+iikoProduct.code;
      response.description = iikoProduct.name;
      response.posted = !iikoProduct.deleted;
      response.deleted = !!iikoProduct.deleted;
      response.doc.ProductKind = ProductKind.id;
      response.doc.Unit = await GetExchangeCatalogID(iikoProduct.project, iikoProduct.unit, iikoProduct.baseid, 'Unit');
      response.isfolder = false;
      response.company = syncParams.source.company;
      response.parent = syncParams.source.ProductFolder;
      response.user = null;
      response.info = null;

      const jsonDoc = JSON.stringify(response);
      response = await UpdateCatalog(jsonDoc, response.id, iikoProduct, destSQL);
    }
  }
  return response;
}
///////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////
export async function ImportProductToJetti(syncParams: ISyncParams) {
  if (syncParams.baseType=='sql') {
    ImportProductSQLToJetti(syncParams).catch(() => { });
  }
}
///////////////////////////////////////////////////////////
//const dSQLAdmin = new SQLPool(DestSqlConfig);
//const eSQLAdmin = new SQLPool(SourceSqlConfig);
///////////////////////////////////////////////////////////

export async function ImportProductSQLToJetti(syncParams: ISyncParams) {

    const ssqlcfg = await GetSqlConfig(syncParams.source.id);
    const ssql = new SQLClient(new SQLPool(ssqlcfg));
    const dsql = new SQLClient(new SQLPool(await GetSqlConfig(syncParams.destination)));

    let i = 0;
    let batch: any[] = [];
    await ssql.manyOrNoneStream(`
        SELECT -- top 212
            cast(spr.id as nvarchar(50)) as id,
            coalesce(spr.deleted,0) as deleted,
            coalesce(cast(spr.[xml] as xml).value('(/r/name/customValue)[1]' ,'nvarchar(255)'),
            cast(spr.[xml] as xml).value('(/r/name)[1]' ,'nvarchar(255)'), null) as name,
            cast(spr.[xml] as xml).value('(/r/mainUnit)[1]' ,'nvarchar(255)') as unit,
            coalesce(cast(izm.[xml] as xml).value('(/r/name/customValue)[1]' ,'nvarchar(255)'),
            cast(izm.[xml] as xml).value('(/r/name)[1]' ,'nvarchar(255)'), null) as unitname,
            cast(spr.[xml] as xml).value('(/r/parent)[1]' ,'nvarchar(255)') as parentid,
            cast(spr.[xml] as xml).value('(/r/code)[1]' ,'nvarchar(255)') as code,
            cast(spr.[xml] as xml).value('(/r/type)[1]' ,'nvarchar(255)') as prodtype
        FROM dbo.entity spr
          left join dbo.entity izm on izm.id = cast(spr.[xml] as xml).value('(/r/mainUnit)[1]' , 'nvarchar(255)')
        where spr.type = 'Product'
          --and cast(CONVERT(datetime2(0), cast(spr.[xml] as xml).value('(/r/modified)[1]' ,'nvarchar(255)'), 126) as date)>=?
          -- and cast(spr.[xml] as xml).value('(/r/parent)[1]' ,'nvarchar(255)') = 'A22A2352-5768-4831-83A4-32F8928CE866'
          -- and cast(spr.[xml] as xml).value('(/r/parent)[1]' ,'nvarchar(255)')='E5DE4E02-1981-42AF-B32D-D94282D699DF'
    `, [],
    async (row: ColumnValue[], req: Request) => {
      // читаем содержимое справочника порциями по ssqlcfg.batch.max
      i++;
      const rawDoc: any = {};
      row.forEach(col => rawDoc[col.metadata.colName] = col.value);
      const iikoProduct: IiikoProduct = transformProduct(syncParams, rawDoc);
      batch.push(iikoProduct);

      if (batch.length === ssqlcfg.batch.max) {
        req.pause();
        console.log('inserting to batch', i, 'products');
        for (const doc of batch) await syncProduct(syncParams, doc, dsql);
        batch = [];
        req.resume();
      }
    },
    async (rowCount: number, more: boolean) => {
        if (rowCount && !more && batch.length > 0) {
          console.log('inserting tail', batch.length, 'products');
          for (const doc of batch) await syncProduct(syncParams, doc, dsql);
        }
        console.log('Finish sync Product.');
    });    

}

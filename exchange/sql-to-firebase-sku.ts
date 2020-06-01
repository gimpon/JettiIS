import { SQLClient } from '../sql/sql-client';
import { ColumnValue, Request } from 'tedious';
import { config as dotenv } from 'dotenv';
dotenv();

///////////////////////////////////////////////////////////
import { SQLConnectionConfig } from '../sql/interfaces';
const sqlConfig: SQLConnectionConfig = {
  server: process.env.S_DB_HOST,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.S_DB_USER,
      password: process.env.S_DB_PASSWORD
    }
  },
  options: {
    trustServerCertificate: false,
    encrypt: false,
    database: process.env.S_DB_NAME,
    port: parseInt(process.env.S_DB_PORT as string, undefined),
    requestTimeout: 2 * 60 * 1000,
    // rowCollectionOnRequestCompletion: true,
  },
  pool: {
    min: 0,
    max: 1000,
    idleTimeoutMillis: 20 * 60 * 1000
  }
};
import { SQLPool } from '../sql/sql-pool';
const SQLAdmin = new SQLPool(sqlConfig);

///////////////////////////////////////////////////////////
import * as firebaseAdmin from 'firebase-admin';
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert({
    clientEmail: process.env.client_email,
    privateKey: process.env.private_key,
    projectId: process.env.project_id
  })
});
///////////////////////////////////////////////////////////

interface ISKU {
  id: string,
  VATGroup: string,
  barcode: string,
  classifierId: number,
  filialId: string,
  imageURL: string,
  orderId: number,
  name: {
    fullName: string,
    shortName: string,
  }
  description: {
    calorie: number,
    carbohydrates: number,
    composition: string,
    cookingTime: number,
    fat: number,
    proteins: number,
    weight: number
  },
  price: number
}
///////////////////////////////////////////////////////////

const transformSKU = (source: any): ISKU => {
  return {
    id: source.id,
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
}

export async function ExportSKUToFireStore() {
  const fb = firebaseAdmin.firestore();
  const sql = new SQLClient(SQLAdmin);

  let batch: ISKU[] = []; let i = 0;
  const prices: any[] = [];

  await sql.manyOrNoneStream(`select * FROM [exc].[CalorieContent]`, [],
  
    async (row: ColumnValue[], req: Request) => {
      i++;
      const rawDoc: any = {};
      row.forEach(col => rawDoc[col.metadata.colName] = col.value);
      const SKU = transformSKU(rawDoc);
      prices.push({ lagerId: SKU.id, price: SKU.price })
      batch.push(SKU);
      if (batch.length === 1000) {
        req.pause();
        console.log('inserting to firebase', i, 'docs');
        for (const doc of batch) await fb.collection('Lagers').doc(doc.id).set(doc);
        batch = [];
        req.resume();
      }
    },

    async (rowCount: number, more: boolean) => {
      if (rowCount && !more && batch.length > 0) {
        console.log('inserting tail', batch.length, 'docs');
        for (const doc of batch) await fb.collection('Lagers').doc(doc.id).set(doc);
        const Prices = {
          filialId: '27AF1EE7-EC17-4662-8BC6-5B9306C2A1D6',
          prices: [...prices]
        }
        console.log(Prices);
        await fb.collection('Prices').doc('27AF1EE7-EC17-4662-8BC6-5B9306C2A1D6').set(Prices);
        console.log('Complete')
      }
    });

}

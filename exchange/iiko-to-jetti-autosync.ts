import { ImportCounterpartieToJetti } from "./iiko-to-jetti-catalog-counterpartie";
import { ISyncParams } from "./iiko-to-jetti-connection";

export async function AutosincIkoToJetty(projectID: string) {

    console.log(`Автосинхронизация данных IIKO - Jetti: ${projectID}.`);

    //! временно, эти патаметры будем определять из excange базы по проекту...
    let syncParams: ISyncParams  = {
        project: projectID,
        source: 'Russia', //  Kazakhstan
        baseType: 'sql',
        destination: 'SMV',
        periodBegin: new Date(2020,6,1),
        periodEnd: new Date(2006,6,2),
        startDate: new Date(2006,6,1),
        lastSyncDate: new Date(2020,6,1,15,25,36),
        autosync: true,
        forcedUpdate: true,
        logLevel: 0
    };

    //!console.log("Справочник номенклатуры");

    console.log("Справочник контрагентов");
    ImportCounterpartieToJetti(syncParams).catch(() => { });

    //!console.log("Справочник физлица&менеджеры");


}

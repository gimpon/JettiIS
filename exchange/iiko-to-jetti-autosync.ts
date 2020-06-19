// модуль автосинхронизации IIKO - Jetti

import { ISyncParams } from "./iiko-to-jetti-connection";
import { IJettiProject } from "./jetti-projects";
import { RussiaSource } from "./jetti-projects";
import { ImportCounterpartieToJetti } from "./iiko-to-jetti-catalog-counterpartie";
import { ImportProductToJetti } from "./iiko-to-jetti-catalog-product";


export async function AutosincIkoToJetty(project: IJettiProject, syncSource: string) {
    const dt = new Date();
    console.log(`Автосинхронизация данных IIKO - Jetti: ${syncSource} ==> ${project.id}.`);
    console.log("Старт", dt.toString());
    //! временно, эти патаметры будем определять из excange базы по проекту и базе источнику...
    let syncParams: ISyncParams  = {
        project: project,
        source: RussiaSource,
        baseType: 'sql',
        destination: project.destination,
        periodBegin: new Date(2020,6,1),
        periodEnd: new Date(2006,6,2),
        startDate: RussiaSource.firstDate,
        lastSyncDate: new Date(2020,6,1,15,25,36),
        autosync: true,
        forcedUpdate: false, // ! пока обновление только новых данных
        logLevel: 0,
        startTime: dt,
        finishTime: null
    };

    console.log("Справочник номенклатуры.");
    ImportProductToJetti(syncParams).catch(() => { });

    //console.log("Справочник контрагентов.");
    //ImportCounterpartieToJetti(syncParams).catch(() => { });

    //!console.log("Справочник физлица&менеджеры");

}

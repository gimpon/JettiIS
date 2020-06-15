import { ImportCounterpartieToJetti } from "./iiko-to-jetti-catalog-counterpartie";
import { ISyncParams } from "./iiko-to-jetti-connection";
import { IJettiProject } from "./jetti-projects";
import { RussiaSource } from "./jetti-projects";

export async function AutosincIkoToJetty(project: IJettiProject, syncSource: string) {

    console.log(`Автосинхронизация данных IIKO - Jetti: ${syncSource} ==> ${project.id}.`);

    //! временно, эти патаметры будем определять из excange базы по проекту...
    let syncParams: ISyncParams  = {
        project: project,
        source: RussiaSource,
        baseType: 'sql',
        destination: project.destination,
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

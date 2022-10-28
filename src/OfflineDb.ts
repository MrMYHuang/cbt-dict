import Globals from "./Globals";
import IndexedDbFuncs from "./IndexedDbFuncs";
import IndexedDbZipFuncs from "./IndexedDbZipFuncs";

const electronBackendApi: {
    send: (channel: string, data: any) => any,
    receive: (channel: string, func: Function) => {},
    receiveOnce: (channel: string, func: Function) => {},
    invoke: (channel: string, data: any) => Promise<any>,
} = (window as any).electronBackendApi;

const dictInfosKey = 'dictInfos';
const dictInfosVersion = 1;

export interface DictEntry {
    form: string;
    sense: string;
}

interface DictInfos {
    dictEntries: DictEntry[];
    version: number;
}

const xmlParser = new DOMParser();
const textDecoder = new TextDecoder();
let dictInfos: DictInfos = {
    dictEntries: [],
    version: dictInfosVersion,
};
let isInit = false;
let isInitializing = false;

function stringToXml(str: string) {
    return xmlParser.parseFromString(str, 'text/xml');
}

async function getFileAsStringFromIndexedDB(file: string) {
    return textDecoder.decode((await IndexedDbZipFuncs.getZippedFile(file)) as Uint8Array);
}

export async function init(forceUpdate = false) {
    // Avoid multiple inits.
    if (isInitializing) {
        return new Promise<void>(ok => {
            const timer = setInterval(() => {
                if (isInit) {
                    clearInterval(timer);
                    ok();
                }
            }, 100);
        });
    }
    isInitializing = true;

    // Try to load dictInfos cache.
    try {
        if (await IndexedDbFuncs.checkKey(dictInfosKey)) {
            const dictInfosTemp = await IndexedDbFuncs.getFile<DictInfos>(dictInfosKey);
            if (dictInfosTemp.version === dictInfosVersion) {
                dictInfos = dictInfosTemp;
            }
        }
    } catch (error) {
        // Ignore.
    }

    if (forceUpdate || dictInfos.dictEntries.length === 0) {
        const documentString = await getFileAsStringFromIndexedDB(`/${Globals.assetsDir}/ddbc.soothill-hodous.tei.p5.xml`);
        await initFromFiles(documentString);
    }

    isInitializing = false;
    isInit = true;
}

export async function initFromFiles(documentString: string) {
    dictInfos.dictEntries = await processDictXmlString(documentString);
    IndexedDbFuncs.saveFile(dictInfosKey, dictInfos);
}

// Don't forget to increase Globals.assetsVersion after changing this.
export async function processDictXmlString(documentString: string) {
    const doc = stringToXml(documentString);
    const entries = doc.getElementsByTagName('entry');

    const dictEntries = Array.from({ length: entries.length }, (v, i) => {
        // entry
        const ele = entries[i];
        const form = ele.getElementsByTagName('form')[0];
        const sense = ele.getElementsByTagName('sense')[0];
        const dictEntry = {
            form: form.textContent,
            sense: sense.textContent,
        } as DictEntry;
        return dictEntry;
    });

    return dictEntries;
}

async function getDictEntries() {
    isInit || await init();
    return dictInfos.dictEntries;
}

const CbetaOfflineDb = {
    getDictEntries,
    electronBackendApi,
    init,
};

export default CbetaOfflineDb;
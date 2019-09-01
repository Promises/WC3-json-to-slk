import {readFileSync, existsSync} from "fs-extra";
import {SLKFileManager} from "./models/SLKFileManager";
import {WC3ObjectHandler} from "wc3-objectified-handler";
import {WCUnit} from "wc3-objectified-handler/dist/lib/data/Unit";

export class WCJsonToSLK {
    private inputFilePath: string;
    private outputFolder: string;
    private UnitMap: Map<string, WCUnit> = new Map<string, WCUnit>();
    private objectHandler: WC3ObjectHandler;

    constructor(input: string, output: string) {
        this.objectHandler = new WC3ObjectHandler();
        this.inputFilePath = input;
        this.outputFolder = output;

        if (!this.LoadJsonObject()) {
            console.error('failed to load input, exiting');
            return;
        }
        if (this.UnitMap.size === 0) {
            console.error('No Units in input, exiting');
            return;
        }
        if (!this.SaveSLK()) {
            console.error('failed to write slk, exiting');
            return;
        }
    }



    private LoadJsonObject(): boolean {
        if (!existsSync(this.inputFilePath)) {
            console.error('failed to load unit fields json', this.inputFilePath);
            return false;
        }
        const fieldData: any = JSON.parse(readFileSync(this.inputFilePath).toString());

        this.UnitMap = this.objectHandler.ParseJsonObject(fieldData);
        return true;

    }

    private SaveSLK(): boolean {

        const fileManager: SLKFileManager = new SLKFileManager(this.objectHandler);
        fileManager.setCount(this.UnitMap.size);

        for (const UID of this.UnitMap.keys()) {
            fileManager.writeUnit(UID, this.UnitMap.get(UID));
        }
        fileManager.writeFile(this.outputFolder);

        return true;
    }


}

import {SLKFile} from "./SLKFile";
import {WC3ObjectHandler} from "wc3-objectified-handler";
import {SLKFileDef} from "wc3-objectified-handler/dist/lib/data/Fields";
import {UnitField, WCUnit} from "wc3-objectified-handler/dist/lib/data/Unit";

export class SLKFileManager {
    private CampaignUnitFunc: SLKFile;
    private UnitWeapons: SLKFile;
    private UnitAbilities: SLKFile;
    private UnitData: SLKFile;
    private UnitBalance: SLKFile;
    private UnitUI: SLKFile;
    private objectHandler: WC3ObjectHandler;

    constructor(objectHandler: WC3ObjectHandler) {
        this.CampaignUnitFunc = new SLKFile(SLKFileDef.CAMPAIGN_UNIT_FUNC);
        this.UnitWeapons = new SLKFile(SLKFileDef.UNIT_WEAPONS);
        this.UnitAbilities = new SLKFile(SLKFileDef.UNIT_ABILITIES);
        this.UnitBalance = new SLKFile(SLKFileDef.UNIT_BALANCE);
        this.UnitData = new SLKFile(SLKFileDef.UNIT_DATA);
        this.UnitUI = new SLKFile(SLKFileDef.UNIT_UI);
        this.objectHandler = objectHandler;
    }

    public setCount(count: number): void {
        this.UnitWeapons.setCount(count);
        this.UnitAbilities.setCount(count);
        this.UnitBalance.setCount(count);
        this.UnitData.setCount(count);
        this.UnitUI.setCount(count);
    }

    public writeUnit(UID: string, unitData: WCUnit) {
        this.CampaignUnitFunc.startUnit(UID);
        this.UnitWeapons.startUnit(UID);
        this.UnitAbilities.startUnit(UID);
        this.UnitBalance.startUnit(UID);
        this.UnitData.startUnit(UID);
        this.UnitUI.startUnit(UID);
        for (const field in unitData) {
            if (field !== 'isCustom' && field !== 'baseUnit' && field !== 'GetName' && field !== 'setDefaults') {
                const fieldData: UnitField | undefined = this.objectHandler.GetUnitFieldData(field);
                if (fieldData) {

                    const file: SLKFile = this.getSlkFile(fieldData.slk);
                    // @ts-ignore
                    file.writeField(unitData[field], fieldData);
                }
            }
        }


    }

    private getSlkFile(slkIdentifier: string): SLKFile {
        switch (slkIdentifier) {
            case 'Profile':
                return this.CampaignUnitFunc;
            case 'UnitWeapons':
                return this.UnitWeapons;
            case 'UnitUI':
                return this.UnitUI;
            case 'UnitBalance':
                return this.UnitBalance;
            case 'UnitData':
                return this.UnitData;
            case 'UnitAbilities':
                return this.UnitAbilities;
        }
    }

    writeFile(outputFolder: string): void {
        this.UnitWeapons.writeFile(outputFolder);
        this.CampaignUnitFunc.writeFile(outputFolder);
        this.UnitAbilities.writeFile(outputFolder);
        this.UnitBalance.writeFile(outputFolder);
        this.UnitData.writeFile(outputFolder);
        this.UnitUI.writeFile(outputFolder);


    }
}

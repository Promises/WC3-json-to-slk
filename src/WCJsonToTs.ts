import {readFileSync} from "fs-extra";
import {dirname, join} from "path";
import {createReadStream, existsSync} from "fs";
import {SLKFileDef, UnitField, WCUnit} from "./models/Unit";
import {createInterface, ReadLine} from "readline";
import {SLKFile} from "./models/SLKFile";
import {SLKFileManager} from "./models/SLKFileManager";

export class WCJsonToTs {
    private inputFilePath: string;
    private outputFolder: string;
    private DefaultUnits: Map<string, WCUnit> = new Map<string, WCUnit>();
    private FieldData: Map<string, UnitField> = new Map<string, UnitField>();
    private SlkFieldBindings: Map<string, string> = new Map<string, string>();
    public FIELD_ID_INDEXED: string = 'INDX';
    private UnitMap: Map<string, WCUnit> = new Map<string, WCUnit>();

    constructor(input: string, output: string) {
        this.inputFilePath = input;
        this.outputFolder = output;
        if (!this.LoadUnitFieldConstants()) {
            console.error('failed to load unit fields, exiting');
            return;
        }
        if (!this.loadDefaultUnits()) {
            console.error('failed to load base units, exiting');
            return;
        }
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

    loadDefaultUnits(): boolean {
        const path: string = join(dirname(__dirname), 'assets', 'DefaultUnits.json');
        if (!existsSync(path)) {
            console.error('failed to load default units json', path);
            return false;
        }

        const unitData: any = JSON.parse(readFileSync(path).toString());
        for (const key in unitData) {

            if (unitData.hasOwnProperty(key)) {
                const u: WCUnit = new WCUnit({isCustom: false});
                for (const field in unitData[key]) {
                    if (unitData[key].hasOwnProperty(field)) {
                        let fld = this.SlkFieldToUnitField(field);
                        if (fld) {
                            let d: string = unitData[key][field];
                            if (d.startsWith('"')) {
                                d = d.substr(1, d.length - 2);

                            }
                            if (d === '_' || d === '-') {
                                d = '';
                            }
                            // @ts-ignore
                            u[fld] = this.CleanType(fld, d);
                        }
                    }
                }
                this.DefaultUnits.set(key, u);

            }

        }
        return true;
    }

    public LoadUnitFieldConstants(): boolean {
        const path: string = join(dirname(__dirname), 'assets', 'UnitMetaData.json');
        if (!existsSync(path)) {
            console.error('failed to load unit fields json', path);
            return false;
        }
        const fieldData: any = JSON.parse(readFileSync(path).toString());
        // console.log('loaded field data');
        for (const key in fieldData) {
            if (fieldData.hasOwnProperty(key)) {
                this.FieldData.set(key, fieldData[key]);
            }
        }
        const indexed: string[] = [];
        this.FieldData.forEach((value, key) => {
            if (value.index === '-1' || value.index === '0') {
                this.SlkFieldBindings.set(value.field, key);
            } else {
                this.SlkFieldBindings.set(value.field + value.index, key);
                indexed.push(value.field);
            }
        });
        indexed.forEach((value => {
            if (this.SlkFieldBindings.has(value)) {
                const d: UnitField = <UnitField>this.FieldData.get(<string>this.SlkFieldBindings.get(value));
                this.SlkFieldBindings.set(d.field, this.FIELD_ID_INDEXED);
                this.SlkFieldBindings.set(d.field + d.index, d.ID);
            } else {
                console.error(value);
            }
        }));
        return true;
    }

    public SlkFieldToUnitField(key: string): string {
        let field: string | undefined = this.SlkFieldBindings.get(key);
        if (field) {
            return field;
        }
        return '';
    }

    public GetUnitFieldData(fieldName: string): UnitField {
        let fieldData: UnitField | undefined = this.FieldData.get(fieldName);
        return <UnitField>fieldData;
    }

    private CleanType(fieldName: string, data: string): any {

        switch ((<UnitField>this.FieldData.get(fieldName)).type) {
            case 'string':
                return data;
            case 'int':
                return Number(data);
            case 'unreal':
                return Number(data);
            case 'real':
                return Number(data);
            default:
                console.log('CleanType', `Couldn't find: ${(<UnitField>this.FieldData.get(fieldName)).type}`);
                return data;
        }
    }

    private LoadJsonObject(): boolean {
        if (!existsSync(this.inputFilePath)) {
            console.error('failed to load unit fields json', this.inputFilePath);
            return false;
        }
        const fieldData: any = JSON.parse(readFileSync(this.inputFilePath).toString());

        this.ParseJsonObject(fieldData);
        return true;

    }

    private ParseJsonObject(data: any) {

        for (const unit in data.custom) {
            if (data.custom.hasOwnProperty(unit)) {
                const relation: string[] = unit.split(':');
                const u: WCUnit = new WCUnit({isCustom: true, baseUnit: relation[1]});
                u.setDefaults(this.DefaultUnits.get(u.baseUnit), u.baseUnit);
                for (const attr of data.custom[unit]) {
                    // @ts-ignore
                    u[attr.id] = attr.value;
                }
                this.UnitMap.set(relation[0], u);
            }
        }
    }

    private SaveSLK(): boolean {

        const fileManager: SLKFileManager = new SLKFileManager(this.FieldData);
        fileManager.setCount(this.UnitMap.size);

        for (const UID of this.UnitMap.keys()) {
            fileManager.writeUnit(UID, this.UnitMap.get(UID));
        }
        fileManager.writeFile(this.outputFolder);
        // ADD FOOTER

        return true;
    }


}

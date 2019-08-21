import {FileName, SLKFileDef, SLKTag, UnitField} from "./Unit";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "fs";
import {dirname, join} from "path";

export class SLKFile {
    private lines: string[] = [];
    private currentUnit: string[] = [];
    private filetype: SLKFileDef;
    private currentUnitINDX: number = 1;
    fieldtoIndx: Map<string, number> = new Map<string, number>();
    private pendingFields: Map<string, any> = new Map<string, any>();
    private fieldDefs: Map<string, UnitField> = new Map<string, UnitField>();

    constructor(filetype: SLKFileDef) {
        this.filetype = filetype;
        if (this.filetype != SLKFileDef.CAMPAIGN_UNIT_FUNC) {

            this.readHeader();
        }
    }

    writeFooter(): void {
        if (this.filetype === SLKFileDef.CAMPAIGN_UNIT_FUNC) {
            this.lines.push(SLKTag.EMPTY);
        } else {
            this.lines.push(SLKTag.END);
            this.lines.push(SLKTag.EMPTY);
        }
    }

    private readHeader() {
        const path: string = join(dirname(__dirname), '..', 'assets', 'Units', FileName(this.filetype));
        if (!existsSync(path)) {
            console.error('failed to load slk header', path);
            return false;
        }

        let headerstr: string = readFileSync(path).toString();
        for (const line of headerstr.split(/\r?\n/)) {
            this.lines.push(line);
            if (line[0] === 'C') {
                const mtch: string[] = line.match(/C;X([0-9]+)(.*);K"(.*)"/);
                if (mtch[1] === '1') {
                } else {
                    this.fieldtoIndx.set(mtch[3], Number(mtch[1]));
                }

            }
        }
        if (this.lines[this.lines.length - 1] === '') {
            this.lines.pop()
        }
    }

    setCount(count: number) {
        this.lines[1] = this.lines[1].slice(0, this.lines[1].length - 6) + `${count + 1};D0`;
    }

    startUnit(UID: string) {
        this.currentUnitINDX++;
        this.finishUnit();
        if (this.filetype === SLKFileDef.CAMPAIGN_UNIT_FUNC) {
            this.currentUnit.push(`[${UID}]`)
        } else {
            this.currentUnit.push(`C;X1;Y${this.currentUnitINDX};K"${UID}"`)
        }
    }

    writeField(unitData: any, fieldData: UnitField) {
        if (this.filetype === SLKFileDef.CAMPAIGN_UNIT_FUNC) {
            this.pendingFields.set(fieldData.ID, unitData);
            this.fieldDefs.set(fieldData.ID, fieldData);
            // if (fieldData.type === 'string') {
            //     this.currentUnit.push(`${fieldData.field}="${unitData}"`)
            // } else {
            //     this.currentUnit.push(`${fieldData.field}=${unitData}`)
            // }
        } else {
            if (fieldData.type === 'string') {
                if (unitData === "") {
                    unitData = "_";
                }
                this.currentUnit.push(`C;X${this.fieldtoIndx.get(fieldData.field)};K"${unitData}"`)
            } else {
                this.currentUnit.push(`C;X${this.fieldtoIndx.get(fieldData.field)};K${unitData}`)
            }
        }
    }

    writeFile(outputFolder: string) {
        this.finishUnit();
        this.writeFooter();
        if (!existsSync(outputFolder)) {
            mkdirSync(outputFolder);
        }
        writeFileSync(join(outputFolder, FileName(this.filetype)), this.lines.join('\r\n'))

    }

    finishUnit() {
        if (this.currentUnit.length != 0) {

            switch (this.filetype) {
                case SLKFileDef.CAMPAIGN_UNIT_FUNC:
                    const builtFields: Map<string, string> = new Map<string, string>();
                    for (const fieldName of this.pendingFields.keys()) {
                        const fieldDef: UnitField = this.fieldDefs.get(fieldName);
                        let newvalue = "";

                        if (builtFields.has(fieldDef.field)) {
                            switch (fieldDef.index) {
                                case '0':
                                    newvalue = `${this.pendingFields.get(fieldName)},${builtFields.get(fieldDef.field)}`;
                                    if (fieldDef.type === 'string') {
                                        newvalue = `"${newvalue}"`
                                    }
                                    builtFields.set(fieldDef.field,
                                        newvalue,
                                    );
                                    break;
                                case '1':
                                    newvalue = `${builtFields.get(fieldDef.field)},${this.pendingFields.get(fieldName)}`;


                                    if (fieldDef.type === 'string') {
                                        newvalue = `"${newvalue}"`
                                    }
                                    builtFields.set(fieldDef.field,
                                        newvalue,
                                    );
                                    break;
                                default:
                                    console.log('unhandled: ', fieldDef.index);
                                    break;
                            }
                        } else {
                            newvalue = this.pendingFields.get(fieldName);
                            builtFields.set(fieldDef.field, newvalue);
                        }
                    }
                    for(const field of builtFields.keys()){
                        this.currentUnit.push(`${field}=${builtFields.get(field)}`);
                    }
                    // if (fieldData.type === 'string') {
                    //     this.currentUnit.push(`${fieldData.field}="${unitData}"`)
                    // } else {
                    //     this.currentUnit.push(`${fieldData.field}=${unitData}`)
                    // }
                    this.currentUnit.push(SLKTag.EMPTY);
                    this.pendingFields = new Map<string, any>();
                    break;
                case SLKFileDef.UNIT_ABILITIES:
                    if (this.currentUnit.findIndex((unitL) => unitL.startsWith('C;X4')) === -1) {
                        this.currentUnit.push('C;X4;K"_"'); // REQUIRED FIELD
                    }
                    break;
                case SLKFileDef.UNIT_BALANCE:
                    this.ensureField('C;X6;KFALSE', 'C;X5;');
                    // this.ensureField('C;X12;K"-"');
                    // this.ensureField('C;X13;K"-"');
                    // this.ensureField('C;X17;K0');
                    // this.ensureField('C;X18;K0');
                    // this.ensureField('C;X19;K0');
                    // this.ensureField('C;X22;K"-"');
                    const indx23: number = this.currentUnit.findIndex((unitL) => unitL.startsWith('C;X23;K'));
                    if (indx23 !== -1) {
                        const firstarray = this.currentUnit.slice(0, indx23 + 1);
                        const secondarray = this.currentUnit.slice(indx23 + 1, this.currentUnit.length);

                        firstarray.push('C;X24;K' + this.currentUnit[indx23].slice(7)); // REQUIRED FIELD
                        this.currentUnit = firstarray.concat(secondarray);
                    }
                    const indx31: number = this.currentUnit.findIndex((unitL) => unitL.startsWith('C;X31;K'));
                    if (indx31 !== -1) {
                        const firstarray = this.currentUnit.slice(0, indx31 + 2);
                        const secondarray = this.currentUnit.slice(indx31 + 2, this.currentUnit.length);
                        firstarray.push('C;X33;K' + this.currentUnit[indx31].slice(7)); // REQUIRED FIELD
                        this.currentUnit = firstarray.concat(secondarray);

                    }

                    const indx27: number = this.currentUnit.findIndex((unitL) => unitL.startsWith('C;X27;K'));
                    if (indx27 !== -1) {
                        const firstarray = this.currentUnit.slice(0, indx27 + 1);
                        const secondarray = this.currentUnit.slice(indx27 + 1, this.currentUnit.length);
                        firstarray.push('C;X28;K' + this.currentUnit[indx27].slice(7)); // REQUIRED FIELD
                        this.currentUnit = firstarray.concat(secondarray);

                    }
                    // this.ensureField('C;X24;K');
                    // this.ensureField('C;X25;K"-"');
                    // this.ensureField('C;X27;K');
                    // this.ensureField('C;X28;K');
                    // this.ensureField('C;X29;K');
                    // this.ensureField('C;X30;K');
                    // this.ensureField('C;X33;K2');
                    // this.ensureField('C;X36;K0');
                    // this.ensureField('C;X37;K0');
                    // this.ensureField('C;X41;K');
                    // this.ensureField('C;X42;K');
                    // this.ensureField('C;X43;K"-"');
                    // this.ensureField('C;X44;K"-"');
                    // this.ensureField('C;X45;K');
                    // this.ensureField('C;X46;K');
                    // this.ensureField('C;X47;K');
                    this.ensureField('C;X48;K"-"', 'C;X47;');
                    // this.ensureField('C;X49;K"_"');
                    // this.ensureField('C;X52;K"-"');
                    // this.ensureField('C;X55;K"_"');
                    // this.ensureField('C;X58;K0');
                    // this.ensureField('C;X59;K0');
                    break;
            }
            this.lines.push(...this.currentUnit);
            this.currentUnit = [];
        }
    }

    private ensureField(field: string, after: string) {

        if (this.currentUnit.findIndex((unitL) => unitL.startsWith(field.slice(0, 5))) === -1) {
            const indx: number = this.currentUnit.findIndex((unitL) => unitL.startsWith(after));
            if (indx !== -1) {
                const firstarray = this.currentUnit.slice(0, indx + 1);
                const secondarray = this.currentUnit.slice(indx + 1, this.currentUnit.length);

                firstarray.push(field); // REQUIRED FIELD
                this.currentUnit = firstarray.concat(secondarray);
            }
        }
    }
}

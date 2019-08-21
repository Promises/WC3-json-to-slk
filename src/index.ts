import {WCJsonToSLK} from "./WCJsonToSLK";
import {dirname, join} from "path";

new WCJsonToSLK(join(dirname(__dirname), 'Units.json'), join(dirname(__dirname), 'Units'));

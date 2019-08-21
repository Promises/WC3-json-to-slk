import {WCJsonToTs} from "./WCJsonToTs";
import {dirname, join} from "path";

new WCJsonToTs(join(dirname(__dirname), 'Units.json'), join(dirname(__dirname), 'Units'));

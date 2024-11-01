import {JSONFilePreset} from "lowdb/node";
import path from 'path';
import {fileURLToPath} from 'url';

import {TokensRepository} from "./TokensRepository.js";
import {ReferralRepository} from "./ReferralRepository.js";
import {DialogsRepository} from "./DialogsRepository.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(path.join(__dirname, '../db/tokens.json'))
console.log(path.join(__dirname, '../db/referrals.json'))
console.log(path.join(__dirname, '../db/dialogs.json'))
const tokensDB = await JSONFilePreset("../db/tokens.json", {tokens: []})
const referralsDB = await JSONFilePreset('../db/referrals.json', {tokens: []})
const dialogsDB = await JSONFilePreset('../db/dialogs.json', {tokens: []})

export const tokensRepository = new TokensRepository(tokensDB)
export const referralRepository = new ReferralRepository(referralsDB)
export const dialogsRepository = new DialogsRepository(dialogsDB)


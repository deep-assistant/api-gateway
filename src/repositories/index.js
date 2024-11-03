import {JSONFilePreset} from "lowdb/node";
import path from 'path';
import {fileURLToPath} from 'url';

import {TokensRepository} from "./TokensRepository.js";
import {ReferralRepository} from "./ReferralRepository.js";
import {DialogsRepository} from "./DialogsRepository.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(path.join(__dirname, '../db/tokens.json'))
const tokensDB = await JSONFilePreset(path.join(__dirname, '../db/tokens.json'), {tokens: []})
const referralsDB = await JSONFilePreset(path.join(__dirname, '../db/referrals.json'), {referrals: []})
const dialogsDB = await JSONFilePreset(path.join(__dirname, '../db/dialogs.json'), {dialogs: []})

export const tokensRepository = new TokensRepository(tokensDB)
export const referralRepository = new ReferralRepository(referralsDB)
export const dialogsRepository = new DialogsRepository(dialogsDB)


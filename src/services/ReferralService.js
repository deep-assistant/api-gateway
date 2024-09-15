import {fileURLToPath} from "url";
import path from "path";
import {loadData, saveData} from "../utils/dbManager.js";
import {HttpException} from "../rest/HttpException.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const referralsPath = path.join(__dirname, "../db", "referrals.json");

export class ReferralService {
    constructor(tokensService) {
        this.tokensService = tokensService
    }

    async getReferrals() {
        let referralsData = await loadData(referralsPath);

        if (!referralsData || !referralsData.referrals) {
            referralsData = {referrals: []};
        }

        return referralsData;
    }

    async createReferral(id, parent = null) {
        const referralsData = await this.getReferrals()
        const foundReferral = this.findReferralById(referralsData, id)

        if (foundReferral) {
            throw new HttpException(400, "Реферал уже существует!")
        }

        const referral = {
            id,
            parent,
            children: [],
            createDate: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            isActivated: false,
            award: 10000
        }

        if (parent) {
            const foundParent = this.findReferralById(referralsData, parent)
            if (foundParent) {
                foundParent.children.push(id)

                await this.tokensService.updateUserToken(id, 5000, "add")
                await this.tokensService.updateAdminTokenByUserId(id)

                await this.tokensService.updateUserToken(parent, 15000,"add")
                await this.tokensService.updateAdminTokenByUserId(parent)
            }
        }

        referralsData.referrals.push(referral)

        await saveData(referralsPath, referralsData);

        return referral
    }

    async getReferral(id) {
        const referralsData = await this.getReferrals()
        const foundReferral = this.findReferralById(referralsData, id)

        if (!foundReferral) {
            return this.createReferral(id)
        }

        return foundReferral
    }

    findReferralById(referralsData, id) {
        return referralsData.referrals.find((referral) => referral.id === id)
    }

    async getAward(id) {
        const referralsData = await this.getReferrals()
        const foundReferral = await this.getReferral(id)

        const lastUpdate = new Date(foundReferral.lastUpdate);

        const nextLastDate = new Date(lastUpdate);
        nextLastDate.setDate(lastUpdate.getDay() + 1);

        const currentDate = new Date();

        if (nextLastDate < currentDate) {
            const foundInitialReferral = this.findReferralById(referralsData, foundReferral.id)
            foundInitialReferral.lastUpdate = currentDate

            const isAward = await this.updateTokens(foundReferral.id, foundReferral.award)

            if (!foundReferral.isActivated) {
                const foundInitialReferral = this.findReferralById(referralsData, foundReferral.id)
                foundInitialReferral.isActivated = true

                await this.updateParent(referralsData, foundReferral.parent)

                console.log(referralsData)
                await saveData(referralsPath, referralsData);

                return {isAward, updateParents: foundReferral.parent ? [foundReferral.parent] : []}
            }

            await saveData(referralsPath, referralsData);

            return {isAward, updateParents: []}
        }

        return {isAward: false}
    }

    async updateParent(referralsData, parentId) {
        if (!parentId) {
            return
        }

        const foundParentReferral = this.findReferralById(referralsData, parentId)

        foundParentReferral.award += 500
    }

    async updateTokens(id, awards) {
        const userToken = await this.tokensService.getUserToken(id)

        if (userToken.tokens_gpt >= 30_000) return false

        await this.tokensService.updateUserToken(id, awards, "add")
        await this.tokensService.updateAdminTokenByUserId(id)

        return true
    }
}


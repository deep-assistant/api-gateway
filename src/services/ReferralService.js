import {CronJob} from "cron";


export class ReferralService {
    constructor(completionsService, referralRepository, tokensRepository) {
        this.completionsService = completionsService;
        this.referralRepository = referralRepository;
        this.tokensRepository = tokensRepository;

        this.runAwardUpdate();
    }


    async createReferral(id, parent = null) {
        const referral = await this.referralRepository.createReferral(id, parent)

        if (parent) {
            const foundParent = await this.referralRepository.findReferralById(parent);

            if (foundParent) {
                await this.referralRepository.addParent(id, parent)

                const token = await this.tokensRepository.getTokenByUserId(id)
                await this.completionsService.updateCompletionTokens(token.user_id, 5000, "add")

                const tokenParent = await this.tokensRepository.getTokenByUserId(id)
                await this.completionsService.updateCompletionTokens(tokenParent.user_id, 5000, "add")
            }
        }

        return referral;
    }

    async getReferral(id) {
        const foundReferral = await this.referralRepository.findReferralById(id);

        if (!foundReferral) {
            return this.createReferral(id);
        }

        return foundReferral;
    }

    async updateParent(parentId) {
        if (!parentId) {
            return;
        }

        const foundParentReferral = await this.referralRepository.findReferralById(parentId)
        if (!foundParentReferral) return;

        await this.referralRepository.updateReferral(parentId, {award: foundParentReferral.award + 500})
    }

    async getTokensToUpdate(token) {
        if (token.tokens_gpt < 0) return 0
        if (token.tokens_gpt < 30_000) {
            const referral = await this.getReferral(token.user_id)
            return referral?.award || 10_000
        }

        return 0
    }

    runAwardUpdate() {
        CronJob.from({
            cronTime: "0 * * * * *",
            onTick: async () => {
                const tokensData = await this.tokensRepository.getAllTokens();

                for (const token of tokensData.tokens) {
                    const award = await this.getTokensToUpdate(token)
                    await this.completionsService.updateCompletionTokens(token.user_id, award, 'add')

                    const foundReferral = await this.referralRepository.findReferralById(token.user_id)


                    if (!foundReferral?.isActivated) {
                        if (foundReferral?.parent) {
                            await this.updateParent(foundReferral.parent)

                            await this.referralRepository.updateReferral(foundReferral.id, {isActivated: true})
                            await this.completionsService.updateCompletionTokens(foundReferral.id, 5000, 'add')

                            await this.completionsService.updateCompletionTokens(foundReferral.parent, 5000, 'add')
                        }
                    }
                }
            },
            start: true,
            timeZone: "Europe/Moscow",
        });
    }
}

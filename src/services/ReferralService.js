import { CronJob } from "cron";

export class ReferralService {
  constructor(completionsService, referralRepository, tokensRepository) {
    this.completionsService = completionsService;
    this.referralRepository = referralRepository;
    this.tokensRepository = tokensRepository;

    this.runAwardUpdate();
  }

  async createReferral(id, parent = null) {
    console.log(`[ создание реферала для ${id}, родитель: ${parent} ]`);
    const referral = await this.referralRepository.createReferral(id, parent);

    if (parent) {
      const foundParent = await this.referralRepository.findReferralById(parent);
      if (foundParent) {
        console.log(`[ добавлен родитель для ${id} ]`);
        await this.referralRepository.addParent(id, parent);
        await this.completionsService.updateCompletionTokens(foundParent.user_id, 5000, "add");
      }
    }

    return referral;
  }

  async getReferral(id) {
    const foundReferral = await this.referralRepository.findReferralById(id);
    if (!foundReferral) {
      console.log(`[ реферал не найден, создается новый для ${id} ]`);
      return this.createReferral(id);
    }

    return foundReferral;
  }

  async updateParent(parentId) {
    if (!parentId) return;

    const foundParentReferral = await this.referralRepository.findReferralById(parentId);
    if (foundParentReferral) {
      console.log(`[ обновление награды для родителя ${parentId} ]`);
      await this.referralRepository.updateReferral(parentId, { award: foundParentReferral.award + 500 });
    }
  }

  async getTokensToUpdate(token) {
    if (token.tokens_gpt < 30_000) {
      const referral = await this.getReferral(token.user_id);
      return referral?.award || 10_000;
    }

    return 0;
  }

  runAwardUpdate() {
    CronJob.from({
      cronTime: "0 0 0 * * *",
      onTick: async () => {
        console.log(`[ выполнение CronJob для обновления наград ]`);
        const tokensData = await this.tokensRepository.getAllTokens();

        for (const token of tokensData.tokens) {
          const award = await this.getTokensToUpdate(token);
          await this.completionsService.updateCompletionTokens(token.user_id, award, "add");

          const foundReferral = await this.referralRepository.findOrCreateReferralById(token.user_id);
          if (!foundReferral?.isActivated && foundReferral?.parent) {
            console.log(`[ активация реферала ${foundReferral.id} ]`);
            await this.updateParent(foundReferral.parent);
            await this.referralRepository.updateReferral(foundReferral.id, { isActivated: true });
            await this.completionsService.updateCompletionTokens(foundReferral.id, 5000, "add");
            await this.completionsService.updateCompletionTokens(foundReferral.parent, 5000, "add");
          }
        }
      },
      start: true,
      timeZone: "Europe/Moscow",
    });
  }
}

import { HttpException } from "../rest/HttpException.js";

export class ReferralRepository {
  constructor(referralsDB) {
    this.referralsDB = referralsDB;
  }

  async getReferrals() {
    return this.referralsDB.data;
  }

  async createReferral(id, parent) {
    const foundReferral = await this.findReferralById(id);

    if (foundReferral) {
      throw new HttpException(400, "Реферал уже существует!");
    }

    const referral = {
      id,
      parent,
      children: [],
      createDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      isActivated: false,
      award: 10000,
    };

    this.referralsDB.update(({ referrals }) => referrals.push(referral));

    return referral;
  }

  addParent(id, parentId) {
    this.referralsDB.update(({ referrals }) => {
      const foundReferral = referrals.find((referral) => referral.id === parentId);
      if (!foundReferral) return;

      foundReferral.children.push(id);
    });
  }

  async findReferralById(userId) {
    const referralsData = await this.getReferrals();
    return referralsData.referrals.find((referral) => referral.id === userId);
  }

  async findOrCreateReferralById(userId) {
    const referralsData = await this.getReferrals();

    const referral = referralsData.referrals.find((referral) => referral.id === userId);
    if (!referral) return this.createReferral(userId);
    return referral;
  }

  updateReferral(id, newReferral) {
    this.referralsDB.update(({ referrals }) => {
      const foundReferral = referrals.find((referral) => referral.id === id);
      if (!foundReferral) return;

      Object.assign(foundReferral, newReferral);
    });
  }
}

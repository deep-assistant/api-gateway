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
    if (foundReferral) throw new HttpException(400, "Реферал уже существует!");

    const referral = {
      id,
      parent: parent === "None" ? null : parent, // Фикс: нормализация
      children: [],
      createDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      isActivated: false,
      award: parent ? 10000 : 0, // Фикс: логика награды
    };

    this.referralsDB.update(({ referrals }) => referrals.push(referral));
    return referral;
  }

  addParent(id, parentId) {
    this.referralsDB.update(({ referrals }) => {
      const foundParent = referrals.find((r) => r.id === parentId);
      if (!foundParent || foundParent.children.includes(id)) return; // Фикс: проверка дублей
      foundParent.children.push(id);
      foundParent.lastUpdate = new Date().toISOString(); // Обновление времени
    });
  }

  async findReferralById(userId) {
    const referralsData = await this.getReferrals();
    return referralsData.referrals.find((r) => r.id === userId);
  }

  async findOrCreateReferralById(userId) {
    const referralsData = await this.getReferrals();
    const referral = referralsData.referrals.find((r) => r.id === userId);
    return referral || this.createReferral(userId);
  }

  updateReferral(id, newData) {
    this.referralsDB.update(({ referrals }) => {
      const index = referrals.findIndex((r) => r.id === id);
      if (index === -1) return;
      Object.assign(referrals[index], { ...newData, lastUpdate: new Date().toISOString() });
    });
  }
}
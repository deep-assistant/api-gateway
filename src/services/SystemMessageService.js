import { HttpException } from "../rest/HttpException.js";

export class SystemMessageService {
  createSystemMessageEntity(userId, systemMessage) {
    console.log(`[ создание сущности системного сообщения для пользователя ${userId} ]`);
    return {
      userId,
      systemMessage,
    };
  }

  async getSystemMessage(id) {
    console.log(`[ получение системного сообщения для ${id} ]`);
    const systemMessage = await this.getSystemMessageById(id);
    if (!systemMessage) {
      console.log(`[ системное сообщение для ${id} не найдено ]`);
      throw new HttpException(404, "Системное сообщение не найдено");
    }

    return systemMessage;
  }

  async getSystemMessageById(userId) {
    console.log(`[ поиск системного сообщения для ${userId} ]`);
    const { systemMessages } = await loadData(systemMessagesFilePath);
    return systemMessages.find((systemMessage) => systemMessage.userId === userId);
  }

  async createSystemMessage(userId, message) {
    console.log(`[ создание или обновление системного сообщения для ${userId} ]`);
    const { systemMessages } = await loadData(systemMessagesFilePath);

    const foundSystemMessage = systemMessages.find((systemMessage) => systemMessage.userId === userId);
    if (!foundSystemMessage) {
      console.log(`[ сообщение для ${userId} не найдено, создается новое ]`);
      await saveData(systemMessagesFilePath, {
        systemMessages: [...systemMessages, this.createSystemMessageEntity(userId, message)],
      });
      return await this.getSystemMessageById(userId);
    }

    console.log(`[ сообщение для ${userId} найдено, обновление ]`);
    await saveData(systemMessagesFilePath, {
      systemMessages: systemMessages.map((systemMessage) =>
        systemMessage.userId === userId
          ? {
              ...systemMessage,
              systemMessage: message,
            }
          : systemMessage,
      ),
    });

    return await this.getSystemMessageById(userId);
  }
}

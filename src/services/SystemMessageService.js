import { HttpException } from "../rest/HttpException.js";

export class SystemMessageService {
  createSystemMessageEntity(userId, systemMessage) {
    return {
      userId,
      systemMessage,
    };
  }

  async getSystemMessage(id) {
    const systemMessage = await this.getSystemMessageById(id);
    if (!systemMessage) {
      throw new HttpException(404, "Системное сообщение не найдено");
    }

    console.log(systemMessage);

    return systemMessage;
  }

  async getSystemMessageById(userId) {
    const { systemMessages } = await loadData(systemMessagesFilePath);
    console.log(systemMessages);

    return systemMessages.find((systemMessage) => systemMessage.userId === userId);
  }

  async createSystemMessage(userId, message) {
    const { systemMessages } = await loadData(systemMessagesFilePath);

    const foundSystemMessage = systemMessages.find((systemMessage) => systemMessage.userId === userId);
    if (!foundSystemMessage) {
      await saveData(systemMessagesFilePath, {
        systemMessages: [...systemMessages, this.createSystemMessageEntity(userId, message)],
      });
      return await this.getSystemMessageById(userId);
    }

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

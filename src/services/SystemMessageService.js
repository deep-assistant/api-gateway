import {fileURLToPath} from "url";
import path from "path";
import {loadData, saveData} from "../utils/dbManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemMessagesFilePath = path.join(__dirname, "../db", "systemMessages.json");

export class SystemMessageService {
    createSystemMessageEntity(userId, systemMessage) {
        return {
            userId,
            systemMessage
        }
    }

    async getSystemMessageById(userId) {
        const {systemMessages} = await loadData(systemMessagesFilePath)

        return systemMessages.find((systemMessage) => systemMessage.userId === userId)
    }

    async createSystemMessage(userId, message) {
        const {systemMessages} = await loadData(systemMessagesFilePath)

        const foundSystemMessage = systemMessages.find((systemMessage) => systemMessage.userId === userId)
        if (!foundSystemMessage) {
            await saveData(systemMessagesFilePath, {systemMessages: [...systemMessages, this.createSystemMessageEntity(userId, message)]});
            return
        }

        await saveData(systemMessagesFilePath, {
                systemMessages: systemMessages.map(
                    (systemMessage) => systemMessage.userId === userId ? {
                        ...systemMessage,
                        systemMessage: message
                    } : systemMessage)
            }
        );

        return await this.getSystemMessageById(userId)
    }
}

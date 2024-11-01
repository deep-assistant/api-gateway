export class DialogsService {
    constructor(dialogsRepository) {
        this.dialogsRepository = dialogsRepository
    }

    clearDialog(userId) {
        return this.dialogsRepository.clearDialog(userId)
    }

    addMessageToDialog(userId, content) {
        return this.dialogsRepository.addMessageToDialog(userId, content)
    }

    findDialogById(userId) {
        return this.dialogsRepository.findDialogById(userId)
    }

    async getDialogWithSystem(userId, systemMessage) {
        const dialog = await this.findDialogById(userId)

        return [{role: "system", content: systemMessage}, ...dialog.messages]
    }
}

export class DialogsRepository {
  constructor(dialogsDB) {
    this.dialogsDB = dialogsDB;
  }

  getAllDialogs() {
    return this.dialogsDB.data;
  }

  addMessageToDialog(userId, message) {
    const newMessage = { role: "user", content: message };

    this.dialogsDB.update(({ dialogs }) => {
      const foundDialog = dialogs.find((dialog) => dialog.name === userId);

      if (!foundDialog) {
        dialogs.push({ name: userId, messages: [newMessage] });
        return;
      }

      foundDialog.messages.push(newMessage);
    });
  }

  async clearDialog(userId) {
    const dialog = this.findDialogById(userId);
    if (dialog && !dialog.messages.length) {
      return false;
    }

    await this.dialogsDB.update(({ dialogs }) => {
      const foundDialog = dialogs.find((dialog) => dialog.name === userId);
      if (!foundDialog) return;

      foundDialog.messages = [];
    });

    return true;
  }

  findDialogById(name) {
    return this.getAllDialogs().dialogs.find((dialog) => dialog.name === name);
  }
}

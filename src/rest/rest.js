import { HttpResponse } from "./HttpResponse.js";
import { SSEResponse } from "./SSEResponse.js";

export function rest(fn) {
  let logs;
  return async (req, res) => {
    try {
      logs += `\nпопытка присвоить response \n`
      const response = await fn({ req, res });
      logs += `успешно: \n`
      if (response instanceof HttpResponse) {
        logs += `\n использование HttpResponse `
        res.status(response.status).send(response.body);
        logs += `\nстатус \n`
        logs += response.status
      }
      if (response instanceof SSEResponse) {
        logs += `\ использование SSEResponse `
        response.write(res);
      }
    } catch (error) {
      console.log(error)
      logs += `\n ошибка: \n`
      logs += error.message
      if (error.status) {
        res.status(error.status).send({ message: logs });
        return;
      }

      res.status(500).send({ message: "Что-то пошло не так:", logs: logs });
    }
  };
}

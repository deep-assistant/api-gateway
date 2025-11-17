import { HttpResponse } from "./HttpResponse.js";
import { SSEResponse } from "./SSEResponse.js";
import { tokensService, transferService } from "../services/index.js";

export function rest(fn) {
  return async (req, res) => {
    try {
      const response = await fn({ 
        req, 
        res,
        tokensService,
        transferService
      });

      if (response instanceof HttpResponse) {
        res.status(response.status).send(response.body);
        return;
      }
      if (response instanceof SSEResponse) {
        response.write(res);
      }
    } catch (error) {
      console.log(error);

      if (error.status) {
        res.status(error.status).send({ message: error.message });
        return;
      }

      res.status(500).send({ message: "Что-то пошло не так" });
    }
  };
}

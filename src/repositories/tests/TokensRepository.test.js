import { expect, test, vi } from "vitest";
import { JSONFilePreset } from "lowdb/node";
import { TokensRepository } from "../TokensRepository.js";

async function createDBs() {
  const userTokensDB = await JSONFilePreset("user_tokens.json", { tokens: [] });
  const tokensDB = await JSONFilePreset("tokens.json", { tokens: [] });

  const tokensRepository = new TokensRepository(userTokensDB, tokensDB);

  return { tokensRepository, userTokensDB, tokensDB };
}

const mockedRandomBytes = Buffer.from("mocked_random_bytes");
vi.mock("crypto", () => ({
  default: { randomBytes: vi.fn(() => mockedRandomBytes) },
}));

test("Должен выдавать пустой массив токенов", async () => {
  const { tokensRepository } = await createDBs();

  expect(tokensRepository.getAllTokens()).toStrictEqual({ tokens: [] });
});

test("Должен выдавать пустой массив токенов юзера", async () => {
  const { tokensRepository } = await createDBs();

  expect(tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [] });
});

test("Должен сгенерировать новый токен пользователя", async () => {
  const { tokensRepository } = await createDBs();

  const user = { id: "1", tokens_gpt: 10000 };
  expect(await tokensRepository.generateUserToken("1")).toStrictEqual(user);
  expect(await tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [user] });
});

test("Должен сгенерировать новый токен пользователя", async () => {
  const { tokensRepository } = await createDBs();

  const user = { id: "1", tokens_gpt: 10000 };
  expect(await tokensRepository.generateUserToken("1")).toStrictEqual(user);
  expect(await tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [user] });
});

test("Должен сгенерировать новый токен", async () => {
  const { tokensRepository } = await createDBs();

  const token = { id: mockedRandomBytes.toString("hex"), user_id: "1", tokens_gpt: 10000 };
  expect(await tokensRepository.generateToken("1", 10000)).toStrictEqual(token);
  expect(await tokensRepository.getAllTokens()).toStrictEqual({ tokens: [token] });
});

test("Если пользователя нет, то должен создать нового пользователя и токен", async () => {
  const { tokensRepository } = await createDBs();

  expect(tokensRepository.getAllTokens()).toStrictEqual({ tokens: [] });

  const token = { id: mockedRandomBytes.toString("hex"), user_id: "1", tokens_gpt: 10000 };
  const user = { id: "1", tokens_gpt: 10000 };
  expect(await tokensRepository.getUserTokenById("1")).toStrictEqual(user);

  expect(await tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [user] });
  expect(await tokensRepository.getAllTokens()).toStrictEqual({ tokens: [token] });
});

test("Должен обновить пользователя", async () => {
  const { tokensRepository } = await createDBs();

  expect(tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [] });

  const user = { id: "1", tokens_gpt: 10000 };
  expect(await tokensRepository.generateUserToken("1")).toStrictEqual(user);
  expect(await tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [user] });

  expect(await tokensRepository.updateUserToken("1", { tokens_gpt: 20000 }));

  const updatedUser = { id: "1", tokens_gpt: 20000 };
  expect(await tokensRepository.getUserTokenById("1")).toStrictEqual(updatedUser);
  expect(await tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [updatedUser] });
});

test("Должен обновить токен", async () => {
  const { tokensRepository } = await createDBs();

  const token = { id: mockedRandomBytes.toString("hex"), user_id: "1", tokens_gpt: 10000 };
  expect(await tokensRepository.generateToken("1", 10000)).toStrictEqual(token);
  expect(await tokensRepository.getAllTokens()).toStrictEqual({ tokens: [token] });

  expect(await tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [user] });
  expect(await tokensRepository.getAllTokens()).toStrictEqual({ tokens: [token] });

  expect(await tokensRepository.updateUserToken("1", { tokens_gpt: 20000 }));

  const updatedUser = { id: "1", tokens_gpt: 20000 };
  expect(await tokensRepository.getUserTokenById("1")).toStrictEqual(updatedUser);
  expect(await tokensRepository.getAllUserTokens()).toStrictEqual({ tokens: [updatedUser] });
});

import fs from 'fs/promises';
import path, { dirname } from 'path';
import { DeepClient, parseJwt } from '@deep-foundation/deeplinks/imports/client.js';
import { generateApolloClient } from '@deep-foundation/hasura/client.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GQL_URN = process.env.GQL_URN;
const GQL_SSL = process.env.GQL_SSL === 'true';

const tokensFilePath = path.join(__dirname, '..', 'db', 'tokens.json');


const makeDeepClient = token => {
  if (!token) throw new Error("No token provided")
  const decoded = parseJwt(token)
  const linkId = decoded.userId
  const apolloClient = generateApolloClient({
    path: GQL_URN,
    ssl: !!+GQL_SSL,
    token
  })
  const deepClient = new DeepClient({ apolloClient, linkId, token })
  //console.log(deepClient);
  return deepClient
}

// Сохранение данных о токенах в хранилище
async function saveTokensData(tokensData) {
  try {
    const data = JSON.stringify(tokensData, null, 2);
    await fs.writeFile(tokensFilePath, data, { encoding: 'utf8' });
  } catch (error) {
    console.error('Ошибка при сохранении данных о токенах:', error);
  }
}

// Загрузка данных из хранилища
async function loadData(filePath) {
  try {
    const data = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    return { tokens: [] };
  }
}

// Проверка, является ли предоставленный токен валидным администраторским токеном
async function isValidAdminToken(providedToken) {
  const tokensData = await loadData(tokensFilePath);
  return tokensData.tokens.some(tokenEntry => tokenEntry.token === providedToken);
}


async function addedConversationLinks(deep, dialogName) {
  const conversationTypeLink = await deep.id('@deep-foundation/chatgpt-azure', 'Conversation');
  const conversation = (await deep.insert({ type_id: conversationTypeLink }, { name: 'INSERT_HANDLER_SYNC_Conversation_FILE' })).data[0];
  await deep.insert({ link_id: conversation.id, value: dialogName }, { table: 'strings' });
  return conversation;
}

async function addedMessageLinks(deep, messageValue, author) {
  const messageTypeLinkId = await deep.id('@deep-foundation/messaging', 'Message');
  const authorTypeLinkId = await deep.id('@deep-foundation/messaging', 'Author');
  const syncTextFileTypeId = await deep.id('@deep-foundation/core', 'SyncTextFile');
  const messagesLink = (await deep.insert({ type_id: messageTypeLinkId }, { name: 'INSERT_HANDLER_SYNC_messages_FILE' })).data[0];
  await deep.insert({ link_id: messagesLink.id, value: messageValue }, { table: 'strings' });
  const syncTextFileLink = (await deep.insert({ type_id: syncTextFileTypeId }, { name: 'INSERT_HANDLER_SYNC_TEXT_FILE' })).data[0];
  await deep.insert({ link_id: syncTextFileLink.id, value: author }, { table: 'strings' });
  await deep.insert({ from_id: syncTextFileLink.id, type_id: authorTypeLinkId, to_id: messagesLink.id });
  //console.log(messagesLink)
  return messagesLink;
}

async function addedReplyLinks(deep,  replyMessageLink, messageLink){
  const replyTypeLinkId = await deep.id('@deep-foundation/messaging', 'Reply');
  const reply = (await deep.insert({
    from_id: replyMessageLink,
    type_id: replyTypeLinkId,
    to_id: messageLink
  }, { name: 'INSERT_HANDLER_SYNC_replys_FILE' })).data[0];
  return reply;
}

async function addedContainLinks(deep, spaceIdArgument, conversation){
  const spaceId = spaceIdArgument || (await deep.id('deep', 'admin'));
  const containTypeId = await deep.id('@deep-foundation/core', 'Contain');
  const containSyncTextFile = (await deep.insert({
  from_id: spaceId,
  type_id: containTypeId,
  to_id: conversation.id,
  }, { name: 'INSERT_SYNC_TEXT_FILE_CONTAIN' })).data[0];
  return containSyncTextFile;
}

async function allDialog(deep, conversation){
  const messageTypeLinkId = await deep.id('@deep-foundation/messaging', 'Message');
  const authorTypeLinkId = await deep.id('@deep-foundation/messaging', 'Author');
  const tokensTypeLinkId = await deep.id("@deep-foundation/tokens", "Tokens")
  const messagingTreeId = await deep.id('@deep-foundation/messaging', 'messagingTree');
  const  historyMessage = await deep.select({
    tree_id: { _eq: messagingTreeId },
    parent: { id: { _eq: conversation } },
    link: { type_id: { _in: messageTypeLinkId } },
  }, {
    table: 'tree',
    variables: { order_by: { depth: "asc" } },
    returning: `
    id
    depth
    root_id
    parent_id
    link_id
    parent {
      id
      from_id
      type_id
      to_id
      value
      author: out (where: { type_id: { _eq: ${authorTypeLinkId}} }) { 
        id
        from_id
        type_id
        to_id
      }
      tokens: out (where: { type_id: { _eq: ${tokensTypeLinkId}} }) { 
      id
      from_id
      type_id
      to_id
      value
      }
    }`
  })
  //console.log(historyMessage)
  return historyMessage;
}

async function requestBody(deep, conversation) {
  const authorTypeLinkId = await deep.id('@deep-foundation/messaging', 'Author');
  
  let historyMessageLinks = await allDialog(deep, conversation);
  if (!Array.isArray(historyMessageLinks.data)) {
    console.error("historyMessageLinks received:", historyMessageLinks);
    throw new Error("historyMessageLinks is not an array");
  }

  historyMessageLinks = historyMessageLinks.data;

  const messages = await Promise.all(historyMessageLinks.map(async link => {
    const messageLink = await deep.select({ id: link.link_id });
    if (!messageLink.data || messageLink.data.length === 0) {
      console.error("No message data found for link_id:", link.link_id);
      return null;
    }historyMessageLinks

    const messageLinkValue = messageLink.data[0].value;
    const authorLink = await deep.select({ type_id: authorTypeLinkId, to_id: messageLink.data[0].id });
    if (!authorLink.data || authorLink.data.length === 0) {
      console.error("No author data found for link_id:", link.link_id);
      return null;
    }

    let authorLinkValue = await deep.select({ id: authorLink.data[0].from_id });
    if (!authorLinkValue.data || authorLinkValue.data.length === 0) {
      console.error("No author value found for author link_id:", authorLink.data[0].from_id);
      return null;
    }

    authorLinkValue = authorLinkValue.data[0].value;
    return {
      role: authorLinkValue.value,
      content: messageLinkValue.value
    };
  }));
  console.log('booooodyyyy', { messages: messages.filter(msg => msg !== null) })
  let tokenValueString = { messages: messages.filter(msg => msg !== null) }
  tokenValueString = tokenValueString
  console.log('striiiiiiing', messages)
  return messages;
}

async function deleteFirstMessage(deep, dialogName, spaceId, messageNum) {
  const conversationTypeLink = await deep.id('@deep-foundation/chatgpt-azure', 'Conversation')
  const messageTypeLinkId = await deep.id('@deep-foundation/messaging', 'Message');
  const authorTypeLinkId = await deep.id('@deep-foundation/messaging', 'Author');
  const tokensTypeLinkId = await deep.id('@deep-foundation/tokens', 'Tokens')
  const replyTypeLinkId = await deep.id('@deep-foundation/messaging', 'Reply');

  let conversationLink = await deep.select({
    type_id: conversationTypeLink, 
    value: dialogName
  });
  const allHistory = await allDialog(deep, conversationLink.data[0].id);
  const updateReplyLink = await addedReplyLinks(deep, allHistory.data[2].link_id, allHistory.data[0].link_id);
  let authorLink = await deep.select({
    type_id: authorTypeLinkId,
    to_id: allHistory.data[messageNum].link_id
  });
  const authorValueLink = authorLink.data[0].from_id;
  let replyLink1 = await deep.select({
    from_id: allHistory.data[messageNum].link_id,
    type_id: replyTypeLinkId,
    to_id: allHistory.data[messageNum-1].link_id
  });
  let replyLink2 = await deep.select({
    from_id: allHistory.data[messageNum+1].link_id,
    type_id: replyTypeLinkId,
    to_id: allHistory.data[messageNum].link_id
  });
  authorLink = authorLink.data[0].id;
  replyLink1 = replyLink1.data[0].id;
  replyLink2 = replyLink2.data[0].id;
  await deep.delete({
    _or: [
      {
        id: allHistory.data[messageNum].link_id,   
      },
      {
        id: authorLink
      },
      {
        id: authorValueLink
      },
      {
        id: replyLink1
      },
      {
        id: replyLink2
      },
    ]
  });
}

async function syncContextData(dialogName, userMessage, senderRole, systemMessage, spaceIdArgument, deep) {
  const conversationTypeLink = await deep.id('@deep-foundation/chatgpt-azure', 'Conversation');
  
  let conversationLink = await deep.select({
    type_id: conversationTypeLink, 
    value: dialogName
  });

  if (conversationLink.data[0] == undefined) {
    const contextMessageAuthor = 'system';
    conversationLink = await addedConversationLinks(deep, dialogName);
    await addedContainLinks(deep, spaceIdArgument, conversationLink);

    const contextMessageLink = await addedMessageLinks(deep, systemMessage, contextMessageAuthor);
    await addedReplyLinks(deep, contextMessageLink.id, conversationLink.id);
    
    const userMessageLink = await addedMessageLinks(deep, userMessage, senderRole);
    await addedReplyLinks(deep, userMessageLink.id, contextMessageLink.id);
    
  } else {
    const allHistory = await allDialog(deep, conversationLink.data[0].id);
    const lastMessageID = allHistory.data.at(-1).link_id;

    const userMessageLink = await addedMessageLinks(deep, userMessage, senderRole);
    await addedReplyLinks(deep, userMessageLink.id, lastMessageID);
  }
  conversationLink = await deep.select({
    type_id: conversationTypeLink, 
    value: dialogName
  });
  return await requestBody(deep, conversationLink.data[0].id)
}

async function generateToken(deep, userName, spaceIdArgument, userTokenLimit, chatGptTokenLimit) {
  const tokensTypeLinkId = await deep.id("@deep-foundation/tokens", "Tokens");
  const containTypeId = await deep.id('@deep-foundation/core', 'Contain');
  const tokenValue = `{"currentUserToken": ${userTokenLimit}, "currentChatToken": ${chatGptTokenLimit}}`;
  const tokenLink = (await deep.insert({ type_id: tokensTypeLinkId }, { name: 'INSERT_HANDLER_SYNC_TEXT_FILE' })).data[0];
  await deep.insert({ link_id: tokenLink.id, value: tokenValue }, { table: 'strings' });

  const spaceId = spaceIdArgument || (await deep.id('deep', 'admin'));
  await deep.insert({
    from_id: spaceId,
    type_id: containTypeId,
    string: { data: { value: userName } },
    to_id: tokenLink.id
  });
  return tokenLink.id;
}

async function updateTokensData(deep, userName, newUserToken, newChatGptToken) {
  const tokensTypeLinkId = await deep.id("@deep-foundation/tokens", "Tokens");
  const containTypeId = await deep.id('@deep-foundation/core', 'Contain');
  try {
    const userNameLink = await deep.select({ 
      type_id: containTypeId,
      string: { value: { _eq: userName } }
    });
    const tokenLink = await deep.select({
      id: userNameLink.data[0].to_id,
      type_id: tokensTypeLinkId,
    });
    let tokenValue = JSON.parse(tokenLink.data[0].value.value);
    tokenValue.currentUserToken = newUserToken;
    tokenValue.currentChatToken = newChatGptToken;
    let tokenValueString = JSON.stringify(tokenValue);
    await deep.update(
      {
        link_id: userNameLink.data[0].to_id
      },
      {
        value: tokenValueString
      },
      {
        table: 'strings'
      });
  } catch (error) {
    console.error('Ошибка при сохранении данных о токенах:', error);
  }
}

async function selectTokensData(deep, userName) {
  const tokensTypeLinkId = await deep.id("@deep-foundation/tokens", "Tokens");
  const containTypeId = await deep.id('@deep-foundation/core', 'Contain');
  try {
    const userNameLink = await deep.select({ 
      type_id: containTypeId,
      string: { value: { _eq: userName } }
    });
    const tokenLink = await deep.select({
      id: userNameLink.data[0].to_id,
      type_id: tokensTypeLinkId,
    });
    const tokenValue = JSON.parse(tokenLink.data[0].value.value);
    
    if(userNameLink == undefined){
      return undefined
    }
    return [tokenValue.currentUserToken, tokenValue.currentChatToken];
  } catch (error) {
    console.error('Ошибка при чтении данных о токенах:', error);
  }
}

export {
  generateToken,
  saveTokensData,
  loadData,
  syncContextData,
  makeDeepClient,
  requestBody,
  updateTokensData,
  selectTokensData,
  deleteFirstMessage,
  addedConversationLinks,
  addedMessageLinks,
  addedReplyLinks,
  addedContainLinks,
  allDialog,
  isValidAdminToken,
};



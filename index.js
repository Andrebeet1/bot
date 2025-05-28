import TelegramBot from 'node-telegram-bot-api';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';

// === CONFIGURATION ===

const token = process.env.BOT_TOKEN;// ⚠️ Ne partage jamais ton token en public !
const bot = new TelegramBot(token, { polling: true });

// === BASE DE DONNÉES ===
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { users: [], taches: [], paiements: [] });

await db.read();
db.data ||= { users: [], taches: [], paiements: [] };
await db.write();




// === INITIALISATION UTILISATEUR ===
async function initUser(chatId) {
  await db.read();
  const user = db.data.users.find(u => u.chatId === chatId);
  if (!user) {
    db.data.users.push({ chatId, solde: 0, id: nanoid(), historique: [], parrain: null });
    await db.write();
  }
}

// === COMMANDES ===

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const parrainCode = match[1];
  await initUser(chatId);

  const user = db.data.users.find(u => u.chatId === chatId);
  if (parrainCode && !user.parrain) {
    const parrain = db.data.users.find(u => u.id === parrainCode);
    if (parrain) {
      user.parrain = parrainCode;
      parrain.solde += 50;
      await db.write();
    }
  }

  bot.sendMessage(chatId, `👋 Bienvenue sur *TikEarnBot* !

💰 Gagne de l'argent en accomplissant des tâches TikTok.

Tape /taches pour commencer !`, { parse_mode: "Markdown" });
});

bot.onText(/\/solde/, async (msg) => {
  const chatId = msg.chat.id;
  await initUser(chatId);
  const user = db.data.users.find(u => u.chatId === chatId);
  bot.sendMessage(chatId, `💼 Ton solde actuel : *${user.solde} FC*`, { parse_mode: "Markdown" });
});

bot.onText(/\/taches/, async (msg) => {
  const chatId = msg.chat.id;
  await initUser(chatId);
  const user = db.data.users.find(u => u.chatId === chatId);

  const tache = {
    id: nanoid(),
    lien: "https://www.tiktok.com/@exemple/video/123456",
    recompense: 50
  };

  user.historique.push({ type: 'tache', id: tache.id, gain: tache.recompense });
  user.solde += tache.recompense;
  await db.write();

  bot.sendMessage(chatId, `🕹️ Nouvelle tâche :
Clique ici : ${tache.lien}

✅ Tu gagnes *${tache.recompense} FC* pour l'avoir faite.`, { parse_mode: "Markdown" });
});

bot.onText(/\/retirer/, async (msg) => {
  const chatId = msg.chat.id;
  await initUser(chatId);
  const user = db.data.users.find(u => u.chatId === chatId);

  if (user.solde < 100) {
    return bot.sendMessage(chatId, `❌ Montant minimum de retrait : 100 FC`);
  }

  const retrait = {
    id: nanoid(),
    chatId,
    montant: user.solde,
    date: new Date().toISOString()
  };

  db.data.paiements.push(retrait);
  user.solde = 0;
  await db.write();

  bot.sendMessage(chatId, `✅ Retrait de ${retrait.montant} FC enregistré. Tu recevras ton argent via Airtel Money bientôt.`);
});

bot.onText(/\/payer/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `💸 Pour acheter des likes ou abonnés TikTok, contacte @ton_username avec ta demande et preuve de paiement Airtel Money.`);
});

bot.onText(/\/moncode/, async (msg) => {
  const chatId = msg.chat.id;
  await initUser(chatId);
  const user = db.data.users.find(u => u.chatId === chatId);
  bot.sendMessage(chatId, `🔗 Ton code de parrainage : *${user.id}*
Partage ce lien :
https://t.me/TikEarnBot?start=${user.id}`, { parse_mode: "Markdown" });
});

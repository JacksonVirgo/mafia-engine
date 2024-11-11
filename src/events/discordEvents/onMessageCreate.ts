import { ChannelType, Message, Sticker, Webhook } from "discord.js";
import { client } from "../../controllers/botController";
import {
  getAnonymousGroup,
  getAnonymousProfiles,
} from "../../models/anonymity";
import config from "../../config";
import axios from "axios";

export default async function OnMessageCreate(msg: Message<boolean>) {
  checkPotatoes(msg);
  if (!msg.guild) return;
  if (!msg.channel.isThread()) return;

  const threadChannel = msg.channel;
  const parentChannelID = threadChannel.parentId;
  if (!parentChannelID) return;
  const group = await getAnonymousGroup(parentChannelID);
  if (!group) return;

  const profiles = await getAnonymousProfiles(group.id);
  if (!profiles || profiles.length === 0) return;

  const filtered = profiles.filter((v) => v.discordId == msg.author.id);
  const profile = filtered[0];
  if (!profile) return;

  const parent = msg.channel.parent;
  if (!parent) return;
  if (parent.type != ChannelType.GuildText) return;

  const clientID = client.user?.id;
  if (!clientID) return;

  const webhooks = await parent.fetchWebhooks();
  let webhook: Webhook | undefined = webhooks.find(
    (wh) => wh.owner?.id == clientID
  );
  if (!webhook) {
    const newWH = await parent.createWebhook({ name: "Anonymity" });
    webhook = newWH;
  }

  const stickers: Sticker[] = [];
  for (const stickerData of msg.stickers) {
    const sticker = stickerData[1];
    const fetchedSticker = await sticker.fetch();
    if (fetchedSticker.guildId == msg.guildId) stickers.push(fetchedSticker);
    else console.log(fetchedSticker);
  }

  const stickerURLs = stickers.map((sticker) => {
    const url = `https://media.discordapp.net/stickers/${sticker.id}.gif?size=2048`;
    return url;
  });

  const msgContent = msg.content + "\n" + stickerURLs.join("\n");

  if (webhook) {
    webhook
      .send({
        content: msgContent,
        avatarURL: profile.avatarURI ?? undefined,
        username: profile.name ?? undefined,
        allowedMentions: {
          roles: [],
        },
      })
      .catch(() => {});
  }
}

async function checkPotatoes(msg: Message<boolean>) {
  const isDan = msg.author.id == "335149838616231937";
  const isMel = msg.author.id == "416757703516356628";

  if (!isDan && !isMel) return;
  if (msg.content.trim() != "I like mashed potatoes.") return;

  const client_id = config.UNSPLASH_CLIENT_ID;
  if (!client_id) return;
  const query = `https://api.unsplash.com/photos/random?client_id=${client_id}&query=mashedpotatoes`;

  try {
    const response = await axios.get(query);
    if (response.status == 200) {
      const image = response.data.urls.raw;
      return await msg.channel.send({ content: `${image}` });
    }

    return;
  } catch (err) {
    return;
  }
}

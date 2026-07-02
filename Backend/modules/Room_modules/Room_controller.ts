import { generateRandomLetters } from "../../utils/RoomGenerator.js";
import userModel from "../Auth_modules/Auth_model.js";
import { Room } from "./Room_model.js";
import { Request, Response } from "express";
import cron from "node-cron";
import { redis, subscriber } from "../../app.js";
import { encrypt, decrypt } from "../../utils/cryptoUtils.js";

// ─── Room Controllers ─────────────────────────────────────────────────────────

export const Createroom = async (req: Request, res: Response) => {
  try {
    const roomcode = await generateRandomLetters();
    const userId = req.user.id;

    const user = await userModel.findById(userId).select("-password -__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const room = await Room.create({ roomcode, host: user._id });
    return res.status(201).json(room);
  } catch (err) {
    console.error("[Createroom]", err);
    return res.status(500).json({ message: "Error creating room" });
  }
};

export const getroom = async (req: Request, res: Response) => {
  try {
    const { roomcode } = req.body;
    if (!roomcode) {
      return res.status(400).json({ message: "roomcode is required" });
    }

    const findroom = await Room.findOne({ roomcode });
    if (!findroom) {
      return res.status(404).json({ message: "Room not found" });
    }

    // ✅ 200 on GET, not 201
    return res.status(200).json({ message: "Room found" });
  } catch (err) {
    console.error("[getroom]", err);
    return res.status(500).json({ message: "Error finding room" });
  }
};

export const checkownerroom = async (req: Request, res: Response) => {
  try {
    const userid = req.user.id;
    if (!userid) {
      return res.status(400).json({ message: "User id not found" });
    }

    const { roomcode } = req.body;
    if (!roomcode) {
      return res.status(400).json({ message: "Roomcode required" });
    }

    const findroom = await Room.findOne({ roomcode });
    if (!findroom) {
      return res.status(404).json({ message: "Room not found" });
    }

    // ✅ toString() — ObjectId vs string safe compare
    const isOwner = findroom.host.toString() === userid.toString();

    // ✅ Dono cases handle kiye
    return res.status(200).json({ isOwner });
  } catch (err) {
    console.error("[checkownerroom]", err);
    return res.status(500).json({ message: "Error checking room owner" });
  }
};

// ─── Chat Flush Logic ─────────────────────────────────────────────────────────

const flushToDB = async (roomcode: string): Promise<void> => {
  const dataKey = `room:${roomcode}:messages`;
  const ttlKey = `room:${roomcode}:messages:ttl`;

  const messages = await redis.lrange(dataKey, 0, -1);
  if (messages.length === 0) return;

  const parsedMessages = messages.map((m: string) => JSON.parse(m));

  await Room.findOneAndUpdate(
    { roomcode },
    { $push: { chat: { $each: parsedMessages } } },
  );

  await redis.del(dataKey);
  await redis.del(ttlKey);

  console.log(
    `[flushToDB] Flushed ${parsedMessages.length} msgs for room ${roomcode}`,
  );
};
 
// ─── Subscriber (TTL expiry listener) ────────────────────────────────────────

const startSubscriber = async (): Promise<void> => {
  await redis.config("SET", "notify-keyspace-events", "Ex");

  subscriber.on("message", (_channel: string, expiredKey: string) => {
    if (!expiredKey?.endsWith(":messages:ttl")) return;

    const roomcode = expiredKey.split(":")[1];
    if (!roomcode) return;

    console.log(`[subscriber] TTL expired for room ${roomcode}`);
    flushToDB(roomcode).catch((err) =>
      console.error(`[subscriber] flushToDB failed for ${roomcode}:`, err),
    );
  });

  await subscriber.subscribe("__keyevent@0__:expired");
};

// ─── Cron (safety net) ───────────────────────────────────────────────────────

const startCron = (): void => {
  cron.schedule("*/30 * * * *", async () => {
    console.log("[cron] Running flush check...");

    const keys = await redis.keys("room:*:messages");

    for (const key of keys) {
      if (key.endsWith(":ttl")) continue;

      const roomcode = key.split(":")[1];
      const ttlKey = `room:${roomcode}:messages:ttl`;

      const ttlExists = await redis.exists(ttlKey);
      if (!ttlExists) {
        console.log(`[cron] Catching missed flush for room ${roomcode}`);
        await flushToDB(roomcode).catch((err) =>
          console.error(`[cron] flushToDB failed for ${roomcode}:`, err),
        );
      }
    }
  });
};

// ─── Init ─────────────────────────────────────────────────────────────────────

export const initChatServices = async (): Promise<void> => {
  await startSubscriber();
  startCron();
  console.log("[initChatServices] Chat services initialized");
};

// ─── Chat Controllers ─────────────────────────────────────────────────────────

export const storechat = async (req: Request, res: Response) => {
  try {
    const { chat, name, userId, role, time } = req.body;
    const roomcode: any = req.params.roomcode;

    if (!chat || !name || !roomcode) {
      return res.status(400).json({ message: "chat, name, roomcode required" });
    }

    const dataKey = `room:${roomcode}:messages`;
    const ttlKey = `room:${roomcode}:messages:ttl`;
    const encryptedchat = encrypt(chat);

    const message = {
      encryptedchat,
      name,
      userId,
      role,
      time:
        time ??
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
    };

    await redis.rpush(dataKey, JSON.stringify(message));
    await redis.set(ttlKey, "1", "EX", 60 * 60 * 2);

    const length = await redis.llen(dataKey);
    if (length > 50) {
      await flushToDB(roomcode);
    }

    return res.status(200).json({ message: "Chat stored" });
  } catch (err) {
    console.error("[storechat]", err);
    return res.status(500).json({ message: "Error storing chat" });
  }
};

export const getchat = async (req: Request, res: Response) => {
  try {
    const roomcode = req.params.roomcode;
    if (!roomcode) {
      return res.status(400).json({ message: "Roomcode required" });
    }

    const dataKey = `room:${roomcode}:messages`;
    const cacheExists = await redis.exists(dataKey);

    // ✅ Cache hit
    if (cacheExists) {
      const cachedMessages = await redis.lrange(dataKey, 0, -1);
      const parsed = cachedMessages.map((m: string) => JSON.parse(m));

      // ✅ Correctly access nested encryptedchat and preserve all fields
      const decryptedChat = parsed.map((message: any) => ({
        ...message,
        chat: decrypt(
          message.encryptedchat.content,
          message.encryptedchat.iv,
          message.encryptedchat.tag,
        ),
        encryptedchat: undefined, // strip raw encrypted field
      }));

      return res.status(200).json({ chat: decryptedChat });
    }

    // ✅ DB fallback
    const findchat = await Room.findOne({ roomcode }).select("chat");

    // ✅ Room not found
    if (!findchat) {
      return res.status(404).json({ message: "Room not found" });
    }

    // ✅ Room exists but chat is empty
    if (findchat.chat.length === 0) {
      return res.status(200).json({ chat: [] });
    }

    // ✅ Warm the cache
    const serialized = findchat.chat.map((m: any) => JSON.stringify(m));
    await redis.rpush(dataKey, ...serialized);
    await redis.expire(dataKey, 60 * 60 * 2);

    // ✅ Decrypt DB messages too (same shape as cache)
    const decryptedChat = findchat.chat.map((message: any) => ({
      ...message.toObject?.() ?? message, // handle Mongoose doc or plain object
      chat: decrypt(
        message.encryptedchat.content,
        message.encryptedchat.iv,
        message.encryptedchat.tag,
      ),
      encryptedchat: undefined,
    }));

    return res.status(200).json({ chat: decryptedChat });
  } catch (err) {
    console.error("[getchat]", err);
    return res.status(500).json({ message: "Error fetching chat" });
  }
};

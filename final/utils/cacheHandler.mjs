import { createClient } from "redis";

let client;

if (process.env.NODE_ENV === "production") {
  client = createClient({
    url: `redis://${process.env.REDIS_USER}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOSTNAME}:${process.env.REDIS_PORT}`,
  });
} else {
  client = createClient({
    url: "redis://redis:6379",
  });
}

client.on("error", (err) => console.log("Redis Client Error", err));

async function connectRedis() {
  await client.connect();
}

connectRedis();

const defaultExpirationTime = 60 * 10; // 60 seconds times 10 -> 10 minutes

const handleCache = (cb) => cb();

export const getCache = (key) =>
  new Promise((resolve, reject) => {
    try {
      handleCache(async () => {
        const data = await client.get(key);
        if (data) {
          console.log("DATA FOUND! 🥳");
        }
        resolve(JSON.parse(data));
      });
    } catch (error) {
      reject(error);
    }
  });

export const setCache = (key, data, expTime) => {
  if (typeof expTime === "undefined") {
    expTime = defaultExpirationTime;
  }

  return new Promise((resolve, reject) => {
    try {
      handleCache(async () => {
        const isOk = await client.set(key, JSON.stringify(data), {
          EX: expTime,
        });
        if (isOk) {
          console.log("CACHED! ✅");
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteCache = (key) =>
  new Promise((resolve, reject) => {
    try {
      handleCache(async () => {
        const response = await client.del(key);
        if (response === 1) {
          console.log("CACHE DELETED!");
        }
        resolve(JSON.parse(response));
      });
    } catch (error) {
      reject(error);
    }
  });

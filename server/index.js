const { createClient } = require("redis");
const socketIdToHexColor = require("./utils/socketIdToHexColor");

const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let users = {};
let redisClient;

(async () => {
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://redis:6379",
  });

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  await redisClient.connect().then(() => {
    console.log("Redis connected...");

    io.on("connection", (socket) => {
      const username = socket.handshake.query.username || "Anonymous";
      const color = socketIdToHexColor(socket.id);

      socket.on("get-doc", async (docId) => {
        const docData = await handleDoc(docId);

        socket.join(docId);
        socket.docId = docId;

        const newUser = {
          id: socket.id,
          username,
          color,
        };

        if (Array.isArray(users[docId])) {
          users[docId].push(newUser);
        } else {
          users[docId] = [newUser];
        }

        io.to(docId).emit("users", users[docId]);

        socket.emit("load-doc", docData);

        socket.on("text-change", (delta) => {
          socket.broadcast.to(docId).emit("receive-text-change", delta);
        });

        socket.on("user-typing", (state) => {
          socket.broadcast
            .to(docId)
            .emit("receive-user-typing", socket.id, state);
        });

        socket.on("cursor-change", ({ range, username }) => {
          socket.broadcast.to(docId).emit("receive-cursor-change", {
            userId: socket.id,
            range,
            username,
            color,
          });
        });

        socket.on("save-doc", async (data) => {
          await redisClient.set(docId, JSON.stringify(data));
        });
      });

      socket.on("disconnect", () => {
        if (socket.docId) {
          socket.broadcast.to(socket.docId).emit("remove-cursor", socket.id);
        }

        users[socket.docId] =
          users[socket.docId]?.filter((user) => user.id !== socket.id) || [];

        io.to(socket.docId).emit("users", users[socket.docId]);
      });
    });
  });
})();

async function handleDoc(id) {
  if (!id) return "";

  try {
    const data = await redisClient.get(id);

    if (data) return JSON.parse(data);

    await redisClient.set(id, "");
    return "";
  } catch (err) {
    console.error("Redis Error:", err);
    return "";
  }
}

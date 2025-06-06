const { createClient } = require("redis");
const socketIdToHexColor = require("./utils/socketIdToHexColor");
const redisAPI = require("./utils/redisAPI");

const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let redisClient;
(async () => {
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://redis:6379",
  });

  redisClient.on("error", (error) => console.error(`Error : ${error}`));

  const { addUser, getUsers, initDoc, setDoc, removeUser } = new redisAPI(
    redisClient
  );

  await redisClient.connect().then(async () => {
    console.log("Redis connected...");

    try {
      await redisClient.flushAll();
      console.log("Redis flushed...");
    } catch (err) {
      console.error("Error in redis flushAll", err);
    }

    io.on("connection", (socket) => {
      const username = socket.handshake.query.username || "Anonymous";
      const color = socketIdToHexColor(socket.id);

      socket.on("get-doc", async (docId) => {
        try {
          const doc = await initDoc(docId);

          socket.join(docId);
          socket.docId = docId;

          const newUser = {
            id: socket.id,
            username,
            color,
          };
          await addUser(docId, newUser);
          const userList = await getUsers(docId);
          io.to(docId).emit("users", userList);

          socket.emit("load-doc", doc);
        } catch (err) {
          console.error("Error in get-doc:", err);
          socket.emit("error", "Failed to load document.");
        }
      });

      socket.on("text-change", async (delta) => {
        if (!socket.docId) return;
        try {
          socket.broadcast.to(socket.docId).emit("receive-text-change", delta);
        } catch (err) {
          console.error("Error in text-change:", err);
          socket.emit("error", "Text update failed.");
        }
      });

      socket.on("user-typing", async (state) => {
        if (!socket.docId) return;
        try {
          socket.broadcast
            .to(socket.docId)
            .emit("receive-user-typing", socket.id, state);
        } catch (err) {
          console.error("Error in user-typing:", err);
          socket.emit("error", "Typing notification failed.");
        }
      });

      socket.on("cursor-change", async ({ range, username }) => {
        if (!socket.docId) return;
        try {
          socket.broadcast.to(socket.docId).emit("receive-cursor-change", {
            userId: socket.id,
            range,
            username,
            color,
          });
        } catch (err) {
          console.error("Error in cursor-change:", err);
          socket.emit("error", "Cursor update failed.");
        }
      });

      socket.on("save-doc", async (data) => {
        if (!socket.docId) return;
        try {
          await setDoc(socket.docId, JSON.stringify(data));
        } catch (err) {
          console.error("Error saving document:", err);
          socket.emit("error", "Failed to save document.");
        }
      });

      socket.on("disconnect", async () => {
        if (!socket.docId) return;
        try {
          socket.broadcast.to(socket.docId).emit("remove-cursor", socket.id);
          await removeUser(socket.docId, socket.id);
          const userList = await getUsers(socket.docId);
          io.to(socket.docId).emit("users", userList);
        } catch (err) {
          console.error("Error in disconnect:", err);
          socket.emit("error", "Error during disconnect cleanup.");
        }
      });
    });
  });
})();

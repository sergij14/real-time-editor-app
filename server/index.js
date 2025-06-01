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

  await redisClient.connect().then(() => {
    console.log("Redis connected...");

    io.on("connection", (socket) => {
      const username = socket.handshake.query.username || "Anonymous";
      const color = socketIdToHexColor(socket.id);

      socket.on("get-doc", async (docId) => {
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
          await setDoc(docId, JSON.stringify(data));
        });
      });

      socket.on("disconnect", async () => {
        if (socket.docId) {
          socket.broadcast.to(socket.docId).emit("remove-cursor", socket.id);
          await removeUser(socket.docId, socket.id);
          const userList = await getUsers(socket.docId);
          io.to(socket.docId).emit("users", userList);
        }
      });
    });
  });
})();

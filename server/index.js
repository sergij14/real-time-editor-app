const mongoose = require("mongoose");
const Doc = require("./models/Doc");

const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// in-memory active users
let users = {};

io.on("connection", (socket) => {
  const username = socket.handshake.query.username || "Anonymous";

  socket.on("get-doc", async (docId) => {
    const doc = await handleDoc(docId);

    socket.join(docId);
    socket.docId = docId;
    socket.color = socketIdToHexColor(socket.id);

    const newUser = {
      id: socket.id,
      username,
      color: socket.color,
    };

    if (Array.isArray(users[docId])) {
      users[docId].push(newUser);
    } else {
      users[docId] = [newUser];
    }

    socket.emit("load-doc", doc.data);
    io.to(docId).emit("users", users[docId]);
  });

  socket.on("text-change", (delta) => {
    socket.broadcast.to(socket.docId).emit("receive-text-change", delta);
  });

  socket.on("cursor-change", ({ range, username }) => {
    socket.broadcast.to(socket.docId).emit("receive-cursor-change", {
      userId: socket.id,
      range,
      username,
      color: socket.color,
    });
  });

  socket.on("save-doc", async (data) => {
    await Doc.findByIdAndUpdate(socket.docId, { data });
  });

  socket.on("disconnect", () => {
    if (socket.docId) {
      socket.broadcast.to(socket.docId).emit("remove-cursor", socket.id);
    }

    users[socket.docId] = users[socket.docId].filter(
      (user) => user.id !== socket.id
    );
    io.to(socket.docId).emit("users", users[socket.docId]);
  });
});

async function handleDoc(id) {
  if (id === null) return;

  try {
    const doc = await Doc.findById(id);
    if (doc) return doc;

    return await Doc.create({
      _id: id,
      data: "",
    });
  } catch (err) {
    console.log(err);
  }
}

function socketIdToHexColor(socketId) {
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) {
    hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32-bit integer
  }

  const r = (hash >> 16) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = hash & 0xff;

  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

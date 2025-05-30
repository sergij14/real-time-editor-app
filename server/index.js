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

io.on("connection", (socket) => {
  const username = socket.handshake.query.username || "Anonymous";

  socket.on("get-doc", async (docId) => {
    const doc = await handleDoc(docId);

    socket.join(docId);
    socket.docId = docId;

    socket.emit("load-doc", doc.data);
  });

  socket.on("text-change", (delta) => {
    socket.broadcast.to(socket.docId).emit("receive-text-change", delta);
  });

  socket.on("cursor-change", ({ range, username }) => {
    socket.broadcast.to(socket.docId).emit("receive-cursor-change", {
      userId: socket.id,
      range,
      username,
    });
  });

  socket.on("save-doc", async (data) => {
    await Doc.findByIdAndUpdate(socket.docId, { data });
  });

  socket.on("disconnect", () => {
    if (socket.docId) {
      socket.broadcast.to(socket.docId).emit("remove-cursor", socket.id);
    }
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

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
})

io.on("connection", (socket) => {
  socket.on("get-doc", async (docId) => {
    const doc = await handleDoc(docId);

    socket.join(docId);
    socket.emit("load-doc", doc.data);

    socket.on("text-change", (delta) => {
      socket.broadcast.to(docId).emit("receive-text-change", delta);
    });

    socket.on("save-doc", async (data) => {
      await Doc.findByIdAndUpdate(docId, { data });
    });
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

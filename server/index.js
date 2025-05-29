const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("get-doc", (docId) => {
    const data = "";

    socket.join(docId);
    socket.emit("load-doc", data);

    socket.on("text-change", (delta) => {
      socket.broadcast.to(docId).emit("receive-text-change", delta);
    });
  });
});

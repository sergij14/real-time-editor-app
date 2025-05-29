const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("text-change", (delta) => {
    socket.broadcast.emit("receive-text-change", delta);
  });
});

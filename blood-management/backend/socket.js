const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

function initSocket(server, app) {
  const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || "*" } });
  io.use((socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      socket.userId = id; next();
    } catch { next(new Error("Unauthorized")); }
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.on("join_chat", (chatId) => socket.join(`chat:${chatId}`));
    socket.on("leave_chat", (chatId) => socket.leave(`chat:${chatId}`));
    socket.on("typing", ({ chatId }) => socket.to(`chat:${chatId}`).emit("typing", { chatId, userId: socket.userId }));
  });
  app.set("io", io);
}
module.exports = { initSocket };

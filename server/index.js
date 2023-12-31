const express = require("express");
const cors = require("cors");

require("dotenv").config();

const SocketIO = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const ACTION = require("./socketEvents");

app.get("/api/active", (req, res, next) => {
  try {
    return res.json({ active: true }).status(200);
  } catch (err) {
    res.json({ active: false }).status(500).console.log(err);
    next();
  }
});

const server = app.listen(process.env.PORT, () => {
  console.log("server started at port ", process.env.PORT);
});

const io = SocketIO(server, {
  cors: {
    origin: process.env.ORIGIN,
    credentials: true,
  },
});

const userSocketMap = {};

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  socket.on(ACTION.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTION.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTION.DISCONNCTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });

  socket.on(ACTION.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTION.CODE_CHANGE, { code });
  });

  socket.on(ACTION.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTION.CODE_CHANGE, { code });
  });
});

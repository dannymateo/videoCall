const express = require("express");
const app = express();
const cors = require("cors"); // Agrega esta línea para requerir el módulo cors
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
app.use(cors());

// Peer
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", { userId, userName });

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message);
    });

    socket.on("mic-muted", () => {
      socket.to(roomId).broadcast.emit("user-muted", socket.id);
    });

    socket.on("mic-unmuted", () => {
      socket.to(roomId).broadcast.emit("user-unmuted", socket.id);
    });

    socket.on("video-paused", () => {
      socket.to(roomId).broadcast.emit("user-video-paused", socket.id);
    });

    socket.on("video-resumed", () => {
      socket.to(roomId).broadcast.emit("user-video-resumed", socket.id);
    });

    socket.on("disconnect", () => {
      console.log('desconectado')
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

server.listen(process.env.PORT || 3030);

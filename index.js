const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const port = 3000;
const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("chat-message", (message) => {
    io.emit("message", message);
  });
});

app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
  return res.sendFile("/index.html");
});
server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);

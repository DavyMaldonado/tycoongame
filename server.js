// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let gameState = { players: {}, deck: [] };

io.on("connection", (socket) => {
  console.log("New player:", socket.id);

  gameState.players[socket.id] = { hand: [] };

  socket.on("playCard", (card) => {
    // TODO: validate card
    console.log(`${socket.id} played`, card);
    io.emit("cardPlayed", { player: socket.id, card });
  });

  socket.on("disconnect", () => {
    delete gameState.players[socket.id];
    console.log("Player left:", socket.id);
  });
});

server.listen(3000, () => console.log("Server running on :3000"));

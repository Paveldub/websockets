"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express = require("express");
const path = require("path");
const luckyNumbersGame_1 = require("./luckyNumbersGame");
const port = 3000;
const app = express();
app.use(express.static(path.join(__dirname, '../client')));
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server);
const game = new luckyNumbersGame_1.default();
io.on('connection', (socket) => {
    console.log('a user connected : ' + socket.id);
    game.LuckyNumbers[socket.id] = Math.floor(Math.random() * 20);
    socket.emit('message', 'Hello, your lucky number is ' + game.LuckyNumbers[socket.id]);
    socket.broadcast.emit('message', 'Everybody, say hello to ' + socket.id);
    socket.on('disconnect', () => {
        console.log('socket disconnected : ' + socket.id);
        socket.broadcast.emit('message', socket.id + ' has left the building');
    });
});
server.listen(port, () => {
    console.log('Server listening on port ' + port);
});
setInterval(() => {
    const randomNumber = Math.floor(Math.random() * 20);
    const winners = game.GetWinners(randomNumber);
    if (winners.length) {
        winners.forEach((w) => {
            io.to(w).emit('message', '*** You are the winner with ' + randomNumber + ' ***');
        });
    }
    io.emit('message', randomNumber);
}, 1000);

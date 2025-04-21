"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express = require("express");
const path = require("path");
const randomScreenNameGenerator_1 = require("./randomScreenNameGenerator");
const port = 3000;
const app = express();
app.use(express.static(path.join(__dirname, '../client')));
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server);
const randomScreenNameGenerator = new randomScreenNameGenerator_1.default();
io.on('connection', (socket) => {
    console.log('a user connected : ' + socket.id);
    let screenName = randomScreenNameGenerator.generateRandomScreenName();
    socket.emit('screenName', screenName);
    socket.broadcast.emit('systemMessage', screenName.name + ' has joined the chat');
    socket.on('disconnect', () => {
        console.log('socket disconnected : ' + socket.id);
        socket.broadcast.emit('systemMessage', screenName.name + ' has left the chat');
    });
    socket.on('chatMessage', (message) => {
        socket.broadcast.emit('chatMessage', message);
    });
});
server.listen(port, () => {
    console.log('Server listening on port ' + port);
});

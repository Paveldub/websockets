"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express = require("express");
const path = require("path");
const port = 3000;
const app = express();
app.use(express.static(path.join(__dirname, '../client')));
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server);
io.on('connection', (socket) => {
    console.log('a user connected : ' + socket.id);
});
server.listen(port, () => {
    console.log('Server listening on port ' + port);
});

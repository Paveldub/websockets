"use strict";
// import { createServer } from 'http'
// import { Server } from 'socket.io'
// import * as express from 'express'
// import * as path from 'path'
// import RandomScreenNameGenerator from './randomScreenNameGenerator'
Object.defineProperty(exports, "__esModule", { value: true });
// type ChatMessage = {
//   message: string
//   from: string
// }
// const port = 3000
// const app = express()
// app.use(express.static(path.join(__dirname, '../client')))
// const server = createServer(app)
// const io = new Server(server)
// const randomScreenNameGenerator = new RandomScreenNameGenerator()
// io.on('connection', (socket) => {
//   console.log('a user connected : ' + socket.id)
//   let screenName = randomScreenNameGenerator.generateRandomScreenName()
//   socket.emit('screenName', screenName)
//   socket.broadcast.emit('systemMessage', screenName.name + ' has joined the chat')
//   socket.on('disconnect', () => {
//     console.log('socket disconnected : ' + socket.id)
//     socket.broadcast.emit('systemMessage', screenName.name + ' has left the chat')
//   })
//   socket.on('chatMessage', (message: ChatMessage) => {
//     socket.broadcast.emit('chatMessage', message)
//   })
// })
// server.listen(port, () => {
//   console.log('Server listening on port ' + port)
// })
//// Canvas ////
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
    socket.on('draw', (message) => {
        socket.broadcast.emit('draw', message);
    });
});
server.listen(port, () => {
    console.log('Server listening on port ' + port);
});

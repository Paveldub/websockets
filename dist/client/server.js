import { createServer } from 'http';
import { Server } from 'socket.io';
import * as express from 'express';
import * as path from 'path';
const port = 3000;
const app = express();
app.use(express.static(path.join(__dirname, '../client')));
const server = createServer(app);
const io = new Server(server);
io.on('connection', (socket) => {
    console.log('a user connected : ' + socket.id);
});
server.listen(port, () => {
    console.log('Server listening on port ' + port);
});

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let starId = 0;

let coloniesLeft = 1000;

let civs = [];
let stars = {}; // Maybe implement stars using rooms

function addTech() {
    for (data in civs) {
        let currPlayer = io.sockets.connected[data.id];
        currPlayer.data.technology += currPlayer.data.techMultiplier;
vvv
        currPlayer.emit('technology', currentPlayer.data.technology, currPlayer.data.stars.length);
    }
}

function changeTechMultiplier(socketId, multiplier) {
    let currPlayer = io.sockets.connected[socketId]
    currPlayer.data.techMultiplier += multiplier;
    currPlayer.emit('techMultiplier', multiplier)
}

function battle(socketId1, wager1, socketId2, wager2) {
    let player1 = io.sockets.connected[socketId1];
    let player2 = io.sockets.connected[socketId2];
    if (wager1 > player1.data.technology) {
        return false;
    } else if (wager2 > player2.data.technology) {
        return false;
    }
    if (wager1 >= wager2) {
        changeTechMultiplier(socketId1, 0.25 * player2.data.techMultiplier);
        addTech(socketId1, wager2);
        addTech(socketId2, -wager1);
        return 1;
    } else {
        changeTechMultiplier(socketId2, 0.25 * player1.data.techMultiplier);
        addTech(socketId1, -wager2);
        addTech(socketId2, wager1);
        return 2;
    }
}

app.use(express.static('public'));

app.get('/', (req, res) => {
    //res.sendFile(__dirname + "/public/index.html");
});

io.on('connection', (socket) => {
    socket.data.technology = 0;
    socket.data.techMultiplier = 1;
    socket.data.stars = [{id: starId, pos: {x: 10*Math.random()-5, y: 10*Math.random()-5, z: 10*Math.random()-5}}];
    socket.data.giftHist = {};
    socket.data.attackHist = {};
    
    socket.emit('addAll', civs);
    socket.emit('colonize', socket.id, socket.data.stars[0].id, socket.data.stars[0].pos, 1, 0);

    let data = {id: socket.id, stars: socket.data.stars};
    civs.push(data);
    stars[starId] = [socket];
    starId += 1;

    socket.broadcast.emit('add', socket.id, socket.data.stars[0].id, socket.data.stars[0].pos);

    // Update technology
    setInterval(function () {
        socket.data.technology += socket.data.stars.length;
        socket.emit('technology', socket.data.technology, socket.data.stars.length);
    }, 1000);

    // Colonize
    socket.on('colonize', () => {
        if (socket.data.technology >= 5 && coloniesLeft > 0) {
            let star = {id: starId, pos: {x: 10*Math.random()-5, y: 10*Math.random()-5, z: 10*Math.random()-5}};
            socket.data.stars.push(star);
            stars[starId] = [socket];
            starId +=1 ;

            socket.data.technology -= 5;

            coloniesLeft --;

            socket.broadcast.emit('add', socket.id, star.id, star.pos);
            socket.emit('colonize', socket.id, star.id, star.pos, socket.data.stars.length, socket.data.technology);
        }
    });

    socket.on('select', (id) => {
        socket.emit('info', socket.data.giftHist[id], socket.data.attackHist[id], id);
    });

    // Give tech
    socket.on('giveTech', (tech, giveTo) => {
        if (tech > 0 && tech <= socket.data.technology) {
            let other = io.sockets.sockets.get(giveTo);

            other.data.technology += tech;
            socket.data.technology -= tech;

            if (socket.data.giftHist[other.id] == null) {
                socket.data.giftHist[other.id] = "";
                other.data.giftHist[socket.id] = "";
            }

            socket.data.giftHist[other.id] += "You gave " + tech + " resources.\n";
            other.data.giftHist[socket.id] += "Gave you " + tech + " resources.\n";

            socket.emit('update', socket.data);
            socket.emit('info', socket.data.giftHist[other.id], socket.data.attackHist[other.id], other.id);
            other.emit('update', other.data);
            other.emit('info', other.data.giftHist[socket.id], other.data.attackHist[socket.id], socket.id);
        }
    });

    // Attack
    socket.on('attack', (tech, attack, star) => {
        if (tech > 0 && tech <= socket.data.technology) {
            let other = io.sockets.sockets.get(attack);
            let localTech = other.data.technology / other.data.stars.length;

            if (socket.data.attackHist[other.id] == null) {
                socket.data.attackHist[other.id] = "";
                other.data.attackHist[socket.id] = "";
            }

            if (tech > localTech) {
                // Won
                socket.data.technology += localTech;
                other.data.technology -= localTech;

                for (let i = 0; i < other.data.stars.length; i++) {
                    if (other.data.stars[i].id == star) {
                        stars[other.data.stars[i].id] = socket;
                        socket.data.stars.push(other.data.stars[i]);
                        other.data.stars.splice(i, 1);
                        break;
                    }
                }
    
                socket.data.attackHist[other.id] += "You took over a colony.\n";
                other.data.attackHist[socket.id] += "Took over your a colony.\n";

                io.emit('transferStar', star, other.id, socket.id);
            }
            else {
                // Lost
                socket.data.technology -= tech;

                socket.data.attackHist[other.id] += "You attacked a colony with " + tech + " resources and failed.\n";
                other.data.attackHist[socket.id] += "Attacked your colony and failed.\n";
            }
            socket.emit('update', socket.data);
            socket.emit('info', socket.data.giftHist[other.id], socket.data.attackHist[other.id], other.id);
            other.emit('update', other.data);
            other.emit('info', other.data.giftHist[socket.id], other.data.attackHist[socket.id], socket.id);
        }
    });

    socket.on('disconnect', () => {
        civs.splice(civs.indexOf(data), 1);
        coloniesLeft += socket.data.stars.length - 1;

        io.emit('remove', socket.id);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
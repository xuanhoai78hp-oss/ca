'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT) || 3000;
const WORLD_WIDTH = 3500;
const WORLD_HEIGHT = 3500;
const UPDATE_INTERVAL_MS = 50;
const DEFAULT_NAME = 'PhiCôngVôDanh';
const DEFAULT_COLORS = { primaryColor: '#da251d', secondaryColor: '#ffeb00' };
const COUNTRY_COLORS = {
    VN: { primaryColor: '#da251d', secondaryColor: '#ffeb00' },
    USA: { primaryColor: '#3c3b6e', secondaryColor: '#b22234' },
    JP: { primaryColor: '#bc002d', secondaryColor: '#ffffff' }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'h.html'));
});
app.use(express.static(__dirname));

const players = Object.create(null);
let hasPendingUpdate = false;

function boundedNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
}

function validColor(value, fallback) {
    return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
        ? value
        : fallback;
}

function publishPlayers() {
    io.emit('update_players', players);
    hasPendingUpdate = false;
}

setInterval(() => {
    if (hasPendingUpdate) publishPlayers();
}, UPDATE_INTERVAL_MS);

io.on('connection', (socket) => {
    console.log('Người chơi kết nối:', socket.id);

    socket.on('join_game', (data) => {
        const playerData = data && typeof data === 'object' && !Array.isArray(data)
            ? data
            : {};
        const country = Object.hasOwn(COUNTRY_COLORS, playerData.country)
            ? playerData.country
            : 'VN';
        const colors = COUNTRY_COLORS[country] || DEFAULT_COLORS;
        const name = typeof playerData.name === 'string' && playerData.name.trim()
            ? playerData.name.trim().slice(0, 24)
            : DEFAULT_NAME;

        players[socket.id] = {
            id: socket.id,
            name,
            country,
            x: WORLD_WIDTH / 2,
            y: WORLD_HEIGHT / 2,
            angle: 0,
            level: 1,
            kills: 0,
            primaryColor: validColor(playerData.primaryColor, colors.primaryColor),
            secondaryColor: validColor(playerData.secondaryColor, colors.secondaryColor)
        };
        publishPlayers();
    });

    socket.on('player_move', (data) => {
        const player = players[socket.id];
        if (!player || !data || typeof data !== 'object' || Array.isArray(data)) return;

        player.x = boundedNumber(data.x, 50, WORLD_WIDTH - 50, player.x);
        player.y = boundedNumber(data.y, 50, WORLD_HEIGHT - 50, player.y);
        player.angle = boundedNumber(data.angle, -Math.PI * 1000, Math.PI * 1000, player.angle);
        player.level = Math.trunc(boundedNumber(data.level, 1, 999, player.level));
        player.kills = Math.trunc(boundedNumber(data.kills, 0, 1_000_000, player.kills));
        player.primaryColor = validColor(data.primaryColor, player.primaryColor);
        player.secondaryColor = validColor(data.secondaryColor, player.secondaryColor);
        hasPendingUpdate = true;
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            delete players[socket.id];
            publishPlayers();
        }
        console.log('Người chơi rời trận:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server Đại Dương Cá đang chạy tại cổng ${PORT}`);
});

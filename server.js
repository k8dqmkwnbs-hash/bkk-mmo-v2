const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let world = { chaos: 0, logs: [] };
let players = {};

// ระบบรันโลกอัตโนมัติ (รันทุก 5 วินาที)
setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        // สุ่มเหตุการณ์
        let chance = Math.random();
        if (chance > 0.7) {
            p.exp += 20;
            io.to(id).emit("log", "🧘 ท่านเข้าสู่ภวังค์... ได้รับตบะ +20");
        } else if (chance > 0.4) {
            p.hp -= 5;
            io.to(id).emit("log", "⚔️ ปะทะอสูรข้างทาง! เสียเลือด -5");
        }
        
        // เช็คเลเวลอัป
        if (p.exp >= 100) {
            p.level += 1; p.exp = 0; p.hp = 100;
            io.emit("broadcast", `✨ จอมยุทธ [${id.slice(0,4)}] บรรลุขั้นพลังเลเวล ${p.level}!`);
        }
        if (p.hp <= 0) {
            p.hp = 100; p.exp = Math.floor(p.exp/2);
            io.to(id).emit("log", "💀 ท่านพ่ายแพ้... เสียตบะครึ่งหนึ่งและจุติใหม่");
        }
    });
    io.emit("update_world", { players, chaos: world.chaos });
}, 3000);

io.on("connection", (socket) => {
    players[socket.id] = { hp: 100, level: 1, exp: 0 };
    socket.emit("log", "🐉 ยินดีต้อนรับสู่สำนัก... ระบบเริ่มบำเพ็ญอัตโนมัติแล้ว");

    socket.on("gm_boss", () => {
        io.emit("broadcast", "👹 BOSS: มังกรทมิฬ ปรากฏตัว! ทุกคนได้รับอันตราย!");
        Object.values(players).forEach(p => p.hp -= 30);
    });

    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>AUTO CULTIVATION MMO</title>
    <style>
        body { background: #080808; color: #0f0; font-family: 'Arial', sans-serif; display: flex; flex-direction: column; align-items: center; }
        .stats-card { background: #1a1a1a; padding: 20px; border-radius: 10px; border: 2px solid #0f0; width: 90%; max-width: 400px; margin-top: 20px; }
        .bar-bg { background: #333; height: 20px; border-radius: 10px; margin: 10px 0; overflow: hidden; }
        #hp-bar { background: #ff4444; width: 100%; height: 100%; transition: 0.5s; }
        #exp-bar { background: #44ff44; width: 0%; height: 100%; transition: 0.5s; }
        #log-box { width: 90%; max-width: 400px; height: 200px; background: #000; border: 1px solid #444; margin-top: 20px; overflow-y: scroll; padding: 10px; font-size: 14px; }
        .broadcast { color: cyan; font-weight: bold; animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0.5; } }
        button { background: #f00; color: #fff; border: none; padding: 10px; margin-top: 20px; cursor: pointer; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🌍 MMO AUTO-BKK</h1>
    <div class="stats-card">
        <h3>📍 สถานะของท่าน (Lv.<span id="lv">1</span>)</h3>
        HP: <div class="bar-bg"><div id="hp-bar"></div></div>
        EXP: <div class="bar-bg"><div id="exp-bar"></div></div>
    </div>
    <div id="log-box"></div>
    <button onclick="socket.emit('gm_boss')">👹 GM: SPAWN BOSS (TEST)</button>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const logBox = document.getElementById("log-box");

        socket.on("log", m => {
            logBox.innerHTML = "<div>" + m + "</div>" + logBox.innerHTML;
        });

        socket.on("broadcast", m => {
            logBox.innerHTML = "<div class='broadcast'>📢 " + m + "</div>" + logBox.innerHTML;
        });

        socket.on("update_world", data => {
            const me = data.players[socket.id];
            if(me) {
                document.getElementById("lv").innerText = me.level;
                document.getElementById("hp-bar").style.width = me.hp + "%";
                document.getElementById("exp-bar").style.width = me.exp + "%";
            }
        });
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Game Ready!"));

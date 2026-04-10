const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
const EVOLUTION = [
    { img: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400", bg: "#1a1a2e" },
    { img: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=400", bg: "#0d1b2a" },
    { img: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=400", bg: "#1b263b" },
    { img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400", bg: "#415a77" },
    { img: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?q=80&w=400", bg: "#778da9" },
    { img: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=400", bg: "#e0e1dd" },
    { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400", bg: "#5e548e" },
    { img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400", bg: "#231942" },
    { img: "https://images.unsplash.com/photo-1634157703702-3c124b455499?q=80&w=400", bg: "#000000" }
];

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            p.exp += (5 / (Math.floor(p.level/5)+1));
            if (p.exp >= 100) { p.level++; p.exp = 0; }
            let rIdx = Math.min(Math.floor((p.level-1)/5), RANKS.length-1);
            let scale = Math.pow(2.5, rIdx);
            p.atk = Math.floor((2000 + (p.level * 1000)) * scale);
            p.def = Math.floor((1000 + (p.level * 500)) * scale);
            p.gold += (p.level * 100);
        }
    });
    io.emit("tick", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (save) => {
        players[socket.id] = save || { level: 1, exp: 0, gold: 0, atk: 0, def: 0, isAuto: false };
        socket.emit("init", players[socket.id]);
    });
    socket.on("toggle", () => { if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto; });
    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>IMMORTAL ARIYA v12.2</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body { background: #000; color: #fff; font-family: 'Kanit', sans-serif; margin: 0; transition: 0.5s; }
        .container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; box-sizing: border-box; }
        .card { background: rgba(30,30,30,0.9); border: 2px solid #d4af37; border-radius: 20px; padding: 20px; width: 100%; max-width: 400px; text-align: center; }
        .rank { font-size: 24px; color: #ffd700; font-weight: 700; margin-bottom: 10px; }
        .avatar { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #ffd700; margin-bottom: 15px; }
        .bar-bg { width: 100%; height: 10px; background: #333; border-radius: 5px; margin: 10px 0; }
        .bar-fill { height: 100%; background: #ffd700; width: 0%; transition: 0.5s; border-radius: 5px; }
        .stats { display: flex; justify-content: space-between; margin-top: 15px; font-size: 14px; }
        .btn { background: #ffd700; color: #000; border: none; padding: 15px; border-radius: 10px; width: 100%; font-weight: 700; cursor: pointer; margin-top: 20px; }
    </style>
</head>
<body id="bg">
    <div class="container">
        <div class="card">
            <div id="rank-txt" class="rank">กำลังเชื่อมต่อ...</div>
            <img id="avatar-img" class="avatar" src="">
            <div style="font-size: 12px;">เลเวล <span id="lv-txt">1</span> | <span id="exp-txt">0</span>%</div>
            <div class="bar-bg"><div id="bar-fill" class="bar-fill"></div></div>
            <div class="stats">
                <span>⚔️ ATK: <b id="atk-txt">0</b></span>
                <span>🛡️ DEF: <b id="def-txt">0</b></span>
            </div>
            <div style="margin-top: 10px; color: #ffd700;">💰 ทอง: <span id="gold-txt">0</span></div>
            <button class="btn" onclick="toggle()">🧘 เริ่มบำเพ็ญเพียร</button>
        </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const evos = ${JSON.stringify(EVOLUTION)};
        function toggle() { socket.emit('toggle'); }
        socket.on("tick", (data) => {
            const p = data[socket.id];
            if(!p) return;
            const rIdx = Math.min(Math.floor((p.level-1)/5), ranks.length-1);
            document.getElementById('rank-txt').innerText = ranks[rIdx];
            document.getElementById('avatar-img').src = evos[rIdx].img;
            document.getElementById('bg').style.backgroundColor = evos[rIdx].bg;
            document.getElementById('lv-txt').innerText = p.level;
            document.getElementById('exp-txt').innerText = Math.floor(p.exp);
            document.getElementById('bar-fill').style.width = p.exp + "%";
            document.getElementById('atk-txt').innerText = p.atk.toLocaleString();
            document.getElementById('def-txt').innerText = p.def.toLocaleString();
            document.getElementById('gold-txt').innerText = p.gold.toLocaleString();
        });
        socket.emit('join', JSON.parse(localStorage.getItem('ariya_save')));
        socket.on("tick", (data) => { if(data[socket.id]) localStorage.setItem('ariya_save', JSON.stringify(data[socket.id])); });
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("System 12.2 Ready!"));

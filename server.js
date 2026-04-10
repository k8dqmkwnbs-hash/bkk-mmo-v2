const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let players = {};
const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
const SKINS = {
    default: "https://img.freepik.com/free-photo/fantasy-style-character-portrait_23-2151113429.jpg",
    armor: "https://img.freepik.com/free-photo/high-tech-warrior-wearing-heavy-armor_23-2150951152.jpg",
    sword: "https://img.freepik.com/free-photo/digital-art-style-character-with-sword_23-2151113406.jpg",
    beast: "https://img.freepik.com/free-photo/mythical-creature-fantasy-landscape_23-2151113454.jpg"
};

io.on("connection", (socket) => {
    socket.on("join", (saveData) => {
        players[socket.id] = saveData || { hp: 100, level: 1, exp: 0, gold: 50, gear: 'default' };
        socket.emit("update_client", players[socket.id]);
    });

    socket.on("help_fight", () => {
        let p = players[socket.id];
        if(p) {
            p.exp += 15; p.gold += 10;
            if (p.exp >= 100) { p.level++; p.exp = 0; }
            socket.emit("update_client", p);
        }
    });

    // --- 🤫 ระบบ GM ลับ ---
    socket.on("gm_power", (data) => {
        if(data.code === "1234GMSECRET") { // รหัสลับ
            let p = players[socket.id];
            if(p) {
                if(data.type === "gold") p.gold += 9999;
                if(data.type === "level") p.level += 5;
                socket.emit("update_client", p);
                socket.emit("log", "✨ พลังเทพเจ้าทำงาน! (Status Updated)");
            }
        }
    });

    socket.on("buy_item", (type) => {
        let p = players[socket.id];
        if(p && p.gold >= 100) {
            p.gold -= 100; p.gear = type;
            socket.emit("update_client", p);
        }
    });

    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>IMMORTAL WORLD 2.1</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { background: #000; color: #d4af37; font-family: 'Sarabun', sans-serif; margin: 0; text-align: center; }
        .screen { display: none; padding: 20px; animation: fadeIn 0.5s; }
        .active { display: block; }
        .char-img { width: 220px; height: 220px; border: 3px solid #d4af37; border-radius: 20px; box-shadow: 0 0 20px #d4af37; margin: 20px 0; }
        .btn { background: #d4af37; color: #000; border: none; padding: 12px 25px; margin: 8px; cursor: pointer; border-radius: 5px; font-weight: bold; width: 200px; }
        .bar { background: #222; height: 15px; border-radius: 10px; margin: 10px 0; border: 1px solid #d4af37; overflow: hidden; }
        #log { font-size: 12px; color: #888; height: 40px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        /* สไตล์หน้า GM ลับ */
        #gm-screen { background: #1a0000; border: 2px solid red; }
    </style>
</head>
<body>
    <audio id="bgm" loop src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3"></audio>

    <div id="home-screen" class="screen active">
        <h1 onclick="secretClick()" style="cursor:default">🏯 สำนักเจ้าปฐมกาล</h1>
        <img id="main-avatar" class="char-img" src="">
        <h2 id="display-rank">...</h2>
        <p>ทอง: <b id="display-gold">0</b> | เลเวล: <b id="display-lv">1</b></p>
        <button class="btn" onclick="showScreen('battle-screen')">⚔️ บำเพ็ญเพียร</button><br>
        <button class="btn" onclick="showScreen('shop-screen')">💰 หอสมบัติเซียน</button>
    </div>

    <div id="battle-screen" class="screen">
        <h2>🔥 พื้นที่ล่าปีศาจ</h2>
        <img src="https://img.freepik.com/free-photo/mystical-dragon-nest-cave_23-2151113444.jpg" style="width:100%; max-width:300px; border-radius:10px;">
        <div class="bar"><div id="exp-bar" style="background:#d4af37; height:100%; width:0%"></div></div>
        <button class="btn" onclick="socket.emit('help_fight')">⚔️ โจมตีมอนสเตอร์</button><br>
        <button class="btn" style="background:#444; color:#fff;" onclick="showScreen('home-screen')">🏠 กลับสำนัก</button>
        <div id="log"></div>
    </div>

    <div id="gm-screen" class="screen">
        <h1 style="color:red">👑 ห้องลับผู้สร้างโลก</h1>
        <button class="btn" onclick="gmAction('gold')">💰 เสกทอง 9,999</button><br>
        <button class="btn" onclick="gmAction('level')">🆙 เพิ่ม +5 เลเวล</button><br>
        <button class="btn" style="background:#444; color:#fff;" onclick="showScreen('home-screen')">❌ ปิดหน้าต่างลับ</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
        const skins = ${JSON.stringify(SKINS)};
        
        let clickCount = 0;
        function secretClick() {
            clickCount++;
            if(clickCount >= 5) { // กด 5 ครั้งเพื่อปลดล็อก
                let pass = prompt("ระบุรหัสลับเจ้าสำนัก:");
                if(pass === "1234GMSECRET") showScreen('gm-screen');
                clickCount = 0;
            }
        }

        function gmAction(type) {
            socket.emit('gm_power', { type: type, code: "1234GMSECRET" });
        }

        let savedData = JSON.parse(localStorage.getItem('ariya_mmo_save'));
        socket.emit('join', savedData);

        function showScreen(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            if(id === 'battle-screen') document.getElementById('bgm').play();
        }

        socket.on("update_client", (data) => {
            localStorage.setItem('ariya_mmo_save', JSON.stringify(data));
            document.getElementById('display-lv').innerText = data.level;
            document.getElementById('display-gold').innerText = data.gold;
            document.getElementById('exp-bar').style.width = data.exp + "%";
            document.getElementById('main-avatar').src = skins[data.gear] || skins.default;
            let rIdx = Math.min(Math.floor((data.level-1)/5), ranks.length-1);
            document.getElementById('display-rank').innerText = ranks[rIdx];
        });

        socket.on("log", m => { document.getElementById('log').innerText = m; });
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Hidden GM System Live!"));

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
const SKINS = {
    default: "https://get.wallhere.com/photo/illustration-video-games-artwork-swords-Chinese-style-1915995.jpg",
    armor: "https://get.wallhere.com/photo/illustration-video-games-fantasy-armor-warrior-Chinese-style-1916001.jpg",
    sword: "https://get.wallhere.com/photo/Chinese-style-swordsman-fantasy-art-warrior-dragon-1915984.jpg",
    beast: "https://get.wallhere.com/photo/fantasy-art-dragon-Chinese-style-artwork-digital-art-1916005.jpg"
};

let players = {};

// --- ⚙️ ระบบโลก (Auto-Loop) ---
setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        // บำเพ็ญเพียรอัตโนมัติ
        p.exp += 5 + (p.level * 0.5);
        p.gold += 2 + (p.level * 0.2);
        
        if (p.exp >= 100) {
            p.level++;
            p.exp = 0;
            io.to(id).emit("level_up", p.level);
        }
    });
    io.emit("update_all", players);
}, 3000);

io.on("connection", (socket) => {
    socket.on("join", (saveData) => {
        players[socket.id] = saveData || { hp: 100, level: 1, exp: 0, gold: 0, gear: 'default', atk: 10, def: 5 };
        socket.emit("update_client", players[socket.id]);
    });

    socket.on("click_cultivate", () => {
        let p = players[socket.id];
        if(p) { p.exp += 10; p.gold += 5; socket.emit("update_client", p); }
    });

    socket.on("gm_power", (data) => {
        if(data.code === "1234GMSECRET") {
            let p = players[socket.id];
            if(p) { p.gold += 50000; p.level += 20; socket.emit("update_client", p); }
        }
    });

    socket.on("buy", (item) => {
        let p = players[socket.id];
        if(p && p.gold >= 500) {
            p.gold -= 500; p.gear = item; p.atk += 50;
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
    <title>IMMORTAL SAGA: ARIYA</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { background: #000; color: #fff; font-family: 'Sarabun', sans-serif; margin: 0; text-align: center; overflow: hidden; }
        .bg-layer { position: fixed; width: 100%; height: 100%; background: url('https://get.wallhere.com/photo/illustration-fantasy-art-mountains-clouds-floating-island-Chinese-style-1916010.jpg') center/cover; filter: blur(3px) brightness(0.4); z-index: -1; }
        .screen { display: none; padding: 20px; animation: slideUp 0.6s ease; height: 100vh; }
        .active { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        
        .char-box { position: relative; width: 280px; height: 380px; border: 4px solid #d4af37; border-radius: 15px; overflow: hidden; box-shadow: 0 0 40px #d4af37; background: #111; }
        .char-box img { width: 100%; height: 100%; object-fit: cover; }
        .status-bar { position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.8); padding: 10px 0; }
        
        .rank-text { font-size: 32px; font-weight: bold; color: #d4af37; text-shadow: 0 0 15px #d4af37; margin: 10px 0; }
        .btn { background: linear-gradient(180deg, #d4af37, #8a6d3b); color: #000; border: none; padding: 15px; margin: 5px; cursor: pointer; border-radius: 8px; font-weight: bold; width: 250px; font-size: 18px; text-transform: uppercase; }
        
        .progress-container { width: 280px; height: 10px; background: #222; border-radius: 5px; margin: 15px 0; border: 1px solid #d4af37; overflow: hidden; }
        #exp-fill { background: #d4af37; height: 100%; width: 0%; transition: 0.3s; box-shadow: 0 0 10px #d4af37; }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; width: 280px; gap: 10px; margin-bottom: 20px; font-size: 14px; }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
</head>
<body>
    <div class="bg-layer"></div>
    <audio id="bgm" loop src="https://www.chosic.com/wp-content/uploads/2021/07/The-Grand-Final-Epic-Modern-Chinese-Music.mp3"></audio>

    <div id="home" class="screen active">
        <h1 onclick="secretGM()" style="color:#d4af37; letter-spacing:5px; margin:0;">IMMORTAL SAGA</h1>
        <div id="rank-name" class="rank-text">รวบรวมลมปราณ</div>
        
        <div class="char-box">
            <img id="avatar" src="">
            <div class="status-bar">
                <div class="stats-grid">
                    <span>⚔️ ATK: <b id="atk">10</b></span>
                    <span>🛡️ DEF: <b id="def">5</b></span>
                </div>
                <div>💰 ทอง: <b id="gold">0</b></div>
            </div>
        </div>

        <div class="progress-container"><div id="exp-fill"></div></div>
        <div style="font-size:12px; color:#d4af37;">ตบะบำเพ็ญ (AUTO RUNNING...)</div>

        <button class="btn" onclick="socket.emit('click_cultivate')">⚡ เร่งการบำเพ็ญ</button>
        <button class="btn" style="background:#222; color:#d4af37; border:1px solid #d4af37;" onclick="showScreen('shop')">🎁 หอสมบัติเทพ</button>
    </div>

    <div id="shop" class="screen">
        <h1 style="color:#d4af37;">หอสมบัติ (500 ทอง)</h1>
        <button class="btn" onclick="socket.emit('buy','sword')">🗡️ กระบี่ตัดดารา</button>
        <button class="btn" onclick="socket.emit('buy','armor')">🛡️ เกราะมังกรทอง</button>
        <button class="btn" onclick="socket.emit('buy','beast')">🐉 มังกรปฐมกาล</button>
        <br>
        <button class="btn" style="background:#444; color:#fff;" onclick="showScreen('home')">🏠 กลับสำนัก</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
        const skins = ${JSON.stringify(SKINS)};
        
        let saved = JSON.parse(localStorage.getItem('ariya_immortal_save'));
        socket.emit('join', saved);

        function showScreen(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.getElementById('bgm').play().catch(()=>{});
        }

        function secretGM() {
            let p = prompt("รหัสลับเจ้าสำนัก:");
            if(p === "1234GMSECRET") socket.emit('gm_power', {code: p});
        }

        socket.on("update_client", (p) => {
            localStorage.setItem('ariya_immortal_save', JSON.stringify(p));
            document.getElementById('avatar').src = skins[p.gear] || skins.default;
            document.getElementById('gold').innerText = Math.floor(p.gold);
            document.getElementById('atk').innerText = p.atk + (p.level * 5);
            document.getElementById('def').innerText = p.def + (p.level * 2);
            document.getElementById('exp-fill').style.width = p.exp + "%";
            
            let rIdx = Math.min(Math.floor((p.level-1)/5), ranks.length-1);
            document.getElementById('rank-name').innerText = ranks[rIdx];
        });

        socket.on("update_all", (data) => {
            if(data[socket.id]) socket.emit('update_client', data[socket.id]);
        });
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("The Ultimate Immortal System is Live!"));

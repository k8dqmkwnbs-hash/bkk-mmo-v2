const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];

// 🗺️ พื้นที่บำเพ็ญ 9 ระดับ (สอดคล้องกับขั้นพลัง)
const MAPS = [
    { name: "ป่าไผ่เขียว", req: 0, mult: 1, img: "https://images.unsplash.com/photo-1505820013142-f39b1e4da2ff?q=80&w=800" },
    { name: "หุบเขาเมฆา", req: 5, mult: 2, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800" },
    { name: "ถ้ำลาวาอัคนี", req: 10, mult: 4, img: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800" },
    { name: "ทะเลสาบเหมันต์", req: 15, mult: 8, img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800" },
    { name: "สุสานกระบี่", req: 20, mult: 15, img: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=800" },
    { name: "วิหารลอยฟ้า", req: 25, mult: 30, img: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800" },
    { name: "มิติกาลเวลา", req: 30, mult: 60, img: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?q=80&w=800" },
    { name: "แดนจุติเทพ", req: 35, mult: 120, img: "https://images.unsplash.com/photo-1506318137071-a8e063b4b0a1?q=80&w=800" },
    { name: "ห้วงปฐมกาล", req: 40, mult: 250, img: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=800" }
];

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            let m = MAPS[p.mapIdx];
            // 📈 พลังเพิ่มตามเลเวลเลเวล: เลเวลยิ่งเยอะ ตัวคูณพลังยิ่งโหด
            let lvMult = Math.pow(1.2, p.level);
            p.exp += (2 * m.mult);
            p.gold += (1 * m.mult);
            p.atk = Math.floor((10 + (p.level * 5)) * lvMult);
            p.def = Math.floor((5 + (p.level * 2)) * lvMult);

            if (p.exp >= 100) { p.level++; p.exp = 0; }
        }
    });
    io.emit("update_all", players);
}, 1000); // อัปเดตทุกวินาทีให้เห็นพลังวิ่งรัวๆ

io.on("connection", (socket) => {
    socket.on("join", (save) => {
        players[socket.id] = save || { level: 1, exp: 0, gold: 0, atk: 10, def: 5, gear: [], mapIdx: 0, isAuto: false };
        socket.emit("update_client", players[socket.id]);
    });

    socket.on("toggle_auto", () => {
        if(players[socket.id]) {
            players[socket.id].isAuto = !players[socket.id].isAuto;
            socket.emit("update_client", players[socket.id]);
        }
    });

    socket.on("change_map", (idx) => {
        let p = players[socket.id];
        if(p && p.level >= MAPS[idx].req) {
            p.mapIdx = idx;
            socket.emit("update_client", p);
        }
    });

    socket.on("gm_secret", (code) => {
        if(code === "ARIYA_GOD_MODE") {
            let p = players[socket.id];
            p.gold += 9999999; p.level += 10;
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
    <title>IMMORTAL SAGA v5.0</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;600&display=swap" rel="stylesheet">
    <style>
        body { background: #000; color: #fff; font-family: 'Kanit', sans-serif; margin: 0; overflow: hidden; }
        .bg { position: fixed; width: 100%; height: 100%; transition: 1s; z-index: -1; filter: brightness(0.3); background-size: cover; background-position: center; }
        .ui-container { display: flex; flex-direction: column; align-items: center; height: 100vh; padding: 20px; box-sizing: border-box; }
        
        .status-card { background: rgba(0,0,0,0.7); border: 2px solid #d4af37; border-radius: 15px; padding: 15px; width: 100%; max-width: 400px; box-shadow: 0 0 20px #d4af37; }
        .rank-name { font-size: 24px; color: #d4af37; font-weight: 600; text-shadow: 0 0 10px #d4af37; }
        
        .bar-wrap { background: #222; height: 20px; border-radius: 10px; margin: 10px 0; border: 1px solid #d4af37; overflow: hidden; position: relative; }
        #exp-bar { background: linear-gradient(90deg, #d4af37, #fff); height: 100%; width: 0%; transition: 0.2s; }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; font-size: 14px; }
        .stat-item { background: rgba(212, 175, 55, 0.2); padding: 5px; border-radius: 5px; }

        .btn { background: #d4af37; color: #000; border: none; padding: 12px; margin: 5px; cursor: pointer; border-radius: 8px; font-weight: bold; width: 100%; max-width: 300px; transition: 0.3s; font-size: 16px; }
        .btn:active { transform: scale(0.95); }
        .btn-auto { background: #ff4444; color: #fff; }
        .btn-auto.active { background: #44ff44; color: #000; box-shadow: 0 0 15px #44ff44; }

        .map-selector { display: flex; overflow-x: auto; width: 100%; max-width: 400px; padding: 10px 0; gap: 10px; }
        .map-card { min-width: 100px; padding: 10px; background: #222; border: 1px solid #444; border-radius: 8px; font-size: 12px; cursor: pointer; }
        .map-card.active { border-color: #d4af37; background: #332a00; }
        .locked { opacity: 0.5; cursor: not-allowed; }
    </style>
</head>
<body>
    <div id="bg-img" class="bg"></div>
    <audio id="bgm" loop src="https://www.chosic.com/wp-content/uploads/2021/07/The-Grand-Final-Epic-Modern-Chinese-Music.mp3"></audio>

    <div class="ui-container">
        <div id="secret-trigger" style="height:20px; width:20px; align-self: flex-start;"></div>
        
        <div class="status-card">
            <div id="rank-display" class="rank-name">รวบรวมลมปราณ</div>
            <div style="font-size: 14px;">เลเวล: <span id="lv-display">1</span></div>
            
            <div class="bar-wrap"><div id="exp-bar"></div></div>
            <div id="exp-text" style="font-size:10px; text-align:right; margin-top:-5px;">EXP: 0%</div>

            <div class="stats-grid">
                <div class="stat-item">⚔️ ATK: <b id="atk-display">10</b></div>
                <div class="stat-item">🛡️ DEF: <b id="def-display">5</b></div>
                <div class="stat-item">💰 ทอง: <b id="gold-display">0</b></div>
                <div class="stat-item">📍 แผนที่: <b id="map-name">ป่าไผ่</b></div>
            </div>
        </div>

        <h3 style="margin: 20px 0 5px;">📍 เลือกพื้นที่เก็บเลเวล</h3>
        <div class="map-selector" id="map-list"></div>

        <button id="auto-btn" class="btn btn-auto" onclick="toggleAuto()">⭕ เริ่มบำเพ็ญ (AUTO)</button>
        <button class="btn" onclick="startSystem()">🎵 รีเซ็ตเสียง/ฉาก</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const maps = ${JSON.stringify(MAPS)};
        
        function startSystem() {
            document.getElementById('bgm').play().catch(()=>{});
        }

        function toggleAuto() {
            socket.emit('toggle_auto');
            startSystem();
        }

        // 🤫 GM SECRET: กดค้างที่มุมซ้ายบน 3 วินาที
        let gmTimer;
        const trigger = document.getElementById('secret-trigger');
        trigger.addEventListener('touchstart', () => {
            gmTimer = setTimeout(() => {
                let p = prompt("ระบุรหัสเจ้าสำนัก:");
                socket.emit('gm_secret', p);
            }, 3000);
        });
        trigger.addEventListener('touchend', () => clearTimeout(gmTimer));

        socket.on("update_client", (p) => {
            localStorage.setItem('ariya_final_save', JSON.stringify(p));
            document.getElementById('lv-display').innerText = p.level;
            document.getElementById('gold-display').innerText = Math.floor(p.gold);
            document.getElementById('atk-display').innerText = p.atk.toLocaleString();
            document.getElementById('def-display').innerText = p.def.toLocaleString();
            document.getElementById('exp-bar').style.width = p.exp + "%";
            document.getElementById('exp-text').innerText = "EXP: " + Math.floor(p.exp) + "%";
            
            const rIdx = Math.min(Math.floor((p.level-1)/5), ranks.length-1);
            document.getElementById('rank-display').innerText = ranks[rIdx];
            document.getElementById('rank-display').style.color = rIdx >= 5 ? '#00ffff' : '#d4af37';
            
            document.getElementById('bg-img').style.backgroundImage = "url('" + maps[p.mapIdx].img + "')";
            document.getElementById('map-name').innerText = maps[p.mapIdx].name;

            const btn = document.getElementById('auto-btn');
            if(p.isAuto) {
                btn.innerText = "✅ กำลังบำเพ็ญอัตโนมัติ...";
                btn.classList.add('active');
            } else {
                btn.innerText = "⭕ เริ่มบำเพ็ญ (AUTO)";
                btn.classList.remove('active');
            }

            // Render Map List
            const list = document.getElementById('map-list');
            list.innerHTML = "";
            maps.forEach((m, i) => {
                const isLocked = p.level < m.req;
                list.innerHTML += `
                    <div class="map-card ${isLocked ? 'locked' : ''} ${p.mapIdx === i ? 'active' : ''}" 
                         onclick="${isLocked ? '' : `socket.emit('change_map', ${i})`}">
                        <b>${m.name}</b><br>
                        ${isLocked ? `🔒 Lv. ${m.req}` : `🔥 x${m.mult}`}
                    </div>`;
            });
        });

        let saved = JSON.parse(localStorage.getItem('ariya_final_save'));
        socket.emit('join', saved);

        socket.on("update_all", (data) => { if(data[socket.id]) socket.emit('update_client', data[socket.id]); });
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Immortal Saga 5.0 Live!"));

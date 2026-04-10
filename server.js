const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];

// 🖼️ ระบบเปลี่ยนร่างตามขั้นพลัง
const AVATARS = [
    "https://img.freepik.com/free-photo/fantasy-style-character-portrait_23-2151113429.jpg",
    "https://img.freepik.com/free-photo/digital-art-style-character-with-sword_23-2151113406.jpg",
    "https://img.freepik.com/free-photo/high-tech-warrior-wearing-heavy-armor_23-2150951152.jpg",
    "https://img.freepik.com/free-photo/mythical-creature-fantasy-landscape_23-2151113454.jpg",
    "https://img.freepik.com/free-photo/warrior-with-flaming-sword_23-2150951156.jpg",
    "https://img.freepik.com/free-photo/divine-entity-concept_23-2151113442.jpg",
    "https://img.freepik.com/free-photo/majestic-golden-warrior_23-2150951160.jpg",
    "https://img.freepik.com/free-photo/god-like-figure-ethereal-light_23-2151113460.jpg",
    "https://img.freepik.com/free-photo/cosmic-entity-abstract-art_23-2151113462.jpg"
];

// ⚔️ สร้างไอเทม 48 ชิ้น (4 หมวด x 12 ชิ้น)
const SHOP_ITEMS = {
    weapon: Array.from({length: 12}, (_, i) => ({ name: "กระบี่ขั้นที่ " + (i+1), price: Math.pow(i+1, 4) * 100, atk: (i+1) * 100 })),
    armor: Array.from({length: 12}, (_, i) => ({ name: "เกราะขั้นที่ " + (i+1), price: Math.pow(i+1, 4) * 100, def: (i+1) * 50 })),
    mount: Array.from({length: 12}, (_, i) => ({ name: "สัตว์ขี่ขั้นที่ " + (i+1), price: Math.pow(i+1, 5) * 200, atk: (i+1) * 200 })),
    acc: Array.from({length: 12}, (_, i) => ({ name: "เครื่องรางขั้นที่ " + (i+1), price: Math.pow(i+1, 5) * 200, def: (i+1) * 100 }))
};

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            let diff = p.level > 25 ? 0.15 : 1; // เวล 25+ ยากขึ้น 6 เท่า
            p.exp += (3 * diff);
            p.gold += (Math.floor(p.level/2) + 5);
            p.curAtk = Math.floor((p.baseAtk + (p.level * 20)) * Math.pow(1.2, p.level));
            p.curDef = Math.floor((p.baseDef + (p.level * 10)) * Math.pow(1.18, p.level));
            if (p.exp >= 100) { p.level++; p.exp = 0; }
        }
    });
    io.emit("update", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (save) => {
        players[socket.id] = save || { level: 1, exp: 0, gold: 0, baseAtk: 10, baseDef: 5, curAtk: 10, curDef: 5, isAuto: false, gear: [] };
        socket.emit("init", players[socket.id]);
    });
    socket.on("toggle_auto", () => { if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto; });
    socket.on("buy", (d) => {
        let p = players[socket.id];
        let item = SHOP_ITEMS[d.cat][d.idx];
        if(p && p.gold >= item.price) {
            p.gold -= item.price;
            if(item.atk) p.baseAtk += item.atk;
            if(item.def) p.baseDef += item.def;
            socket.emit("msg", "ได้รับ " + item.name);
        }
    });
    socket.on("gm", (code) => { if(code === "ARIYA_POWER") { players[socket.id].gold += 1000000; players[socket.id].level += 15; } });
    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>IMMORTAL SAGA v7.0</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body { background: #000; color: #fff; font-family: 'Kanit', sans-serif; margin: 0; padding-bottom: 80px; }
        .bg { position: fixed; top:0; left:0; width:100%; height:100%; background: url('https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1200') center/cover; filter: brightness(0.3); z-index: -2; }
        .container { padding: 15px; text-align: center; }
        .header { background: rgba(0,0,0,0.8); border: 2px solid #d4af37; border-radius: 15px; padding: 10px; margin-bottom: 10px; }
        .rank-name { color: #d4af37; font-size: 24px; font-weight: 700; text-shadow: 0 0 10px #d4af37; }
        .avatar-box { width: 180px; height: 180px; border: 3px solid #d4af37; margin: 10px auto; border-radius: 50%; overflow: hidden; box-shadow: 0 0 20px #d4af37; }
        .avatar-box img { width: 100%; height: 100%; object-fit: cover; }
        .bar { background: #222; height: 20px; border-radius: 10px; border: 1px solid #d4af37; overflow: hidden; position: relative; margin: 10px 0; }
        #exp-fill { background: linear-gradient(90deg, #d4af37, #fff); height: 100%; width: 0%; transition: 0.3s; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 13px; }
        .stat-item { background: rgba(212,175,55,0.1); border: 1px solid #444; padding: 5px; border-radius: 5px; }
        .btn-main { background: #d4af37; color: #000; border: none; padding: 15px; border-radius: 10px; font-weight: 700; width: 100%; margin: 10px 0; font-size: 18px; }
        .btn-main.active { background: #44ff44; box-shadow: 0 0 20px #44ff44; }
        .shop-section { display: none; background: #111; padding: 10px; border-radius: 10px; border: 1px solid #333; height: 300px; overflow-y: auto; }
        .shop-active { display: block; }
        .item-card { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding: 8px 0; font-size: 12px; }
        .buy-btn { background: #8a6d3b; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; font-size: 10px; }
        .nav-bar { position: fixed; bottom: 0; width: 100%; background: #111; display: flex; border-top: 1px solid #d4af37; }
        .nav-item { flex: 1; padding: 15px; text-align: center; font-size: 12px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="bg"></div>
    <audio id="bgm" loop src="https://www.chosic.com/wp-content/uploads/2021/07/The-Grand-Final-Epic-Modern-Chinese-Music.mp3"></audio>

    <div class="container">
        <div class="header">
            <div id="rank" class="rank-name">กำลังโหลด...</div>
            <div class="avatar-box"><img id="avatar" src=""></div>
            <div class="bar"><div id="exp-fill"></div></div>
            <div style="font-size:11px;">Lv.<span id="lv">1</span> | EXP: <span id="exp-val">0</span>%</div>
            <div class="stats">
                <div class="stat-item">⚔️ ATK: <b id="atk">10</b></div>
                <div class="stat-item">🛡️ DEF: <b id="def">5</b></div>
                <div class="stat-item" style="grid-column: span 2;" onclick="gm()">💰 ทอง: <b id="gold">0</b></div>
            </div>
        </div>

        <button id="auto-btn" class="btn-main" onclick="toggleAuto()">🧘 เริ่มบำเพ็ญอัตโนมัติ</button>

        <div id="shop-area" class="shop-section">
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <button onclick="loadShop('weapon')" style="flex:1; font-size:10px;">อาวุธ</button>
                <button onclick="loadShop('armor')" style="flex:1; font-size:10px;">ชุด</button>
                <button onclick="loadShop('mount')" style="flex:1; font-size:10px;">สัตว์ขี่</button>
                <button onclick="loadShop('acc')" style="flex:1; font-size:10px;">เครื่องราง</button>
            </div>
            <div id="shop-list"></div>
        </div>

        <div id="battle-area" class="shop-active" style="text-align:center;">
            <p id="battle-log">สงบนิ่งบำเพ็ญเพียร...</p>
            <img src="https://img.freepik.com/free-photo/majestic-dragon-fantasy-landscape_23-2151113444.jpg" style="width:100%; max-width:250px; border-radius:10px; opacity:0.6;">
        </div>
    </div>

    <div class="nav-bar">
        <div class="nav-item" onclick="showTab('battle')">⚔️ บำเพ็ญ</div>
        <div class="nav-item" onclick="showTab('shop')">💰 ร้านค้า</div>
        <div class="nav-item" onclick="document.getElementById('bgm').play()">🎵 เพลง</div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const avatars = ${JSON.stringify(AVATARS)};
        const shopItems = ${JSON.stringify(SHOP_ITEMS)};
        let gmClick = 0;

        function toggleAuto() { socket.emit('toggle_auto'); document.getElementById('bgm').play().catch(()=>{}); }
        function gm() { gmClick++; if(gmClick >= 5) { let p = prompt("รหัสลับ:"); socket.emit('gm', p); gmClick=0; } }
        function showTab(t) {
            document.getElementById('shop-area').classList.toggle('shop-active', t==='shop');
            document.getElementById('battle-area').classList.toggle('shop-active', t==='battle');
        }
        function loadShop(cat) {
            const list = document.getElementById('shop-list');
            list.innerHTML = "";
            shopItems[cat].forEach((it, i) => {
                list.innerHTML += `<div class="item-card">
                    <span>\${it.name}<br><small>💰 \${it.price.toLocaleString()}</small></span>
                    <button class="buy-btn" onclick="socket.emit('buy',{cat:'\${cat}',idx:\${i}})">ซื้อ</button>
                </div>`;
            });
        }
        socket.on("init", p => updateUI(p));
        socket.on("update", data => { if(data[socket.id]) updateUI(data[socket.id]); });
        socket.on("msg", m => alert(m));

        function updateUI(p) {
            document.getElementById('lv').innerText = p.level;
            document.getElementById('atk').innerText = p.curAtk.toLocaleString();
            document.getElementById('def').innerText = p.curDef.toLocaleString();
            document.getElementById('gold').innerText = p.gold.toLocaleString();
            document.getElementById('exp-fill').style.width = p.exp + "%";
            document.getElementById('exp-val').innerText = Math.floor(p.exp);
            
            const rIdx = Math.min(Math.floor((p.level-1)/5), ranks.length-1);
            document.getElementById('rank').innerText = ranks[rIdx];
            document.getElementById('avatar').src = avatars[rIdx];
            
            const btn = document.getElementById('auto-btn');
            btn.innerText = p.isAuto ? "⚡ กำลังบำเพ็ญรัวๆ..." : "🧘 เริ่มบำเพ็ญอัตโนมัติ";
            btn.classList.toggle('active', p.isAuto);
            document.getElementById('battle-log').innerText = p.isAuto ? "🔥 กำลังต่อสู้และดูดซับพลัง..." : "สงบนิ่งบำเพ็ญเพียร...";
        }
        let saved = JSON.parse(localStorage.getItem('ariya_save_v7'));
        socket.emit('join', saved);
        loadShop('weapon');
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Ultimate v7.0 Online!"));

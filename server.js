const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];

const EVOLUTION = [
    { img: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300", bg: "#1a1a1a" },
    { img: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=300", bg: "#0d1b2a" },
    { img: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=300", bg: "#1b263b" },
    { img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300", bg: "#415a77" },
    { img: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?q=80&w=300", bg: "#778da9" },
    { img: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=300", bg: "#e0e1dd" },
    { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300", bg: "#5e548e" },
    { img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=300", bg: "#231942" },
    { img: "https://images.unsplash.com/photo-1634157703702-3c124b455499?q=80&w=300", bg: "#000000" }
];

const SHOP = {
    weapon: Array.from({length: 12}, (_, i) => ({ name: "กระบี่ขั้น " + (i+1), price: Math.pow(i+1, 5) * 100, stat: (i+1) * 500 })),
    armor: Array.from({length: 12}, (_, i) => ({ name: "ชุดขั้น " + (i+1), price: Math.pow(i+1, 5) * 100, stat: (i+1) * 300 })),
    mount: Array.from({length: 12}, (_, i) => ({ name: "สัตว์ขี่ขั้น " + (i+1), price: Math.pow(i+1, 6) * 150, stat: (i+1) * 1000 })),
    acc: Array.from({length: 12}, (_, i) => ({ name: "เครื่องรางขั้น " + (i+1), price: Math.pow(i+1, 6) * 150, stat: (i+1) * 800 }))
};

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            let mult = p.level > 25 ? 0.2 : 1;
            p.exp += (5 * mult);
            p.gold += (Math.floor(p.level/2) + 10);
            p.atk = Math.floor((p.bAtk + (p.level * 100)) * Math.pow(1.15, p.level));
            p.def = Math.floor((p.bDef + (p.level * 50)) * Math.pow(1.12, p.level));
            if (p.exp >= 100) { p.level++; p.exp = 0; }
        }
    });
    io.emit("tick", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (save) => {
        players[socket.id] = save || { level: 1, exp: 0, gold: 500, bAtk: 10, bDef: 5, atk: 10, def: 5, isAuto: false };
        socket.emit("init", players[socket.id]);
    });
    socket.on("toggle", () => { if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto; });
    socket.on("buy", (d) => {
        let p = players[socket.id];
        let item = SHOP[d.cat][d.idx];
        if(p && p.gold >= item.price) {
            p.gold -= item.price;
            if(d.cat === 'weapon' || d.cat === 'mount') p.bAtk += item.stat;
            else p.bDef += item.stat;
            socket.emit("log", "บ่มเพาะสำเร็จ!");
        }
    });
    socket.on("gm", (c) => { if(c === "ARIYA_POWER") { players[socket.id].gold += 5000000; players[socket.id].level += 20; } });
    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>IMMORTAL ARIYA 8.0</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body { background: #000; color: #fff; font-family: 'Kanit', sans-serif; margin: 0; padding-bottom: 70px; }
        .container { padding: 15px; display: flex; flex-direction: column; align-items: center; }
        .card { background: rgba(255,255,255,0.05); border: 1px solid #d4af37; border-radius: 20px; padding: 20px; width: 90%; text-align: center; }
        .rank-name { font-size: 26px; font-weight: 700; color: #d4af37; text-shadow: 0 0 10px #d4af37; }
        .avatar-img { width: 150px; height: 150px; border-radius: 50%; border: 3px solid #d4af37; object-fit: cover; }
        .bar-bg { width: 100%; height: 12px; background: #222; border-radius: 6px; overflow: hidden; margin: 10px 0; }
        #bar-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #d4af37, #fff); transition: 0.3s; }
        .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; margin: 15px 0; }
        .stat-val { background: rgba(0,0,0,0.5); padding: 10px; border-radius: 10px; border: 1px solid #333; }
        .btn-action { background: #d4af37; color: #000; border: none; padding: 15px; border-radius: 50px; width: 100%; font-weight: 700; }
        .btn-active { background: #44ff44; box-shadow: 0 0 20px #44ff44; }
        .tab-box { display: none; width: 100%; margin-top: 20px; }
        .tab-active { display: block; }
        .item-list { height: 300px; overflow-y: scroll; background: #111; padding: 10px; border-radius: 10px; }
        .item-card { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding: 10px 0; }
        .nav { position: fixed; bottom: 0; width: 100%; background: #111; display: flex; border-top: 1px solid #d4af37; height: 65px; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; }
    </style>
</head>
<body>
    <audio id="bgm" loop src="https://www.chosic.com/wp-content/uploads/2021/07/The-Grand-Final-Epic-Modern-Chinese-Music.mp3"></audio>
    <div class="container">
        <div class="card">
            <div id="rank" class="rank-name" onclick="gm()">รวบรวมลมปราณ</div>
            <img id="avatar" class="avatar-img" src="">
            <div style="font-size:12px;">เลเวล <span id="lv">1</span> | <span id="exp-txt">0</span>%</div>
            <div class="bar-bg"><div id="bar-fill"></div></div>
            <div class="stats-row">
                <div class="stat-val">⚔️ ATK<br><b id="atk">0</b></div>
                <div class="stat-val">🛡️ DEF<br><b id="def">0</b></div>
                <div class="stat-val" style="grid-column: span 2;">💰 ทอง: <b id="gold">0</b></div>
            </div>
            <button id="btn" class="btn-action" onclick="toggle()">🧘 เริ่มบำเพ็ญ</button>
        </div>
        <div id="tab-shop" class="tab-box">
            <div style="display:flex; gap:5px; margin-bottom:10px;">
                <button onclick="renderShop('weapon')" style="flex:1;">ดาบ</button>
                <button onclick="renderShop('armor')" style="flex:1;">ชุด</button>
                <button onclick="renderShop('mount')" style="flex:1;">สัตว์</button>
                <button onclick="renderShop('acc')" style="flex:1;">เครื่องราง</button>
            </div>
            <div id="shop-list" class="item-list"></div>
        </div>
        <div id="tab-battle" class="tab-box tab-active" style="text-align:center; padding-top:20px;">
            <p id="log-txt" style="color:#888;">บำเพ็ญเพียรในที่สงัด...</p>
        </div>
    </div>
    <div class="nav">
        <div class="nav-item" onclick="switchTab('battle')">⚔️ บำเพ็ญ</div>
        <div class="nav-item" onclick="switchTab('shop')">💰 ร้านค้า</div>
        <div class="nav-item" onclick="document.getElementById('bgm').play()">🎵 เพลง</div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const evos = ${JSON.stringify(EVOLUTION)};
        const shopData = ${JSON.stringify(SHOP)};
        let gmC = 0;
        function toggle() { socket.emit('toggle'); document.getElementById('bgm').play().catch(()=>{}); }
        function gm() { gmC++; if(gmC >= 5) { let r = prompt("รหัสลับ:"); socket.emit('gm', r); gmC=0; } }
        function switchTab(t) {
            document.getElementById('tab-shop').classList.toggle('tab-active', t==='shop');
            document.getElementById('tab-battle').classList.toggle('tab-active', t==='battle');
        }
        function renderShop(cat) {
            const list = document.getElementById('shop-list');
            list.innerHTML = "";
            shopData[cat].forEach((it, i) => {
                list.innerHTML += '<div class="item-card"><span>' + it.name + '<br><small>💰 ' + it.price.toLocaleString() + '</small></span><button onclick="socket.emit(\\'buy\\',{cat:\\'' + cat + '\\',idx:' + i + '})">ซื้อ</button></div>';
            });
        }
        socket.on("init", p => update(p));
        socket.on("tick", data => { if(data[socket.id]) update(data[socket.id]); });
        socket.on("log", m => alert(m));
        function update(p) {
            document.getElementById('lv').innerText = p.level;
            document.getElementById('atk').innerText = p.atk.toLocaleString();
            document.getElementById('def').innerText = p.def.toLocaleString();
            document.getElementById('gold').innerText = p.gold.toLocaleString();
            document.getElementById('bar-fill').style.width = p.exp + "%";
            document.getElementById('exp-txt').innerText = Math.floor(p.exp);
            const rIdx = Math.min(Math.floor((p.level-1)/5), ranks.length-1);
            document.getElementById('rank').innerText = ranks[rIdx];
            document.getElementById('avatar').src = evos[rIdx].img;
            document.body.style.backgroundColor = evos[rIdx].bg;
            const btn = document.getElementById('btn');
            btn.innerText = p.isAuto ? "⚡ บำเพ็ญอยู่..." : "🧘 เริ่มบำเพ็ญ";
            btn.className = p.isAuto ? "btn-action btn-active" : "btn-action";
        }
        socket.emit('join', JSON.parse(localStorage.getItem('ariya_v8')));
        socket.on("tick", (data) => { if(data[socket.id]) localStorage.setItem('ariya_v8', JSON.stringify(data[socket.id])); });
        renderShop('weapon');
    </script>
</body>
</html>
    `);
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("System 8.0 Masterpiece Live!"));

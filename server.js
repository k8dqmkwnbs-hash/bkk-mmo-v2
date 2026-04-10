const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
const SUB_RANKS = ["ขั้นต่ำ", "ขั้นกลาง", "ขั้นสูง", "ขั้นสมบูรณ์"];

const EVOLUTION = [
    { img: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400", bg: "linear-gradient(135deg, #1a1a1a, #2c3e50)" },
    { img: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=400", bg: "linear-gradient(135deg, #1e3c72, #2a5298)" },
    { img: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=400", bg: "linear-gradient(135deg, #2b5876, #4e4376)" },
    { img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400", bg: "linear-gradient(135deg, #4b1248, #f0c27b)" },
    { img: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?q=80&w=400", bg: "linear-gradient(135deg, #000428, #004e92)" },
    { img: "https://images.unsplash.com/photo-1605142859862-978be7eba909?q=80&w=400", bg: "linear-gradient(135deg, #870000, #190a05)" },
    { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400", bg: "linear-gradient(135deg, #f7971e, #ffd200)" },
    { img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400", bg: "linear-gradient(135deg, #41295a, #2f0743)" },
    { img: "https://images.unsplash.com/photo-1634157703702-3c124b455499?q=80&w=400", bg: "radial-gradient(circle, #000000 0%, #d4af37 100%)" }
];

const SHOP = {
    weapon: Array.from({length: 12}, (_, i) => ({ name: "ศาสตราเทพขั้น " + (i+1), price: Math.pow(i+1, 6) * 300, atk: (i+1) * 8000 })),
    armor: Array.from({length: 12}, (_, i) => ({ name: "เกราะอมตะขั้น " + (i+1), price: Math.pow(i+1, 6) * 300, def: (i+1) * 5000 })),
    soul: Array.from({length: 12}, (_, i) => ({ name: "แก่นปราณขั้น " + (i+1), price: Math.pow(i+1, 7) * 400, mag: (i+1) * 12000 })),
    speed: Array.from({length: 12}, (_, i) => ({ name: "ก้าวย่างไร้รอยขั้น " + (i+1), price: Math.pow(i+1, 7) * 400, spd: (i+1) * 2000 }))
};

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            let rIdx = Math.floor((p.level-1)/10);
            
            // ระบบอายุขัย: เพิ่มตามความแกร่ง (1 หมื่นปีคือเป้าหมาย)
            p.ageCounter = (p.ageCounter || 0) + 1;
            if(p.ageCounter >= 5) { // ปรับให้เพิ่มเร็วขึ้นนิดนึงตามพลัง
                if(p.age < 10000) p.age++; 
                p.ageCounter = 0; 
            }

            // ระบบทะลวงขั้น
            let isStuck = (p.level % 10 === 0 && !p.canBreak);
            if (!isStuck) {
                p.exp += (3 / (Math.floor(p.level/5)+1));
                if (p.exp >= 100) { 
                    if ((p.level + 1) % 10 === 0) { p.canBreak = true; }
                    p.level++; 
                    p.exp = 0; 
                }
            }

            // พลังทวีคูณตาม "อายุบำเพ็ญ" และ "ระดับ"
            let ageBonus = 1 + (p.age / 1000); 
            let scale = Math.pow(2.8, rIdx);
            p.atk = Math.floor((p.bAtk + (p.level * 1500)) * scale * ageBonus);
            p.def = Math.floor((p.bDef + (p.level * 800)) * scale * ageBonus);
            p.mag = Math.floor((p.bMag + (p.level * 2500)) * scale * ageBonus);
            p.spd = Math.floor((p.bSpd + (p.level * 300)) * scale * ageBonus);

            // เงินเด้งตามความเก๋า (อายุเยอะ เงินยิ่งไหล)
            p.gold += (p.age * 200) * (rIdx + 1);
            
            p.monHp -= (p.atk / 15);
            if(p.monHp <= 0) { 
                p.gold += (p.level * 10000); 
                p.monHp = 15000 * Math.pow(2, rIdx); 
            }
        }
    });
    io.emit("tick", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (save) => {
        players[socket.id] = save || { level: 1, exp: 0, gold: 10000, age: 12, ageCounter: 0, bAtk: 2000, bDef: 1000, bMag: 3000, bSpd: 500, isAuto: false, monHp: 15000, canBreak: false };
        socket.emit("init", players[socket.id]);
    });
    socket.on("toggle", () => { if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto; });
    socket.on("breakthrough", () => {
        let p = players[socket.id];
        if(p && p.canBreak) { p.canBreak = false; p.level++; socket.emit("log", "🌌 บรรลุขอบเขตมหาเทพหมื่นปี!"); }
    });
    socket.on("buy", (d) => {
        let p = players[socket.id];
        let item = SHOP[d.cat][d.idx];
        if(p && p.gold >= item.price) {
            p.gold -= item.price;
            if(d.cat === 'weapon') p.bAtk += item.atk;
            else if(d.cat === 'armor') p.bDef += item.def;
            else if(d.cat === 'soul') p.bMag += item.mag;
            else p.bSpd += item.spd;
            socket.emit("log", "ครอบครอง " + item.name + "!");
        }
    });
    socket.on("gm", (c) => { 
        if(c === "ARIYA_GOLD") players[socket.id].gold += 5000000000;
        if(c === "ARIYA_AGE") players[socket.id].age = 9999; 
    });
    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>IMMORTAL ARIYA: 10,000 YEARS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body { background: #000; color: #fff; font-family: 'Kanit', sans-serif; margin: 0; transition: 1.5s; overflow-x: hidden; }
        .container { padding: 15px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        .card { background: rgba(0,0,0,0.8); border: 2px solid #d4af37; border-radius: 25px; padding: 25px; width: 90%; text-align: center; box-shadow: 0 0 60px rgba(212,175,55,0.25); position: relative; }
        .age-badge { background: #d4af37; color: #000; padding: 5px 15px; border-radius: 20px; font-weight: 700; position: absolute; top: -15px; left: 50%; transform: translateX(-50%); font-size: 14px; box-shadow: 0 0 15px #d4af37; }
        .rank-name { font-size: 28px; font-weight: 700; color: #ffd700; text-shadow: 0 0 15px #ffd700; }
        .avatar-img { width: 180px; height: 180px; border-radius: 50%; border: 4px solid #ffd700; object-fit: cover; margin: 15px 0; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .bar-bg { width: 100%; height: 14px; background: #222; border-radius: 7px; margin: 10px 0; overflow: hidden; border: 1px solid #444; }
        #bar-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #ffd700, #fff); transition: 0.8s; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; margin: 20px 0; }
        .stat-card { background: rgba(255,255,255,0.07); padding: 12px; border-radius: 12px; border: 1px solid #333; font-size: 13px; }
        .btn-action { background: linear-gradient(to bottom, #ffd700, #b8860b); color: #000; border: none; padding: 18px; border-radius: 50px; width: 100%; font-weight: 700; font-size: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
        .btn-break { background: linear-gradient(to bottom, #ff0000, #440000); color: #fff; border: 2px solid #fff; margin-bottom: 15px; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .nav { position: fixed; bottom: 0; width: 100%; background: #111; display: flex; border-top: 1px solid #d4af37; height: 75px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; color: #666; }
        .nav-active { color: #ffd700; }
        .item-list { height: 400px; overflow-y: scroll; background: #000; padding: 15px; border-radius: 15px; border: 1px solid #d4af37; }
        .item-card { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #222; }
    </style>
</head>
<body id="master-body">
    <audio id="bgm" loop src="https://www.chosic.com/wp-content/uploads/2021/07/The-Grand-Final-Epic-Modern-Chinese-Music.mp3"></audio>
    <div class="container">
        <div class="card">
            <div class="age-badge">ปีบำเพ็ญ: <span id="age">12</span> / 10,000 ปี</div>
            <div id="rank" class="rank-name" onclick="gm()">รวบรวมลมปราณ</div>
            <div id="sub-rank" style="color:#aaa;">ขั้นต่ำ</div>
            <img id="avatar" class="avatar-img" src="">
            <div style="font-size:13px; color:#ffd700;">ฐานเลเวล: <span id="lv">1</span> | ความสว่างไสว: <span id="exp-txt">0</span>%</div>
            <div class="bar-bg"><div id="bar-fill"></div></div>
            
            <div class="stats-grid">
                <div class="stat-card">⚔️ ATK: <br><b id="atk">0</b></div>
                <div class="stat-card">🛡️ DEF: <br><b id="def">0</b></div>
                <div class="stat-card">✨ MAG: <br><b id="mag">0</b></div>
                <div class="stat-card">⚡ SPD: <br><b id="spd">0</b></div>
                <div class="stat-card" style="grid-column: span 2; color:#ffd700;">💰 สมบัติสวรรค์: <b id="gold">0</b></div>
            </div>
            
            <button id="btn-break" class="btn-action btn-break" style="display:none;" onclick="socket.emit('breakthrough')">💠 ทะลวงขั้นมหาเทพหมื่นปี</button>
            <button id="btn-main" class="btn-action" onclick="toggle()">🧘 เข้าสู่ญาณสมาธิ</button>
        </div>

        <div id="tab-shop" style="display:none; width:100%; margin-top:20px;">
            <div id="shop-list" class="item-list"></div>
        </div>
    </div>

    <div class="nav">
        <div class="nav-item nav-active" onclick="switchTab('battle')">🏯 อาราม</div>
        <div class="nav-item" onclick="switchTab('shop')">💎 หอสมบัติ</div>
        <div class="nav-item" onclick="document.getElementById('bgm').play()">🎵 บรรเลง</div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const subRanks = ${SUB_RANKS.map(s => `'${s}'`).join(',')};
        const evos = ${JSON.stringify(EVOLUTION)};
        const shopData = ${JSON.stringify(SHOP)};
        let gmC = 0;

        function toggle() { socket.emit('toggle'); document.getElementById('bgm').play().catch(()=>{}); }
        function gm() { gmC++; if(gmC >= 5) { let r = prompt("รหัส GM:"); socket.emit('gm', r); gmC=0; } }
        function switchTab(t) {
            document.getElementById('tab-shop').style.display = t==='shop' ? 'block' : 'none';
            if(t==='shop') renderShop('weapon');
        }

        function renderShop(cat) {
            const list = document.getElementById('shop-list');
            list.innerHTML = \`<div style="display:flex; gap:10px; margin-bottom:15px;">
                <button onclick="renderShop('weapon')" style="flex:1; padding:10px; border-radius:10px; background:#222; color:#fff; border:1px solid #d4af37;">ศาสตรา</button>
                <button onclick="renderShop('armor')" style="flex:1; padding:10px; border-radius:10px; background:#222; color:#fff; border:1px solid #d4af37;">พัสตรา</button>
            </div>\`;
            shopData[cat].forEach((it, i) => {
                list.innerHTML += \`<div class="item-card">
                    <span>\${it.name}<br><small style="color:#ffd700;">💰 \${it.price.toLocaleString()}</small></span>
                    <button style="background:#d4af37; border:none; padding:8px 15px; border-radius:8px; font-weight:700;" onclick="socket.emit('buy',{cat:'\${cat}',idx:\${i}})">แลกรับ</button>
                </div>\`;
            });
        }

        socket.on("tick", data => { if(data[socket.id]) update(data[socket.id]); });
        socket.on("log", m => alert(m));

        function update(p) {
            document.getElementById('lv').innerText = p.level;
            document.getElementById('age').innerText = p.age.toLocaleString();
            document.getElementById('atk').innerText = p.atk.toLocaleString();
            document.getElementById('def').innerText = p.def.toLocaleString();
            document.getElementById('mag').innerText = p.mag.toLocaleString();
            document.getElementById('spd').innerText = p.spd.toLocaleString();
            document.getElementById('gold').innerText = p.gold.toLocaleString();
            document.getElementById('bar-fill').style.width = p.exp + "%";
            document.getElementById('exp-txt').innerText = Math.floor(p.exp);
            
            const rIdx = Math.min(Math.floor((p.level-1)/10), ranks.length-1);
            const sIdx = Math.min(Math.floor(((p.level-1) % 10) / 2.5), 3);
            const subNames = ['ขั้นต่ำ', 'ขั้นกลาง', 'ขั้นสูง', 'ขั้นสมบูรณ์'];
            
            document.getElementById('rank').innerText = ranks[rIdx];
            document.getElementById('sub-rank').innerText = subNames[sIdx];
            document.getElementById('avatar').src = evos[rIdx].img;
            document.getElementById('master-body').style.background = evos[rIdx].bg;

            document.getElementById('btn-break').style.display = p.canBreak ? 'block' : 'none';
            document.getElementById('btn-main').innerText = p.isAuto ? "✨ วิญญาณหลอมรวมสวรรค์..." : "🧘 เข้าสู่ญาณสมาธิ";
        }
        
        socket.emit('join', JSON.parse(localStorage.getItem('ariya_v12')));
        socket.on("tick", (data) => { if(data[socket.id]) localStorage.setItem('ariya_v12', JSON.stringify(data[socket.id])); });
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("System 12.0 Eternal Life Live!"));

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
const REALMS = [
    { name: "Aetheria (แดนแสง)", q: "ตามหาผลึกเสียงสวรรค์", c: "#ffd700" },
    { name: "Void Abyss (แดนทมิฬ)", q: "ปราบขุนพลเงา", c: "#4b0082" },
    { name: "Neon Chronos (โลกอนาคต)", q: "ไขปริศนาไซเบอร์", c: "#00f2ff" }
];

const SHOP = {
    weapon: [{ n: "ดาบสะบั้นดารา", p: 500000, v: 50000 }, { n: "ทวนมังกรฟ้า", p: 2000000, v: 150000 }],
    armor: [{ n: "เกราะฟีนิกซ์", p: 450000, v: 30000 }, { n: "เกราะเทพสงคราม", p: 1800000, v: 120000 }],
    soul: [{ n: "แก่นปราณนิรันดร์", p: 5000000, v: 300000 }, { n: "ยาพระเจ้า", p: 100000, v: 5000 }]
};

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            p.age = Math.min(10000, (p.age || 12) + 1);
            p.exp += (15 / (Math.floor(p.level/5)+1));
            if (p.exp >= 100) { p.level++; p.exp = 0; }
            let rIdx = Math.min(Math.floor((p.level-1)/10), RANKS.length-1);
            let mIdx = p.level % 3;
            p.realm = REALMS[mIdx].name;
            p.quest = REALMS[mIdx].q;
            p.atk = (p.bAtk + (p.level * 2000)) * (rIdx + 1);
            p.def = (p.bDef + (p.level * 1000)) * (rIdx + 1);
            p.mag = (p.bMag + (p.level * 3000)) * (rIdx + 1);
            p.spd = (p.bSpd + (p.level * 500)) * (rIdx + 1);
            p.gold += (p.level * 1500);
        }
    });
    io.emit("tick", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (s) => {
        players[socket.id] = s || { level: 1, exp: 0, gold: 50000, age: 12, bAtk: 5000, bDef: 2000, bMag: 8000, bSpd: 1000, isAuto: false };
        socket.emit("init", players[socket.id]);
    });
    socket.on("toggle", () => { if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto; });
    socket.on("buy", (d) => {
        let p = players[socket.id]; let it = SHOP[d.c][d.i];
        if(p && p.gold >= it.p) {
            p.gold -= it.p;
            if(d.c === 'weapon') p.bAtk += it.v;
            else if(d.c === 'armor') p.bDef += it.v;
            else { p.bMag += it.v; p.bSpd += (it.v/10); }
        }
    });
    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(\`
<!DOCTYPE html>
<html>
<head>
    <title>ARIYA AI IMMORTAL v14.0</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: 'Kanit', sans-serif; background: #000; }
        .bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: url('http://googleusercontent.com/generated_image_content/0') center/cover; z-index: -1; transform: scale(1.1); filter: brightness(0.6); }
        .content { position: relative; z-index: 10; height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; box-sizing: border-box; color: #fff; }
        .card { background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); border: 2px solid #ffd700; border-radius: 20px; padding: 20px; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 0 30px rgba(255,215,0,0.3); }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 15px 0; font-size: 13px; }
        .st-box { background: rgba(255,255,255,0.1); padding: 8px; border-radius: 10px; border-left: 3px solid #ffd700; }
        .nav { position: fixed; bottom: 0; width: 100%; display: flex; background: rgba(0,0,0,0.9); border-top: 1px solid #ffd700; height: 70px; }
        .nav-i { flex: 1; display: flex; align-items: center; justify-content: center; color: #666; cursor: pointer; }
        .active { color: #ffd700; font-weight: 700; }
        .btn { background: linear-gradient(45deg, #d4af37, #f9d976); color: #000; border: none; padding: 12px; border-radius: 10px; width: 100%; font-weight: 700; cursor: pointer; }
        .shop-it { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #333; font-size: 14px; }
    </style>
</head>
<body>
    <div class="bg"></div>
    <div class="content">
        <div id="t-status" class="card">
            <div style="color:#ffd700; font-size:12px;">ปีบำเพ็ญ: <span id="age">12</span> / 10,000</div>
            <div id="realm" style="font-size:10px; opacity:0.7">มิติ: ...</div>
            <h2 id="rank" style="color:#ffd700; margin:10px 0;">รวบรวมลมปราณ</h2>
            <div style="background:rgba(212,175,55,0.2); padding:5px; border-radius:5px; font-size:11px; margin-bottom:10px;">📜 <span id="quest">...</span></div>
            <div style="font-size:11px">เลเวล <span id="lv">1</span> | <span id="exp">0</span>%</div>
            <div style="width:100%; height:6px; background:#333; margin:8px 0; border-radius:3px; overflow:hidden;"><div id="bar" style="height:100%; background:#ffd700; width:0%"></div></div>
            <div class="stats">
                <div class="st-box">⚔️ ATK: <b id="atk">0</b></div>
                <div class="st-box">🛡️ DEF: <b id="def">0</b></div>
                <div class="st-box">✨ MAG: <b id="mag">0</b></div>
                <div class="st-box">⚡ SPD: <b id="spd">0</b></div>
            </div>
            <div style="color:#ffd700; font-size:18px; margin-bottom:10px;">💰 ทอง: <span id="gold">0</span></div>
            <button class="btn" onclick="socket.emit('toggle')">🧘 บำเพ็ญเพียร</button>
        </div>

        <div id="t-shop" class="card" style="display:none">
            <h3 style="color:#ffd700">💎 หอสมบัติมิติ</h3>
            <div id="shop-c" style="height:280px; overflow-y:auto; text-align:left"></div>
        </div>
    </div>

    <div class="nav">
        <div id="n1" class="nav-i active" onclick="show('status')">🏯 สถานะ</div>
        <div id="n2" class="nav-i" onclick="show('shop')">🛒 ร้านค้า</div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const shop = ${JSON.stringify(SHOP)};
        function show(t) {
            document.getElementById('t-status').style.display = t==='status'?'block':'none';
            document.getElementById('t-shop').style.display = t==='shop'?'block':'none';
            document.getElementById('n1').className = t==='status'?'nav-i active':'nav-i';
            document.getElementById('n2').className = t==='shop'?'nav-i active':'nav-i';
            if(t==='shop') render();
        }
        function render() {
            let h = '';
            for(let c in shop) {
                shop[c].forEach((it, i) => {
                    h += \`<div class="shop-it"><span>\${it.n}<br><small style="color:#ffd700">\${it.p.toLocaleString()} ทอง</small></span>
                    <button onclick="socket.emit('buy',{c:'\${c}',i:\${i}})" style="background:#ffd700; border:none; border-radius:5px; padding:5px 10px;">ซื้อ</button></div>\`;
                });
            }
            document.getElementById('shop-c').innerHTML = h;
        }
        socket.on("tick", data => {
            const p = data[socket.id]; if(!p) return;
            document.getElementById('age').innerText = p.age.toLocaleString();
            document.getElementById('lv').innerText = p.level;
            document.getElementById('exp').innerText = Math.floor(p.exp);
            document.getElementById('bar').style.width = p.exp + "%";
            document.getElementById('atk').innerText = p.atk.toLocaleString();
            document.getElementById('def').innerText = p.def.toLocaleString();
            document.getElementById('mag').innerText = p.mag.toLocaleString();
            document.getElementById('spd').innerText = p.spd.toLocaleString();
            document.getElementById('gold').innerText = p.gold.toLocaleString();
            document.getElementById('realm').innerText = "มิติ: " + p.realm;
            document.getElementById('quest').innerText = p.quest;
            const rIdx = Math.min(Math.floor((p.level-1)/10), ranks.length-1);
            document.getElementById('rank').innerText = ranks[rIdx];
            localStorage.setItem('ariya_save', JSON.stringify(p));
        });
        socket.emit('join', JSON.parse(localStorage.getItem('ariya_save')));
    </script>
</body>
</html>
    \`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("v14.0 Ready"));

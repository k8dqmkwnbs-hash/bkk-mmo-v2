const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
const REALMS = [
    { n: "Aetheria", q: "ตามหาผลึกเสียงสวรรค์", bg: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200" },
    { n: "Void Abyss", q: "ปราบขุนพลเงา", bg: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1200" },
    { n: "Neon Chronos", q: "ไขปริศนาไซเบอร์", bg: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=1200" }
];

const SHOP = {
    weapon: [{ n: "ดาบสะบั้นดารา", p: 50000, v: 5000 }, { n: "ทวนมังกรฟ้า", p: 250000, v: 20000 }],
    armor: [{ n: "เกราะฟีนิกซ์", p: 40000, v: 3000 }, { n: "เกราะเทพสงคราม", p: 200000, v: 15000 }]
};

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            p.age = Math.min(10000, (p.age || 12) + 1);
            p.exp = (p.exp || 0) + (10 / (Math.floor(p.level/5)+1));
            if (p.exp >= 100) { p.level++; p.exp = 0; }
            let rIdx = Math.min(Math.floor((p.level-1)/10), RANKS.length-1);
            let mIdx = p.level % 3;
            p.realm = REALMS[mIdx].n;
            p.quest = REALMS[mIdx].q;
            p.bg = REALMS[mIdx].bg;
            p.atk = (p.bAtk + (p.level * 1000)) * (rIdx + 1);
            p.def = (p.bDef + (p.level * 500)) * (rIdx + 1);
            p.gold += (p.level * 500); // ปรับเงินให้ขึ้นสมดุล ไม่เร็วเกินไป
        }
    });
    io.emit("tick", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (s) => {
        players[socket.id] = s || { level: 1, exp: 0, gold: 5000, age: 12, bAtk: 1000, bDef: 500, isAuto: false };
        socket.emit("init", players[socket.id]);
    });
    socket.on("toggle", () => { if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto; });
    socket.on("buy", (d) => {
        let p = players[socket.id]; let it = SHOP[d.c][d.i];
        if(p && p.gold >= it.p) {
            p.gold -= it.p;
            if(d.c === 'weapon') p.bAtk += it.v;
            else p.bDef += it.v;
        }
    });
    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ARIYA v16.0 ETERNAL</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body, html { margin:0; padding:0; height:100%; overflow:hidden; font-family:'Kanit'; background:#000; color:#fff; }
        .bg-layer { position:fixed; top:0; left:0; width:100%; height:100%; background-size:cover; background-position:center; z-index:-1; transition:2s; filter:brightness(0.4); }
        .container { position:relative; z-index:10; height:100vh; display:flex; flex-direction:column; justify-content:space-between; padding:20px; box-sizing:border-box; }
        .glass-box { background:rgba(0,0,0,0.8); border:1px solid #ffd700; border-radius:15px; padding:15px; text-align:center; box-shadow:0 0 15px rgba(255,215,0,0.2); }
        .stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0; }
        .stat-val { background:rgba(255,255,255,0.05); padding:5px; border-radius:5px; border-left:2px solid #ffd700; font-size:14px; }
        .bottom-nav { display:flex; gap:10px; padding-bottom:10px; }
        .nav-btn { flex:1; padding:12px; background:rgba(0,0,0,0.9); border:1px solid #ffd700; color:#fff; border-radius:10px; cursor:pointer; text-align:center; }
        .nav-btn.active { background:#ffd700; color:#000; font-weight:700; }
        .btn-action { background:#ffd700; color:#000; border:none; padding:12px; border-radius:10px; width:100%; font-weight:700; margin-top:10px; }
        .scroll-area { height:300px; overflow-y:auto; margin-top:10px; }
        .shop-row { display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #222; }
    </style>
</head>
<body>
    <div id="bg" class="bg-layer"></div>
    <div class="container">
        <div id="view-status" class="glass-box">
            <div style="font-size:12px; color:#ffd700">อายุบำเพ็ญ: <span id="age">12</span> ปี</div>
            <h2 id="rank" style="margin:5px 0; color:#ffd700">รวบรวมลมปราณ</h2>
            <div id="quest-tag" style="font-size:11px; color:#aaa; margin-bottom:10px;">มิติ: ... | ภารกิจ: ...</div>
            <div style="font-size:12px">เลเวล <span id="lv">1</span> | เสถียรภาพ <span id="exp">0</span>%</div>
            <div style="width:100%; height:4px; background:#222; margin:5px 0;"><div id="bar" style="height:100%; background:#ffd700; width:0%"></div></div>
            <div class="stats-grid">
                <div class="stat-val">⚔️ ATK: <b id="atk">0</b></div>
                <div class="stat-val">🛡️ DEF: <b id="def">0</b></div>
            </div>
            <div style="font-size:18px; color:#ffd700; margin:10px 0;">💰 ทอง: <span id="gold">0</span></div>
            <button class="btn-action" onclick="socket.emit('toggle')">🧘 เริ่ม/หยุด บำเพ็ญเพียร</button>
        </div>

        <div id="view-shop" class="glass-box" style="display:none">
            <h3 style="margin:0 0 10px 0; color:#ffd700">🛒 หอสมบัติมิติ</h3>
            <div id="shop-list" class="scroll-area"></div>
        </div>

        <div class="bottom-nav">
            <div id="n1" class="nav-btn active" onclick="changeTab('status')">🏯 สถานะ</div>
            <div id="n2" class="nav-btn" onclick="changeTab('shop')">💰 ร้านค้า</div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const shopData = ${JSON.stringify(SHOP)};

        function changeTab(t) {
            document.getElementById('view-status').style.display = t==='status'?'block':'none';
            document.getElementById('view-shop').style.display = t==='shop'?'block':'none';
            document.getElementById('n1').className = t==='status'?'nav-btn active':'nav-btn';
            document.getElementById('n2').className = t==='shop'?'nav-btn active':'nav-btn';
            if(t==='shop') renderShop();
        }

        function renderShop() {
            let h = '';
            for(let cat in shopData) {
                shopData[cat].forEach((it, i) => {
                    h += \`<div class="shop-row">
                        <div style="text-align:left">\${it.n}<br><small style="color:#ffd700">\${it.p.toLocaleString()} ทอง</small></div>
                        <button onclick="socket.emit('buy',{c:'\${cat}',i:\${i}})" style="background:#ffd700; border:none; padding:5px 10px; border-radius:5px;">ซื้อ</button>
                    </div>\`;
                });
            }
            document.getElementById('shop-list').innerHTML = h;
        }

        socket.on("tick", data => {
            const p = data[socket.id]; if(!p) return;
            document.getElementById('age').innerText = p.age.toLocaleString();
            document.getElementById('lv').innerText = p.level;
            document.getElementById('exp').innerText = Math.floor(p.exp);
            document.getElementById('bar').style.width = p.exp + "%";
            document.getElementById('atk').innerText = p.atk.toLocaleString();
            document.getElementById('def').innerText = p.def.toLocaleString();
            document.getElementById('gold').innerText = p.gold.toLocaleString();
            document.getElementById('rank').innerText = ranks[Math.min(Math.floor((p.level-1)/10), ranks.length-1)];
            document.getElementById('quest-tag').innerText = "มิติ: " + p.realm + " | ภารกิจ: " + p.quest;
            document.getElementById('bg').style.backgroundImage = "url('" + p.bg + "')";
            localStorage.setItem('ariya_v16', JSON.stringify(p));
        });
        socket.emit('join', JSON.parse(localStorage.getItem('ariya_v16')));
    </script>
</body>
</html>
    `);
});

server.listen(process.env.PORT || 3000);

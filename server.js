const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
const REALMS = [{ n: "Aetheria", q: "ตามหาผลึกเสียงสวรรค์" }, { n: "Void Abyss", q: "ปราบขุนพลเงา" }, { n: "Neon Chronos", q: "ไขปริศนาไซเบอร์" }];
const SHOP = {
    weapon: [{ n: "ดาบสะบั้นดารา", p: 100000, v: 50000 }, { n: "ทวนมังกรฟ้า", p: 500000, v: 150000 }],
    armor: [{ n: "เกราะฟีนิกซ์", p: 80000, v: 30000 }, { n: "ชุดเกราะเทพ", p: 400000, v: 120000 }]
};

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            p.age = Math.min(10000, (p.age || 12) + 1);
            p.exp += (20 / (Math.floor(p.level/5)+1));
            if (p.exp >= 100) { p.level++; p.exp = 0; }
            let rIdx = Math.min(Math.floor((p.level-1)/10), RANKS.length-1);
            p.realm = REALMS[p.level % 3].n;
            p.quest = REALMS[p.level % 3].q;
            p.atk = (p.bAtk + (p.level * 2500)) * (rIdx + 1);
            p.def = (p.bDef + (p.level * 1200)) * (rIdx + 1);
            p.gold += (p.level * 2000);
        }
    });
    io.emit("tick", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (s) => {
        players[socket.id] = s || { level: 1, exp: 0, gold: 10000, age: 12, bAtk: 5000, bDef: 2000, isAuto: false };
        socket.emit("init", players[socket.id]);
    });
    socket.on("toggle", () => { if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto; });
    socket.on("buy", (d) => {
        let p = players[socket.id]; let it = SHOP[d.c][d.i];
        if(p && p.gold >= it.p) { p.gold -= it.p; if(d.c === 'weapon') p.bAtk += it.v; else p.bDef += it.v; }
    });
    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ARIYA GOD MODE v15.0</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body, html { margin:0; padding:0; height:100%; overflow:hidden; font-family:'Kanit'; background:#000; }
        .bg { position:fixed; width:100%; height:100%; background:url('https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1200') center/cover; z-index:-1; filter:brightness(0.5); }
        .main { position:relative; z-index:10; height:100vh; display:flex; flex-direction:column; align-items:center; padding:20px; box-sizing:border-box; color:#fff; }
        .card { background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); border:2px solid #ffd700; border-radius:20px; padding:20px; width:100%; max-width:400px; text-align:center; }
        .stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:15px 0; }
        .nav { position:fixed; bottom:0; width:100%; display:flex; background:#000; border-top:1px solid #ffd700; height:60px; }
        .nav-btn { flex:1; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#666; }
        .active { color:#ffd700; font-weight:700; }
        .btn { background:#ffd700; color:#000; border:none; padding:12px; border-radius:10px; width:100%; font-weight:700; cursor:pointer; }
    </style>
</head>
<body>
    <div class="bg"></div>
    <div class="main">
        <div id="p-status" class="card">
            <div style="color:#ffd700; font-size:12px;">อายุ: <span id="age">12</span> / 10,000 ปี</div>
            <h2 id="rank" style="color:#ffd700; margin:10px 0;">รวบรวมลมปราณ</h2>
            <div style="background:rgba(255,215,0,0.2); padding:5px; border-radius:5px; font-size:12px; margin-bottom:10px;">📜 <span id="quest">...</span></div>
            <div class="stats">
                <div style="border-left:3px solid #ffd700; padding:5px;">⚔️ ATK: <br><b id="atk">0</b></div>
                <div style="border-left:3px solid #ffd700; padding:5px;">🛡️ DEF: <br><b id="def">0</b></div>
            </div>
            <div style="color:#ffd700; font-size:20px; margin-bottom:15px;">💰 ทอง: <span id="gold">0</span></div>
            <button class="btn" onclick="socket.emit('toggle')">🧘 เริ่มบำเพ็ญเพียร (BGM On)</button>
        </div>
        <div id="p-shop" class="card" style="display:none">
            <h3 style="color:#ffd700">🛒 หอสมบัติมิติ</h3>
            <div id="shop-c" style="height:300px; overflow-y:auto; text-align:left"></div>
        </div>
    </div>
    <div class="nav">
        <div id="b1" class="nav-btn active" onclick="show('status')">🏯 สถานะ</div>
        <div id="b2" class="nav-btn" onclick="show('shop')">🛒 ร้านค้า</div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        const shop = ${JSON.stringify(SHOP)};
        function show(t) {
            document.getElementById('p-status').style.display = t==='status'?'block':'none';
            document.getElementById('p-shop').style.display = t==='shop'?'block':'none';
            document.getElementById('b1').className = t==='status'?'nav-btn active':'nav-btn';
            document.getElementById('b2').className = t==='shop'?'nav-btn active':'nav-btn';
            if(t==='shop') render();
        }
        function render() {
            let h = ''; for(let c in shop) {
                shop[c].forEach((it, i) => {
                    h += '<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333;">' +
                    '<span>'+it.n+'<br><small style="color:#ffd700">'+it.p.toLocaleString()+' ทอง</small></span>' +
                    '<button onclick="socket.emit(\\'buy\\',{c:\\''+c+'\\',i:'+i+'})" style="background:#ffd700; border:none; border-radius:5px; padding:5px 10px;">ซื้อ</button></div>';
                });
            } document.getElementById('shop-c').innerHTML = h;
        }
        socket.on("tick", data => {
            const p = data[socket.id]; if(!p) return;
            document.getElementById('age').innerText = p.age.toLocaleString();
            document.getElementById('atk').innerText = p.atk.toLocaleString();
            document.getElementById('def').innerText = p.def.toLocaleString();
            document.getElementById('gold').innerText = p.gold.toLocaleString();
            document.getElementById('quest').innerText = p.realm + ": " + p.quest;
            document.getElementById('rank').innerText = ranks[Math.min(Math.floor((p.level-1)/10), ranks.length-1)];
            localStorage.setItem('ariya_god', JSON.stringify(p));
        });
        socket.emit('join', JSON.parse(localStorage.getItem('ariya_god')));
    </script>
</body>
</html>
    `);
});

server.listen(process.env.PORT || 3000);

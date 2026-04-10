const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];

// ⚔️ ฟังก์ชันสร้างไอเทม 12 ชิ้นต่อหมวด (8 ปกติ + 4 หายาก)
function generateItems(category, baseStat) {
    let items = [];
    for(let i=1; i<=12; i++) {
        let isRare = i > 8;
        items.push({
            name: (isRare ? "⭐ " : "") + category + " ขั้นที่ " + i,
            price: isRare ? Math.pow(i, 5) * 50 : i * i * 150,
            stat: isRare ? i * i * 50 : i * 15,
            type: baseStat,
            rare: isRare
        });
    }
    return items;
}

const ALL_ITEMS = {
    weapon: generateItems("อาวุธเทพ", "atk"),
    armor: generateItems("ชุดเซียน", "def"),
    mount: generateItems("สัตว์เทพ", "atk"),
    accessory: generateItems("เครื่องราง", "def")
};

let players = {};

setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.location !== "home") {
            // 📈 สูตร EXP: เกินขั้น 5 (Level 25) จะขึ้นยากขึ้น 5 เท่า
            let difficulty = p.level > 25 ? 5 : 1;
            p.exp += (10 / difficulty); 
            p.gold += (5 + Math.floor(p.level/2));
            
            if (p.exp >= 100) { 
                p.level++; 
                p.exp = 0; 
                io.to(id).emit("log", "✨ บรรลุเลเวล " + p.level + "!");
            }
        }
    });
    io.emit("update_all", players);
}, 2000);

io.on("connection", (socket) => {
    socket.on("join", (save) => {
        players[socket.id] = save || { level: 1, exp: 0, gold: 100, atk: 10, def: 10, location: "home", gear: [] };
        socket.emit("update_client", players[socket.id]);
    });

    socket.on("travel", (loc) => { if(players[socket.id]) players[socket.id].location = loc; });

    socket.on("buy", (data) => {
        let p = players[socket.id];
        let item = ALL_ITEMS[data.cat][data.idx];
        if(p && p.gold >= item.price) {
            p.gold -= item.price;
            p[item.type] += item.stat;
            p.gear.push(item.name);
            socket.emit("update_client", p);
            socket.emit("log", "✅ ได้รับ " + item.name);
        } else { socket.emit("log", "❌ ทองไม่พอ!"); }
    });

    socket.on("gm_power", () => {
        let p = players[socket.id];
        if(p) { p.gold += 1000000; p.level += 20; socket.emit("update_client", p); }
    });

    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ARIYA IMMORTAL v4.0</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { background: #000; color: #d4af37; font-family: 'Tahoma'; text-align: center; margin: 0; }
        .screen { display: none; padding: 15px; flex-direction: column; align-items: center; }
        .active { display: flex; }
        .btn { background: #d4af37; color: #000; border: none; padding: 12px; margin: 5px; cursor: pointer; border-radius: 5px; font-weight: bold; width: 90%; }
        .rare { background: linear-gradient(90deg, #ff00ff, #d4af37) !important; color: #fff !important; border: 2px solid #fff; }
        .bar { width: 280px; height: 15px; background: #222; border: 1px solid #d4af37; border-radius: 10px; overflow: hidden; margin: 10px; }
        #exp-fill { background: #d4af37; height: 100%; width: 0%; transition: 0.5s; box-shadow: 0 0 10px #d4af37; }
        .item-list { width: 100%; height: 60vh; overflow-y: scroll; border: 1px solid #333; margin-top: 10px; }
        .card { background: #111; border-bottom: 1px solid #333; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
        .tab-btn { background: #222; color: #d4af37; border: 1px solid #d4af37; padding: 5px; font-size: 11px; width: 23%; }
    </style>
</head>
<body>
    <audio id="bgm" loop src="https://www.chosic.com/wp-content/uploads/2021/07/The-Grand-Final-Epic-Modern-Chinese-Music.mp3"></audio>

    <div id="home" class="screen active">
        <h1 onclick="socket.emit('gm_power')" style="margin:5px;">🏯 สำนักปฐมกาล</h1>
        <div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:10px; width:90%;">
            ⚔️ ATK: <b id="atk">0</b> | 🛡️ DEF: <b id="def">0</b> | 💰 ทอง: <b id="gold">0</b>
        </div>
        <h2 id="rank" style="color:#fff; margin:10px 0;">รวบรวมลมปราณ</h2>
        <div class="bar"><div id="exp-fill"></div></div>
        <p id="exp-text" style="font-size:12px;">อีก 100 EXP เพื่อเลื่อนระดับ</p>
        <button class="btn" onclick="showS('map')">🗺️ ออกเดินทาง / บำเพ็ญ</button>
        <button class="btn" style="background:#8a6d3b" onclick="showS('shop')">💎 ตลาดมืด (4 หมวดเทพ)</button>
        <button class="btn" style="background:#444; color:#fff;" onclick="document.getElementById('bgm').play()">🎵 เปิดเพลง</button>
    </div>

    <div id="map" class="screen">
        <h2>🗺️ เลือกพื้นที่บำเพ็ญ</h2>
        <button class="btn" onclick="travel('ป่าหมอก')">🌲 ป่าหมอก (LV 1-25)</button>
        <button class="btn" onclick="travel('หุบเขาเทพ')">🌋 หุบเขาเทพ (LV 26++)</button>
        <button class="btn" style="background:#444; color:#fff;" onclick="showS('home')">🏠 กลับสำนัก</button>
    </div>

    <div id="battle" class="screen">
        <h2 id="loc-display">กำลังสู้...</h2>
        <img src="https://img.freepik.com/free-photo/majestic-dragon-fantasy-landscape_23-2151113444.jpg" style="width:250px; border-radius:15px; border:2px solid #d4af37;">
        <div class="bar"><div id="exp-fill2" style="background:#d4af37; height:100%;"></div></div>
        <p id="exp-text2">บำเพ็ญเพียรอัตโนมัติ...</p>
        <button class="btn" onclick="travel('home')">🏠 กลับสำนัก</button>
    </div>

    <div id="shop" class="screen">
        <div style="display:flex; justify-content:space-between; width:100%;">
            <button class="tab-btn" onclick="loadShop('weapon')">อาวุธ</button>
            <button class="tab-btn" onclick="loadShop('armor')">ชุด</button>
            <button class="tab-btn" onclick="loadShop('mount')">สัตว์ขี่</button>
            <button class="tab-btn" onclick="loadShop('accessory')">เครื่องประดับ</button>
        </div>
        <div id="shop-items" class="item-list"></div>
        <button class="btn" onclick="showS('home')">🏠 กลับสำนัก</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];
        const allItems = ${JSON.stringify(ALL_ITEMS)};

        function showS(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
        }

        function travel(loc) {
            if(loc === 'home') showS('home'); else showS('battle');
            socket.emit('travel', loc);
            document.getElementById('loc-display').innerText = loc;
        }

        function loadShop(cat) {
            const list = document.getElementById('shop-items');
            list.innerHTML = "";
            allItems[cat].forEach((it, i) => {
                list.innerHTML += \`
                    <div class="card">
                        <div style="text-align:left">
                            <b style="color:\${it.rare?'#ff00ff':'#d4af37'}">\${it.name}</b><br>
                            <small>💰 \${it.price} | +\${it.stat} \${it.type.toUpperCase()}</small>
                        </div>
                        <button class="btn \${it.rare?'rare':''}" style="width:70px; font-size:10px;" onclick="socket.emit('buy',{cat:'\${cat}',idx:\${i}})">ซื้อ</button>
                    </div>\`;
            });
        }

        let saved = JSON.parse(localStorage.getItem('immortal_v4'));
        socket.emit('join', saved);

        socket.on("update_client", (p) => {
            localStorage.setItem('immortal_v4', JSON.stringify(p));
            document.getElementById('atk').innerText = p.atk;
            document.getElementById('def').innerText = p.def;
            document.getElementById('gold').innerText = Math.floor(p.gold);
            
            let expLeft = 100 - Math.floor(p.exp);
            document.getElementById('exp-text').innerText = "ขาดอีก " + expLeft + " EXP เพื่อบรรลุขั้นถัดไป";
            document.getElementById('exp-text2').innerText = "อีก " + expLeft + " EXP จะอัปเวล...";
            document.getElementById('exp-fill').style.width = p.exp + "%";
            document.getElementById('exp-fill2').style.width = p.exp + "%";
            
            let rIdx = Math.min(Math.floor((p.level-1)/5), ranks.length-1);
            document.getElementById('rank').innerText = ranks[rIdx] + " (Lv."+p.level+")";
            document.getElementById('rank').style.color = p.level > 25 ? '#00ffff' : '#fff';
        });

        socket.on("update_all", (data) => { if(data[socket.id]) socket.emit('update_client', data[socket.id]); });
        socket.on("log", (m) => console.log(m));
        loadShop('weapon'); // โหลดหมวดอาวุธรอไว้
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Immortal System v4.0 Active!"));

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const RANKS = ["รวบรวมลมปราณ", "ก่อตั้งรากฐาน", "หลอมรวมแก่นทอง", "วิญญาณก่อกำเนิด", "ตัดพ้นปุถุชน", "จุติเทพ", "มหาเทพนิรันดร์", "ราชันย์เทวะ", "ปฐมกาลไร้ขอบเขต"];

let players = {};

// ⚙️ ระบบคำนวณเบื้องหลัง
setInterval(() => {
    Object.keys(players).forEach(id => {
        let p = players[id];
        if (p.isAuto) {
            // 📈 ความยาก: เกินเลเวล 25 ขึ้นช้าลง 5 เท่า
            let difficulty = p.level > 25 ? 0.2 : 1;
            p.exp += (2 * difficulty);
            
            // 💰 ทองเพิ่มตามระดับความเทพ
            p.gold += (Math.floor(p.level / 5) + 1) * 5;

            // ⚔️ พลังพุ่งตามเลเวล (ทวีคูณ)
            p.atk = Math.floor(10 * Math.pow(1.25, p.level));
            p.def = Math.floor(5 * Math.pow(1.22, p.level));

            if (p.exp >= 100) {
                p.level++;
                p.exp = 0;
            }
        }
    });
    io.emit("tick", players);
}, 1000);

io.on("connection", (socket) => {
    socket.on("join", (save) => {
        players[socket.id] = save || { level: 1, exp: 0, gold: 0, atk: 10, def: 5, isAuto: false };
        socket.emit("init", players[socket.id]);
    });

    socket.on("toggle_auto", () => {
        if(players[socket.id]) players[socket.id].isAuto = !players[socket.id].isAuto;
    });

    socket.on("gm_code", (code) => {
        if(code === "ARIYA_POWER") {
            let p = players[socket.id];
            p.gold += 1000000; p.level += 10;
        }
    });

    socket.on("disconnect", () => delete players[socket.id]);
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>IMMORTAL V6 - ULTIMATE</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;700&display=swap" rel="stylesheet">
    <style>
        body { background: #000; color: #fff; font-family: 'Kanit', sans-serif; margin: 0; overflow: hidden; }
        .bg-video { position: fixed; width: 100%; height: 100%; object-fit: cover; filter: brightness(0.4); z-index: -1; transition: 2s; }
        
        /* 📱 UI Layout */
        .container { display: flex; flex-direction: column; height: 100vh; padding: 20px; box-sizing: border-box; }
        
        /* 🏆 Header Info */
        .header { background: rgba(0,0,0,0.8); border: 2px solid #d4af37; border-radius: 15px; padding: 15px; box-shadow: 0 0 20px #d4af37; }
        .rank-title { font-size: 28px; color: #d4af37; font-weight: 700; text-shadow: 0 0 10px #d4af37; text-align: center; }
        
        /* 📊 Bar */
        .bar-container { background: #222; height: 25px; border-radius: 12px; margin: 15px 0; border: 1px solid #d4af37; overflow: hidden; position: relative; }
        #exp-bar { background: linear-gradient(90deg, #d4af37, #fff); height: 100%; width: 0%; transition: 0.3s; }
        .exp-text { position: absolute; width: 100%; text-align: center; line-height: 25px; font-size: 12px; font-weight: bold; color: #fff; text-shadow: 1px 1px 2px #000; }

        /* ⚔️ Stats Grid */
        .stats-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
        .stat { background: rgba(212, 175, 55, 0.15); border: 1px solid #d4af37; padding: 8px; border-radius: 8px; text-align: center; }
        .stat b { display: block; font-size: 18px; color: #fff; }

        /* 🔘 Main Button */
        .main-btn { 
            flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; 
            margin: 20px 0; border-radius: 50%; width: 200px; height: 200px; align-self: center;
            background: radial-gradient(circle, #d4af37 0%, #8a6d3b 100%);
            border: 8px solid rgba(255,255,255,0.2); cursor: pointer;
            box-shadow: 0 0 40px rgba(212, 175, 55, 0.5); transition: 0.2s;
        }
        .main-btn:active { transform: scale(0.9); box-shadow: 0 0 10px #d4af37; }
        .main-btn.auto-active { animation: pulse 1.5s infinite; background: radial-gradient(circle, #00ff00 0%, #006400 100%); box-shadow: 0 0 40px #00ff00; }
        
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

        .footer-nav { font-size: 12px; color: #aaa; text-align: center; }
        
        /* 🤫 GM Hidden */
        #gm-touch { position: fixed; top: 0; right: 0; width: 50px; height: 50px; z-index: 999; }
    </style>
</head>
<body>
    <img id="bg-img" class="bg-video" src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200">
    <audio id="bgm" loop src="https://www.chosic.com/wp-content/uploads/2021/07/The-Grand-Final-Epic-Modern-Chinese-Music.mp3"></audio>

    <div id="gm-touch" onclick="handleGM()"></div>

    <div class="container">
        <div class="header">
            <div id="rank-name" class="rank-title">กำลังโหลด...</div>
            <div style="text-align:center; font-size:14px; color:#ddd;">ระดับการบำเพ็ญ (Lv.<span id="lv-text">1</span>)</div>
            
            <div class="bar-container">
                <div id="exp-bar"></div>
                <div id="exp-val" class="exp-text">EXP: 0%</div>
            </div>

            <div class="stats-box">
                <div class="stat"><small>⚔️ พลังโจมตี</small><b id="atk-text">10</b></div>
                <div class="stat"><small>🛡️ พลังป้องกัน</small><b id="def-text">5</b></div>
                <div class="stat" style="grid-column: span 2;"><small>💰 ทองในคลัง</small><b id="gold-text">0</b></div>
            </div>
        </div>

        <div class="main-btn" id="cultivate-btn" onclick="toggleAuto()">
            <span id="btn-icon" style="font-size:50px;">🧘</span>
            <b id="btn-text">เริ่มบำเพ็ญ</b>
        </div>

        <div class="footer-nav">
            <p>ยิ่งเลเวลสูง พลังยิ่งพุ่งทะยานเป็นทวีคูณ!</p>
            <small>แตะที่ปุ่มเพื่อเปิด/ปิด ระบบบำเพ็ญอัตโนมัติ</small>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ranks = ${JSON.stringify(RANKS)};
        let gmClicks = 0;

        function handleGM() {
            gmClicks++;
            if(gmClicks >= 7) {
                let p = prompt("รหัสเจ้าสำนัก:");
                socket.emit('gm_code', p);
                gmClicks = 0;
            }
        }

        function toggleAuto() {
            socket.emit('toggle_auto');
            document.getElementById('bgm').play().catch(()=>{});
        }

        socket.on("init", (p) => updateUI(p));
        socket.on("tick", (data) => {
            if(data[socket.id]) updateUI(data[socket.id]);
        });

        function updateUI(p) {
            localStorage.setItem('ariya_save_v6', JSON.stringify(p));
            document.getElementById('lv-text').innerText = p.level;
            document.getElementById('atk-text').innerText = p.atk.toLocaleString();
            document.getElementById('def-text').innerText = p.def.toLocaleString();
            document.getElementById('gold-text').innerText = p.gold.toLocaleString();
            document.getElementById('exp-bar').style.width = p.exp + "%";
            document.getElementById('exp-val').innerText = "บรรลุแล้ว " + Math.floor(p.exp) + "%";

            // 🎨 เปลี่ยนสี Exp ตามเลเวล
            if(p.level > 25) document.getElementById('exp-bar').style.background = "linear-gradient(90deg, #a020f0, #ff00ff)";

            const rIdx = Math.min(Math.floor((p.level-1)/5), ranks.length-1);
            document.getElementById('rank-name').innerText = ranks[rIdx];
            
            // 🔘 ปุ่ม Auto Status
            const btn = document.getElementById('cultivate-btn');
            const bText = document.getElementById('btn-text');
            const bIcon = document.getElementById('btn-icon');
            if(p.isAuto) {
                btn.classList.add('auto-active');
                bText.innerText = "กำลังบำเพ็ญ...";
                bIcon.innerText = "⚡";
            } else {
                btn.classList.remove('auto-active');
                bText.innerText = "เริ่มบำเพ็ญ";
                bIcon.innerText = "🧘";
            }
        }

        let saved = JSON.parse(localStorage.getItem('ariya_save_v6'));
        socket.emit('join', saved);
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("v6.0 Stable Live!"));

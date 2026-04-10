const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
// ปรับค่า cors เพื่อให้เชื่อมต่อได้จากทุกที่
const io = new Server(server, {
  cors: { origin: "*" }
});

/* =========================
   🌍 WORLD STATE
========================= */
let world = {
  chaos: 0,
  players: {}, // เก็บข้อมูลผู้เล่นทุกคน
  events: [],
  bosses: []
};

/* =========================
   👑 GM SYSTEM
========================= */
const GM_CODE = "1234GMSECRET";
let gms = {};

/* =========================
   🧠 GAME MASTER AI (LOGIC)
========================= */
function gameMaster(input, socketId) {
  let msg = input.toLowerCase();
  let p = world.players[socketId];

  if (msg.includes("attack")) {
    world.chaos += 10;
    return "⚔️ คุณโจมตีสำเร็จ โลกเริ่มวุ่นวายขึ้น! (+10 Chaos)";
  }

  if (msg.includes("status")) {
    return `🌍 โลกวุ่นวาย: ${world.chaos}% | 🧘 เลเวลของคุณ: ${p.level} (EXP: ${p.exp}/100)`;
  }

  if (msg.includes("บำเพ็ญ") || msg.includes("meditate")) {
    p.exp += 25;
    let res = "🧘 ท่านนั่งสมาธิได้รับตบะ +25";
    if (p.exp >= 100) {
      p.level += 1;
      p.exp = 0;
      io.emit("system", `✨ ยินดีด้วย! จอมยุทธ [${socketId.slice(0,4)}] บรรลุเลเวล ${p.level} แล้ว!`);
      res = "🌟 เลเวลอัป! พลังวัตรของท่านเพิ่มพูนขึ้น";
    }
    return res;
  }

  if (msg.includes("help")) {
    return "📜 คำสั่ง: attack (โจมตี), บำเพ็ญ (เพิ่มเลเวล), status (เช็คค่าพลัง)";
  }

  return "❓ ไม่เข้าใจคำสั่ง ลองพิมพ์ 'help'";
}

/* =========================
   🚀 SOCKET IO
========================= */
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // สร้างข้อมูลตัวละครใหม่เมื่อคนเข้าเว็บ
  world.players[socket.id] = {
    name: "Player_" + socket.id.slice(0, 4),
    hp: 100,
    level: 1,
    exp: 0
  };

  socket.emit("system", "🐉 ยินดีต้อนรับสู่โลกบำเพ็ญเพียร! พิมพ์ 'help' เพื่อดูวิธีเล่น");

  socket.on("message", (data) => {
    let reply = gameMaster(data, socket.id);
    io.emit("chat", {
      id: socket.id.slice(0, 4),
      msg: data,
      reply: reply
    });
  });

  socket.on("gm_login", (code) => {
    if (code === GM_CODE) {
      gms[socket.id] = true;
      socket.emit("gm_status", "✅ GM LOGIN SUCCESS");
    } else {
      socket.emit("gm_status", "❌ WRONG CODE");
    }
  });

  socket.on("gm_command", (cmd) => {
    if (!gms[socket.id]) return;
    if (cmd.type === "boss") {
      world.bosses.push(cmd.name);
      io.emit("system", "👹 BOSS ปรากฏตัว: " + cmd.name);
    }
    if (cmd.type === "chaos") {
      world.chaos += cmd.value;
      io.emit("system", "🌍 GM ปรับค่าความวุ่นวายโลกเป็น: " + world.chaos);
    }
  });

  socket.on("disconnect", () => {
    delete world.players[socket.id];
    delete gms[socket.id];
  });
});

/* =========================
   🌐 FRONTEND (หน้าจอเกม)
========================= */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>MMO BKK SYSTEM</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Courier New', monospace; background:#000; color:#0f0; padding:15px; }
        #chat { height:350px; overflow-y:scroll; border:2px solid #0f0; padding:10px; background:#050505; margin-bottom:10px; }
        .input-group { display: flex; gap: 5px; margin-bottom: 20px; }
        input { background:#111; color:#0f0; border:1px solid #0f0; padding:10px; flex-grow: 1; }
        button { background:#0f0; color:#000; border:none; padding:10px 15px; font-weight:bold; cursor:pointer; }
        .gm-panel { border-top: 2px dashed #f00; padding-top:15px; opacity: 0.8; }
        .reply { color: #ffff00; }
    </style>
</head>
<body>
    <h2>🌍 MMO BKK SYSTEM</h2>
    <div id="chat"></div>

    <div class="input-group">
        <input id="msg" placeholder="พิมพ์คำสั่ง (บำเพ็ญ, attack, status)..." />
        <button onclick="send()">SEND</button>
    </div>

    <div class="gm-panel">
        <h3>👑 GM PANEL</h3>
        <div class="input-group">
            <input id="gmc" type="password" placeholder="GM CODE" />
            <button onclick="loginGM()" style="background:#f00; color:#fff;">LOGIN</button>
        </div>
        <button onclick="spawnBoss()">SPAWN BOSS</button>
        <button onclick="addChaos()">MAX CHAOS</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const chatDiv = document.getElementById("chat");

        function send(){
            let msgInput = document.getElementById("msg");
            if(msgInput.value) {
                socket.emit("message", msgInput.value);
                msgInput.value = "";
            }
        }

        function loginGM(){
            socket.emit("gm_login", document.getElementById("gmc").value);
        }

        function spawnBoss(){
            socket.emit("gm_command", { type: "boss", name: "มังกรทมิฬ (Shadow Dragon)" });
        }

        function addChaos(){
            socket.emit("gm_command", { type: "chaos", value: 100 });
        }

        socket.on("chat", (data) => {
            chatDiv.innerHTML += "<p><b>[" + data.id + "]</b>: " + data.msg + "<br><span class='reply'>👉 " + data.reply + "</span></p>";
            chatDiv.scrollTop = chatDiv.scrollHeight;
        });

        socket.on("system", (msg) => {
            chatDiv.innerHTML += "<p style='color:#00ffff'>📢 " + msg + "</p>";
            chatDiv.scrollTop = chatDiv.scrollHeight;
        });

        socket.on("gm_status", (msg) => { alert(msg); });
    </script>
</body>
</html>
  `);
});

// ใช้ Port จาก Environment หรือ 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🔥 สำนักเปิดแล้วที่ Port: " + PORT);
});

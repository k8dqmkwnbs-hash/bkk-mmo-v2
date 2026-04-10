const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let world = { chaos: 0 };
const GM_CODE = "1234GMSECRET";
let gms = {};

io.on("connection", (socket) => {
  socket.emit("system", "🐉 ยินดีต้อนรับสู่โลกบำเพ็ญเพียร!");

  socket.on("message", (data) => {
    let reply = "❓ ลองพิมพ์: attack, status หรือ help";
    if (data.toLowerCase().includes("attack")) {
      world.chaos += 5;
      reply = "⚔️ คุณโจมตี! โลกวุ่นวายขึ้น (+5 Chaos)";
    }
    if (data.toLowerCase().includes("status")) {
      reply = `🌍 สถานะโลก - Chaos: ${world.chaos}%`;
    }
    io.emit("chat", { id: socket.id.slice(0,4), msg: data, reply });
  });

  socket.on("gm_login", (code) => {
    if (code === GM_CODE) {
      gms[socket.id] = true;
      socket.emit("system", "✅ LOGIN GM สำเร็จ! พลังเทพเจ้าตื่นขึ้นแล้ว");
    }
  });

  socket.on("gm_command", (cmd) => {
    if (!gms[socket.id]) return;
    if (cmd.type === "boss") io.emit("system", "👹 GM เสก BOSS: Shadow Dragon ปรากฏกาย!");
    if (cmd.type === "chaos") {
      world.chaos += 50;
      io.emit("system", "📢 GM พิโรธ! เพิ่ม Chaos +50%");
    }
  });
});

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>BKK MMO</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { background: #000; color: #0f0; font-family: monospace; padding: 20px; }
        #chat { height: 300px; border: 2px solid #0f0; overflow-y: auto; padding: 10px; margin-bottom: 10px; background: #050505; }
        input { background: #111; color: #0f0; border: 1px solid #0f0; padding: 10px; width: 65%; }
        button { background: #0f0; color: #000; border: none; padding: 10px; cursor: pointer; font-weight: bold; }
        .gm-panel { border-top: 2px dashed #f00; margin-top: 20px; padding-top: 10px; }
    </style>
</head>
<body>
    <h2>🌍 MMO BKK SYSTEM</h2>
    <div id="chat"></div>
    <input id="msg" placeholder="พิมพ์ attack หรือ status...">
    <button onclick="send()">SEND</button>
    <div class="gm-panel">
        <h3>👑 GM CONTROL</h3>
        <input id="gmc" type="password" placeholder="GM CODE" style="width:100px">
        <button onclick="login()">LOGIN</button>
        <button onclick="boss()">BOSS</button>
        <button onclick="chaos()">CHAOS</button>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        function send() {
            const m = document.getElementById("msg");
            if(m.value) { socket.emit("message", m.value); m.value = ""; }
        }
        function login() { socket.emit("gm_login", document.getElementById("gmc").value); }
        function boss() { socket.emit("gm_command", {type:"boss"}); }
        function chaos() { socket.emit("gm_command", {type:"chaos"}); }

        socket.on("chat", d => {
            const c = document.getElementById("chat");
            c.innerHTML += "<p><b>[" + d.id + "]</b>: " + d.msg + "<br><span style='color:yellow'>👉 " + d.reply + "</span></p>";
            c.scrollTop = c.scrollHeight;
        });
        socket.on("system", m => {
            const c = document.getElementById("chat");
            c.innerHTML += "<p style='color:cyan'>📢 " + m + "</p>";
            c.scrollTop = c.scrollHeight;
        });
    </script>
</body>
</html>
  `);
});

server.listen(process.env.PORT || 3000, () => console.log("Ready!"));

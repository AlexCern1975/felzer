import express from "express";
import bodyParser from "body-parser";
import { RouterOSAPI } from "node-routeros";

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use(express.static("public")); // отдаём index.html

// Конфиг для подключения к MikroTik
const routerConfig = {
  host: process.env.MIKROTIK_HOST || "b4a00af79a49.sn.mynetname.net",
  user: process.env.MIKROTIK_USER || "api_user",
  password: process.env.MIKROTIK_PASS || "CaReLtest2024$&",
  port: 8728,
  timeout: 5000,
};

// Функция для клиента
function getClient() {
  return new RouterOSAPI(routerConfig);
}

// ====== ADD ======
app.get("/add", async (req, res) => {
  const ip = req.query.ip;
  if (!ip) return res.status(400).send("No IP provided");

  try {
    const conn = getClient();
    await conn.connect();

    await conn.write("/ip/firewall/address-list/add", [
      `=address=${ip}`,
      "=list=Carel",
    ]);

    res.send(`${ip} added to Carel list`);
  } catch (err) {
    console.error("Add error:", err);

    if (err.message && err.message.includes("already have such entry")) {
      res.send(`${ip} is already in Carel list`);
    } else {
      res.status(500).send(`Error adding IP: ${err.message}`);
    }
  }
});

// ====== REMOVE ======
app.get("/remove", async (req, res) => {
  const ip = req.query.ip;
  if (!ip) return res.status(400).send("No IP provided");

  try {
    const conn = getClient();
    await conn.connect();

    // ищем ID записи
    const list = await conn.write("/ip/firewall/address-list/print", [
      `?address=${ip}`,
      "?list=Carel",
    ]);

    if (list.length === 0) {
      return res.send(`${ip} not found in Carel list`);
    }

    const id = list[0][".id"];

    await conn.write("/ip/firewall/address-list/remove", [`=.id=${id}`]);

    res.send(`${ip} removed from Carel list`);
  } catch (err) {
    console.error("Remove error:", err);
    res.status(500).send(`Error removing IP: ${err.message}`);
  }
});

// ====== LIST ======
app.get("/list", async (req, res) => {
  try {
    const conn = getClient();
    await conn.connect();

    const list = await conn.write("/ip/firewall/address-list/print", [
      "?list=Carel",
    ]);

    const ips = list.map((entry) => entry.address);
    res.json({ list: ips });
  } catch (err) {
    console.error("List error:", err);
    res.status(500).send(`Error getting list: ${err.message}`);
  }
});

app.listen(port, () => {
  console.log(`HTTP server listening on ${port}`);
});
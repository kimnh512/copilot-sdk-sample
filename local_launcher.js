// local_launcher.js
// Windows용 간단한 로컬 실행기입니다. Node.js로 실행하세요: `node local_launcher.js`
// 이 프로그램은 http://localhost:4321/launch 또는 /launch-one 에 POST 요청을 받아 명령을 실행합니다.

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const port = 4321;

app.use(cors());
app.use(bodyParser.json());

app.post('/launch', async (req, res) => {
  const items = req.body.items || [];
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items 필요' });

  (async () => {
    for (const it of items) {
      try {
        await launchCommand(it.command, it.type);
        await wait(800);
      } catch (err) {
        console.error('실행 실패', it, err.message);
      }
    }
  })();

  res.json({ status: 'launched', count: items.length });
});

app.post('/launch-one', async (req, res) => {
  const item = req.body.item;
  if (!item || !item.command) return res.status(400).json({ error: 'item 및 command가 필요합니다.' });

  try {
    await launchCommand(item.command, item.type);
    res.json({ status: 'launched', item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function launchCommand(cmd, type) {
  return new Promise((resolve, reject) => {
    if (process.env.LOCAL_LAUNCHER_MOCK === 'true') {
      console.log('[MOCK LAUNCH] would run:', cmd, 'type:', type);
      return resolve();
    }
    const isUrl = /^https?:\/\//i.test(cmd);
    const args = ['/c', 'start', '""', cmd];
    const child = spawn('cmd', args, { windowsHide: true });

    child.on('error', (err) => reject(err));
    resolve();
  });
}

app.listen(port, () => {
  console.log(`Local launcher listening on http://localhost:${port}`);
  console.log('웹앱에서 작업 수락 또는 다음 버튼으로 로컬 명령을 전송하세요.');
});

const express = require('express');
const bodyParser = require('body-parser');
const copilot = require('./copilotClient');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/plan', async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text 필드가 필요합니다.' });

  const prompt = `아래 사용자의 자연어 작업 설명을 읽고, 우선순위와 수행 순서를 판단하여 JSON 배열을 반환하세요. 각 항목은 다음 필드를 포함해야 합니다:\n- name: 작업 제목\n- command: Windows에서 실행 가능한 URL 또는 앱 실행 명령\n- type: browser 또는 app\n- priority: 1부터 5까지 (1이 가장 높음)\n- order: 수행 순서\n- description: 작업 설명\n\n입력:\n${text}\n\n반환 예시:\n[\n  {\n    \"name\": \"이메일 확인\",\n    \"command\": \"outlook\",\n    \"type\": \"app\",\n    \"priority\": 1,\n    \"order\": 1,\n    \"description\": \"중요한 이메일을 확인하고 회신하십시오.\"\n  }\n]`;

  let tasks = [];
  let warning;
  const hasCopilotToken = !!process.env.COPILOT_GITHUB_TOKEN;
  const isMock = process.env.COPILOT_MOCK === 'true';

  if (!hasCopilotToken && !isMock) {
    warning = 'Copilot 토큰이 설정되지 않아 규칙 기반 제안이 사용됩니다.';
    tasks = fallbackSuggestions(text);
  } else {
    try {
      const result = await copilot.generate(prompt);
      console.log('Copilot raw response:', result);
      tasks = parseCopilotTasks(result);

      if (!tasks.length) {
        tasks = parseTasksFromText(result);
        if (tasks.length) {
          warning = 'Copilot 응답을 JSON으로 파싱할 수 없어 텍스트 기반으로 작업을 추출했습니다.';
        }
      }

      if (!tasks.length) {
        warning = 'Copilot 응답을 파싱하지 못했습니다. 규칙 기반 제안으로 대체합니다.';
        tasks = fallbackSuggestions(text);
      }
    } catch (err) {
      console.error('Copilot 호출 실패:', err.message);
      warning = 'Copilot 호출 실패로 규칙 기반 제안이 사용되었습니다.';
      tasks = fallbackSuggestions(text);
    }
  }

  res.json({ tasks, warning });
});

app.post('/copilot', async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: 'prompt 필드가 필요합니다.' });

  try {
    const result = await copilot.generate(prompt);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  console.log(`Open http://localhost:${port}/ to access the UI`);
});

function parseCopilotTasks(text) {
  if (!text || typeof text !== 'string') return [];
  const jsonText = extractJson(text);
  if (!jsonText) return [];

  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && item.name && item.command)
      .map((item, index) => ({
        name: String(item.name),
        command: String(item.command),
        type: item.type === 'app' ? 'app' : 'browser',
        priority: Number(item.priority) || 3,
        order: Number(item.order) || index + 1,
        description: String(item.description || '')
      }))
      .sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error('JSON 파싱 오류:', err.message);
    return [];
  }
}

function extractJson(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.substring(start, end + 1);
}

function parseTasksFromText(text) {
  if (!text || typeof text !== 'string') return [];

  const jsonTasks = parseCopilotTasks(text);
  if (jsonTasks.length) return jsonTasks;

  const parts = text
    .split(/,|、|·|;| 그리고 | 및 | 과 | 와 | 그리고|및|과|와|\band\b|\bor\b/i)
    .map(part => part.trim())
    .filter(Boolean);

  const tasks = [];
  let order = 1;

  for (const part of parts) {
    const cleanText = part.replace(/^[0-9]+[.)]\s*/, '').trim();
    if (!cleanText) continue;

    const command = extractUrl(cleanText) || mapToCommand(cleanText) || `https://www.google.com/search?q=${encodeURIComponent(cleanText)}`;
    const type = /^https?:\/\//i.test(command) ? 'browser' : 'app';

    tasks.push({
      name: cleanText,
      command,
      type,
      priority: 3,
      order: order++,
      description: cleanText
    });
  }

  return tasks;
}

function extractUrl(text) {
  const urlMatch = text.match(/https?:\/\/[^\s"']+/i);
  return urlMatch ? urlMatch[0] : null;
}

function mapToCommand(text) {
  if (/(vscode|visual studio code|vs code|코드|코드 편집기|비주얼 스튜디오 코드)/i.test(text)) return 'code';
  if (/(outlook|email|mail|이메일|메일)/i.test(text)) return 'outlook';
  if (/(teams|zoom|화상회의|회의|미팅|회의 준비|온라인 미팅)/i.test(text)) return 'msteams';
  if (/(document|word|doc|write|report|note|memo|문서|기록|노트|메모|작성)/i.test(text)) return 'notepad';
  if (/(browser|web|website|site|홈페이지|웹|사이트|검색|구글|Google)/i.test(text)) return 'https://www.google.com';
  return null;
}

function fallbackSuggestions(text) {
  const suggestions = [];

  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    suggestions.push({
      name: '웹 검색/사이트 열기',
      command: urlMatch[0],
      type: 'browser',
      priority: 2,
      order: suggestions.length + 1,
      description: '입력된 링크를 브라우저에서 엽니다.'
    });
  } else if (/(browse|website|open website|search|google|visit|웹|사이트|검색|구글)/i.test(text)) {
    suggestions.push({
      name: '검색 페이지 열기',
      command: 'https://www.google.com',
      type: 'browser',
      priority: 3,
      order: suggestions.length + 1,
      description: '웹 검색을 위해 브라우저를 엽니다.'
    });
  }

  if (/(document|word|doc|write|report|note|memo|문서|기록|노트|메모|작성)/i.test(text)) {
    suggestions.push({
      name: '문서 편집기 열기',
      command: 'notepad',
      type: 'app',
      priority: 3,
      order: suggestions.length + 1,
      description: '문서 작성 또는 메모를 위해 메모장을 엽니다.'
    });
  }

  if (/(code|development|editor|vscode|visual studio code|script|코드|코드 편집기|비주얼 스튜디오 코드)/i.test(text)) {
    suggestions.push({
      name: '코드 편집기 열기',
      command: 'code',
      type: 'app',
      priority: 2,
      order: suggestions.length + 1,
      description: '코드 편집을 위해 VS Code를 엽니다.'
    });
  }

  if (/(email|outlook|mail|이메일|메일)/i.test(text)) {
    suggestions.push({
      name: '메일 클라이언트 열기',
      command: 'outlook',
      type: 'app',
      priority: 1,
      order: suggestions.length + 1,
      description: '이메일을 확인합니다.'
    });
  }

  if (/(meeting|teams|zoom|video call|call|화상회의|회의|미팅|온라인 미팅)/i.test(text)) {
    suggestions.push({
      name: '화상회의 앱 열기',
      command: 'msteams',
      type: 'app',
      priority: 2,
      order: suggestions.length + 1,
      description: '화상 회의를 준비합니다.'
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      name: '브라우저 열기',
      command: 'https://www.google.com',
      type: 'browser',
      priority: 4,
      order: 1,
      description: '기본 브라우저를 엽니다.'
    });
  }

  return suggestions;
}

const { CopilotClient, approveAll } = require('@github/copilot-sdk');
const { AzureOpenAI } = require('openai');

let copilotClientInstance;

async function ensureCopilotClient() {
  if (copilotClientInstance) return copilotClientInstance;

  const token = process.env.COPILOT_GITHUB_TOKEN;
  if (!token) {
    throw new Error('COPILOT_GITHUB_TOKEN 환경 변수가 설정되지 않았습니다.');
  }

  copilotClientInstance = new CopilotClient({ logLevel: 'info', gitHubToken: token });
  await copilotClientInstance.start();
  return copilotClientInstance;
}

function createAzureClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!endpoint || !apiKey) return null;

  return new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
  });
}

async function generateWithAzure(prompt) {
  const azureClient = createAzureClient();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

  const response = await azureClient.chat.completions.create({
    model: deployment,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateWithCopilot(prompt) {
  const client = await ensureCopilotClient();
  const model = process.env.COPILOT_MODEL || 'gpt-4o';
  const session = await client.createSession({ model, onPermissionRequest: approveAll });

  try {
    const message = await session.sendAndWait({ prompt, timeout: 30000 });
    if (!message) throw new Error('Copilot 응답이 없습니다.');

    const content = message.data?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.join(' ');
    return String(content ?? '');
  } finally {
    await session.disconnect();
  }
}

async function generate(prompt) {
  if (!prompt) {
    throw new Error('prompt가 필요합니다.');
  }

  // Mock mode: 개발·테스트용 프롬프트 기반 모의 응답
  if (process.env.COPILOT_MOCK === 'true') {
    return generateMockTasksFromPrompt(prompt);
  }

  // Azure OpenAI 환경변수가 설정된 경우 우선 사용
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    return generateWithAzure(prompt);
  }

  // 폴백: GitHub Copilot SDK
  return generateWithCopilot(prompt);
}

function generateMockTasksFromPrompt(prompt) {
  const textMatch = prompt.match(/입력:\n([\s\S]+?)\n\n반환 예시:/);
  const userText = textMatch ? textMatch[1].trim() : prompt;
  const commands = [];

  if (/(이메일|메일|메일 확인|outlook)/i.test(userText)) {
    commands.push({
      name: '이메일 확인',
      command: 'outlook',
      type: 'app',
      priority: 1,
      order: commands.length + 1,
      description: '중요한 이메일을 확인하고 회신합니다.'
    });
  }

  if (/(코드|코드 편집기|VS Code|vscode|visual studio code|비주얼 스튜디오 코드)/i.test(userText)) {
    commands.push({
      name: '코드 편집기 열기',
      command: 'code',
      type: 'app',
      priority: commands.length === 0 ? 1 : 2,
      order: commands.length + 1,
      description: '프로젝트를 열어 코드를 확인합니다.'
    });
  }

  const urlMatch = userText.match(/https?:\/\/[^\s"']+/i);
  if (urlMatch) {
    commands.push({
      name: '웹 페이지 열기',
      command: urlMatch[0],
      type: 'browser',
      priority: commands.length === 0 ? 1 : 3,
      order: commands.length + 1,
      description: '입력된 URL을 브라우저에서 엽니다.'
    });
  }

  if (!commands.length) {
    commands.push({
      name: '일반 작업',
      command: 'https://www.google.com/search?q=' + encodeURIComponent(userText),
      type: 'browser',
      priority: 3,
      order: 1,
      description: userText
    });
  }

  return JSON.stringify(commands, null, 2);
}

async function stop() {
  if (!copilotClientInstance) return;
  await copilotClientInstance.stop();
  copilotClientInstance = undefined;
}

module.exports = { generate, stop };

const { app } = require('@azure/functions');
const copilot = require('../../copilotClient');

app.http('copilot', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    let body;
    try { body = await request.json(); } catch { body = {}; }

    const prompt = body.prompt;
    if (!prompt) {
      return { status: 400, jsonBody: { error: 'prompt 필드가 필요합니다.' } };
    }

    try {
      const result = await copilot.generate(prompt);
      return { jsonBody: { result } };
    } catch (err) {
      context.log('Copilot 호출 실패:', err.message);
      return { status: 500, jsonBody: { error: err.message } };
    }
  }
});

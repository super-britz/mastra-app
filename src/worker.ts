import { dictionaryAgent } from './mastra/agents/dictionary-agent';

type LookupRequest = {
  word?: string;
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
      ...(init?.headers || {}),
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/') {
      return json({
        name: 'mastra-dictionary-worker',
        message: 'POST /api/lookup with JSON: {"word":"example"}',
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/lookup') {
      try {
        const body = (await request.json()) as LookupRequest;
        const word = body.word?.trim();

        if (!word) {
          return json({ error: 'Missing "word" in request body.' }, { status: 400 });
        }

        const result = await dictionaryAgent.generate(`请查询英文单词 "${word}"，并按词典卡片格式返回。`, {
          maxSteps: 5,
        });

        return json({
          word,
          answer: result.text,
          toolCalls: result.toolCalls?.length ?? 0,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message }, { status: 500 });
      }
    }

    return json({ error: 'Not found' }, { status: 404 });
  },
};

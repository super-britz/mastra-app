import { dictionaryAgent } from './mastra/agents/dictionary-agent';

type LookupRequest = {
  word?: string;
};

function html(content: string, init?: ResponseInit) {
  return new Response(content, {
    ...init,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...(init?.headers || {}),
    },
  });
}

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

function renderHomePage() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mastra Dictionary</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1e8;
        --panel: rgba(255, 252, 245, 0.92);
        --ink: #1f2937;
        --muted: #6b7280;
        --line: rgba(31, 41, 55, 0.12);
        --accent: #d97706;
        --accent-strong: #b45309;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top, rgba(217, 119, 6, 0.18), transparent 28%),
          linear-gradient(180deg, #f8f4ec 0%, var(--bg) 100%);
      }

      main {
        width: min(920px, calc(100vw - 32px));
        margin: 40px auto;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }

      .hero {
        padding: 32px 28px 20px;
        border-bottom: 1px solid var(--line);
      }

      .eyebrow {
        margin: 0 0 12px;
        font-size: 13px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--accent-strong);
      }

      h1 {
        margin: 0 0 10px;
        font-size: clamp(32px, 6vw, 56px);
        line-height: 0.95;
        font-weight: 700;
      }

      .sub {
        margin: 0;
        max-width: 720px;
        color: var(--muted);
        font-size: 17px;
        line-height: 1.6;
      }

      form {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        padding: 20px 28px 28px;
        border-bottom: 1px solid var(--line);
      }

      input {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 16px 18px;
        font: inherit;
        font-size: 18px;
        background: rgba(255, 255, 255, 0.9);
        color: var(--ink);
      }

      input:focus {
        outline: 2px solid rgba(217, 119, 6, 0.25);
        border-color: rgba(217, 119, 6, 0.4);
      }

      button {
        border: 0;
        border-radius: 16px;
        padding: 0 22px;
        font: inherit;
        font-size: 16px;
        font-weight: 700;
        color: white;
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
        cursor: pointer;
      }

      button[disabled] {
        opacity: 0.6;
        cursor: wait;
      }

      .content {
        display: grid;
        gap: 16px;
        padding: 24px 28px 28px;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 18px 18px 20px;
        background: rgba(255, 255, 255, 0.62);
      }

      .card h2 {
        margin: 0 0 10px;
        font-size: 18px;
      }

      .status {
        color: var(--muted);
        font-size: 14px;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: "SFMono-Regular", "SF Mono", Consolas, monospace;
        font-size: 14px;
        line-height: 1.6;
      }

      .tips {
        color: var(--muted);
        font-size: 14px;
        line-height: 1.7;
      }

      @media (max-width: 720px) {
        main {
          width: min(100vw - 20px, 920px);
          margin: 16px auto;
        }

        form {
          grid-template-columns: 1fr;
        }

        button {
          height: 52px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <div class="hero">
          <p class="eyebrow">Mastra Agent on Cloudflare Workers</p>
          <h1>英语单词查询</h1>
          <p class="sub">输入一个英文单词，浏览器会直接调用你部署到 Cloudflare Workers 上的 Mastra dictionary agent，返回词典卡片结果。</p>
        </div>

        <form id="lookup-form">
          <input id="word-input" name="word" placeholder="例如：example、apple、exhausted" autocomplete="off" />
          <button id="submit-button" type="submit">查询</button>
        </form>

        <div class="content">
          <section class="card">
            <h2>查询结果</h2>
            <div id="status" class="status">输入单词后点击“查询”。</div>
            <pre id="result"></pre>
          </section>

          <section class="card tips">
            <strong>接口说明</strong><br />
            页面调用的是 <code>POST /api/lookup</code>。<br />
            如果你想演示 API，也可以直接发 JSON：<code>{ "word": "example" }</code>
          </section>
        </div>
      </section>
    </main>

    <script>
      const form = document.getElementById('lookup-form');
      const input = document.getElementById('word-input');
      const status = document.getElementById('status');
      const result = document.getElementById('result');
      const button = document.getElementById('submit-button');

      form.addEventListener('submit', async event => {
        event.preventDefault();
        const word = input.value.trim();

        if (!word) {
          status.textContent = '请先输入一个英文单词。';
          result.textContent = '';
          return;
        }

        button.disabled = true;
        status.textContent = '查询中...';
        result.textContent = '';

        try {
          const response = await fetch('/api/lookup', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ word }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '查询失败');
          }

          status.textContent = '查询完成。';
          result.textContent = data.answer || '没有返回内容。';
        } catch (error) {
          status.textContent = '查询失败。';
          result.textContent = error instanceof Error ? error.message : '未知错误';
        } finally {
          button.disabled = false;
        }
      });
    </script>
  </body>
</html>`;
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
      return html(renderHomePage());
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

// Provider presets. cost_tier: local | free | free-tier | paid | unknown.
// Free tiers change over time — values here are defaults the user can edit; nothing is guaranteed free forever.
export const PROVIDER_PRESETS = [
  { key: 'simulator', name: 'Local Simulator (オフライン)', kind: 'simulator', base_url: '', model: 'sim-1', cost_tier: 'local',
    note: 'APIキー不要の内蔵シミュレータ。ルールベースで応答し、パイプラインの動作確認に使います（本物のAIではありません）。' },
  { key: 'ollama', name: 'Ollama (ローカル)', kind: 'ollama', base_url: 'http://localhost:11434', model: 'llama3.2', cost_tier: 'local',
    note: 'https://ollama.com をインストールし `ollama pull llama3.2` 後に利用できます。完全無料・ローカル実行。' },
  { key: 'lmstudio', name: 'LM Studio (ローカル)', kind: 'openai', base_url: 'http://localhost:1234/v1', model: 'local-model', cost_tier: 'local',
    note: 'LM Studio のローカルサーバ (OpenAI互換)。' },
  { key: 'groq', name: 'Groq', kind: 'openai', base_url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', cost_tier: 'free-tier',
    note: '無料枠あり（レート制限あり）。https://console.groq.com でAPIキーを取得。' },
  { key: 'gemini', name: 'Google Gemini', kind: 'gemini', base_url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash', cost_tier: 'free-tier',
    note: '無料枠あり（無料枠の入力はGoogleの改善に使われる場合あり）。https://aistudio.google.com でキー取得。' },
  { key: 'openrouter', name: 'OpenRouter (無料モデル)', kind: 'openai', base_url: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free', cost_tier: 'free-tier',
    note: '":free" が付くモデルは無料（回数制限あり）。' },
  { key: 'mistral', name: 'Mistral', kind: 'openai', base_url: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', cost_tier: 'free-tier',
    note: '実験用の無料プランあり（条件は公式サイトで確認）。' },
  { key: 'anthropic', name: 'Claude API (Anthropic)', kind: 'anthropic', base_url: 'https://api.anthropic.com', model: 'claude-sonnet-5-5', cost_tier: 'paid',
    note: '有料API。利用には明示的な許可が必要です。' },
  { key: 'claude-cli', name: 'Claude Code CLI', kind: 'cli', base_url: '', model: '', cost_tier: 'unknown',
    config: { command: 'claude', args: ['-p'] },
    note: 'ローカルにインストールされた Claude Code CLI を `claude -p` で呼び出します（APIとは別の接続方式。契約により課金の可能性）。' },
  { key: 'openai', name: 'OpenAI / ChatGPT', kind: 'openai', base_url: 'https://api.openai.com/v1', model: 'gpt-4o-mini', cost_tier: 'paid', note: '有料API。' },
  { key: 'deepseek', name: 'DeepSeek', kind: 'openai', base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat', cost_tier: 'paid', note: '低価格の有料API。' },
  { key: 'qwen', name: 'Qwen (DashScope互換)', kind: 'openai', base_url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', cost_tier: 'unknown', note: '新規ユーザー向け無料枠がある場合あり。' },
  { key: 'perplexity', name: 'Perplexity', kind: 'openai', base_url: 'https://api.perplexity.ai', model: 'sonar', cost_tier: 'paid', note: '有料API（Web検索付き）。' },
  { key: 'custom', name: 'カスタム (OpenAI互換)', kind: 'openai', base_url: 'http://localhost:8000/v1', model: 'my-model', cost_tier: 'unknown', note: '任意のOpenAI互換エンドポイント。' },
];

export const ROLE_TEMPLATES = [
  { role: 'commander', name: 'Commander', icon: '🛰️', color: '#39ff88', personality: '冷静で全体を俯瞰する司令官', tone: '簡潔・的確', specialty: '指示の理解、チーム編成、最終報告' },
  { role: 'planner', name: 'Planner', icon: '🧭', color: '#22d3ee', personality: '論理的で段取り上手', tone: '構造的', specialty: '作業計画、タスク分割、依存関係' },
  { role: 'researcher', name: 'Researcher', icon: '🔎', color: '#60a5fa', personality: '好奇心旺盛で慎重', tone: '根拠重視', specialty: '調査、情報比較、技術選定' },
  { role: 'developer', name: 'Developer', icon: '💻', color: '#a78bfa', personality: '実装が速く粘り強い', tone: 'フレンドリー', specialty: 'プログラミング、ファイル作成、デバッグ' },
  { role: 'designer', name: 'Designer', icon: '🎨', color: '#f472b6', personality: '美的感覚に優れる', tone: '柔らかい', specialty: 'UI/UX、配色、レイアウト' },
  { role: 'tester', name: 'Tester', icon: '🧪', color: '#facc15', personality: '細部を見逃さない', tone: '事実ベース', specialty: 'テスト作成、実行、再現確認' },
  { role: 'security', name: 'Security', icon: '🛡️', color: '#fb7185', personality: '疑い深く慎重', tone: '厳格', specialty: '脆弱性検査、権限、秘密情報' },
  { role: 'reviewer', name: 'Reviewer', icon: '✅', color: '#34d399', personality: '公正で建設的', tone: '丁寧', specialty: 'コードレビュー、品質評価' },
];

export const EXTENSION_CATALOG = [
  { key: 'mcp-filesystem', name: 'MCP Filesystem', type: 'mcp', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    description: '公式MCPファイルシステムサーバ（npxでのダウンロードが必要＝インストール承認対象）。' },
  { key: 'mcp-fetch', name: 'MCP Fetch', type: 'mcp', command: 'uvx', args: ['mcp-server-fetch'], description: 'Webページ取得MCP（uv が必要）。' },
  { key: 'mcp-memory', name: 'MCP Memory', type: 'mcp', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'], description: 'ナレッジグラフ型メモリ。' },
  { key: 'mcp-git', name: 'MCP Git', type: 'mcp', command: 'uvx', args: ['mcp-server-git'], description: 'Git操作MCP。' },
];

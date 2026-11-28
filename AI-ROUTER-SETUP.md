# IDEA LAB AI Router

The `idea-ai` Supabase Edge Function routes authenticated requests to an AI provider.

## Providers

- `gemini` (default): Google Gemini API. Default model: `gemini-3.1-flash-lite`.
- `openai` (optional): OpenAI Responses API. Default model: `gpt-4.1-mini`.

Other providers can be added later behind the same provider adapter contract. They are not active in this first stage.

## Required Supabase Edge Function secrets

- `GEMINI_API_KEY` — required for the default Gemini route.
- `GEMINI_MODEL` — optional model override.
- `OPENAI_API_KEY` — optional; only required when a request explicitly selects `provider: "openai"`.
- `OPENAI_MODEL` — optional model override.

Never put provider keys in browser JavaScript, HTML, GitHub files, or chat messages. Add them in Supabase Dashboard → Edge Functions → Secrets. The function remains JWT-protected (`verify_jwt=true`).

## Request contract

POST JSON fields: `idea` (required), `problem`, `audience`, `budget`, `goal`, `mode` (analysis/market/score/pitch/strategy), and optional `provider` (gemini/openai). If provider is omitted, Gemini is used.

Response: `{ "analysis": "...", "mode": "...", "provider": "gemini" }`.

The AI API free tier has changing quotas and model availability. Google may use free-tier submitted content to improve products; do not send confidential, sensitive, or unnecessary personal information through the free tier.

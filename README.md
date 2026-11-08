# study-agent

ИИ-агент для учёбы и работы: RAG по учебникам, граф знаний, OpenAI-совместимый LLM-клиент, экспорт DOCX/PDF/PPTX, песочница Python и веб-UI (`web/`).

Python `>= 3.11`. Зависимости — [requirements.txt](requirements.txt) (синхронизированы с [pyproject.toml](pyproject.toml)). Секреты только через окружение — [.env.example](.env.example).

## Реализовано

| Область | Поведение |
| --- | --- |
| LLM | HTTP-клиент на `urllib` (`src/core/llm_client.py`), без SDK `openai` |
| RAG | парсеры txt/md/pdf/docx, чанки, embeddings, cosine search |
| Граф | `KnowledgeGraph` + экстрактор концептов |
| Агент | fast-path + SKILLSTATE, веб-поиск, sandbox, файлы в ответ |
| API | FastAPI: `/ask_stream`, `/library`, `/export`, `/webauth/*`, `/health` |
| UI | Vite/React SPA в `web/` |
| Песочница | subprocess (+ optional Docker), AST-policy, RLIMIT |

## Безопасность

- **CORS**: `ALLOWED_ORIGINS` (comma-separated). Без `*` по умолчанию.
- **API key**: `API_KEY` — Bearer или `X-API-Key`. Пустой ключ = режим dev.
- **Upload**: sanitize имени, запрет `..`, лимит `MAX_UPLOAD_BYTES`, без silent overwrite.
- **Sandbox**: policy + resource limits в child process.

## Запуск

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env
./.venv/bin/uvicorn server_core:app --host 127.0.0.1 --port 8090
cd web && npm ci && npm run dev
```

Прод: [DEPLOY.md](DEPLOY.md).

## Тесты и CI

```bash
./.venv/bin/pytest -q
./.venv/bin/ruff check src config.py server_core.py tests
```

GitHub Actions: `.github/workflows/ci.yml`.

# study-agent

Каркас ИИ-агента для учебы и работы. В этом коммите зафиксированы границы модулей, типы входов и выходов и контрактные тесты. Тела функций — `pass`. Реализация расписана в [TODO.md](TODO.md) четырьмя задачами: конфиг, песочница, RAG, экспорт.

Python `>= 3.11`. Зависимости — [requirements.txt](requirements.txt). Секреты — только через окружение, образец ключей в [.env.example](.env.example). Файл `.env` не коммитится.

## Стек

| Задача | Библиотека | Модуль |
| --- | --- | --- |
| Чат и эмбеддинги по OpenAI-совместимому HTTP | `openai` | `src/core/llm_client.py`, `src/rag/embeddings.py` |
| Разбор `.env` и проверка полей | `pydantic`, `python-dotenv` | `config.py` |
| Разбор PDF | `pypdf` | `src/rag/parsers.py` |
| Граф концептов | `networkx` | `src/knowledge/graph.py` |
| Экспорт DOCX | `python-docx` | `src/documents/docx_exporter.py` |
| Экспорт PDF | `reportlab` | `src/documents/pdf_exporter.py` |
| Изоляция кода | `docker` SDK или `subprocess` | `src/sandbox/runner.py` |
| Контрактные тесты | `pytest` | `tests/` |

`networkx.DiGraph` строится внутри `KnowledgeGraph` из `GraphSnapshot`. Наружу отдаются только `Concept`, `Relation` и `GraphSnapshot`.

## Дерево

```text
config.py                     load_settings -> Settings
src/core/llm_client.py        OpenAICompatibleClient.complete
src/core/agent.py             StudyAgent.answer / export_answer
src/rag/parsers.py            txt, md, pdf, docx -> ParsedDocument
src/rag/chunker.py            ParsedDocument -> list[Chunk]
src/rag/embeddings.py         texts -> vectors
src/rag/store.py              upsert / cosine search
src/rag/retriever.py          query -> list[RetrievedChunk]
src/rag/ingestor.py           файл -> индекс + граф
src/knowledge/extractor.py    chunks -> Concept, Relation
src/knowledge/graph.py        узлы, рёбра, expand, snapshot
src/documents/                ReportDocument -> .docx | .pdf
src/sandbox/policy.py         статический запрет импортов и вызовов
src/sandbox/runner.py         SubprocessSandbox | DockerSandbox
src/utils/                    stable_id, normalize_ws
```

## Схема вызовов

```text
ingest_path(path)
  parser_for(path).parse
  Chunker.split                  # у каждого Chunk обязателен SourceSpan
  EmbeddingClient.embed
  VectorStore.upsert
  ConceptExtractor.extract       # LLM JSON, запись в KnowledgeGraph
  -> IngestReport

StudyAgent.answer(question, execute_code=False)
  Retriever.search               # эмбеддинг запроса + cosine, без текста ответа
  KnowledgeGraph.expand          # соседи концептов тех же document_id
  LLMClient.complete             # в промпт попадают только retrieved spans
  [execute_code] один fenced ```python блок -> SandboxRunner.run
  -> AgentAnswer(text, citations, executed)

StudyAgent.export_answer(answer, path, "docx"|"pdf")
  to_report -> DocxExporter.export | PdfExporter.export
```

Модули не вызывают друг друга в обход этих входов. `config.py` не импортирует `src`. `src/sandbox` не импортирует RAG. Парсеры не ходят в сеть. Экспортёры не ходят в LLM.

## Метаданные RAG

Каждый `Chunk.metadata` — `SourceSpan`:

| Поле | Смысл |
| --- | --- |
| `document_id` | стабильный идентификатор документа |
| `source_path` | путь источника строкой |
| `page` | страница с 1 или `None` |
| `section` | ближайший заголовок или `None` |
| `char_start` | включительно, в нормализованном тексте документа |
| `char_end` | исключительно |

`char_*` не сбрасываются на границе страницы. Чанк не пересекает страницу. Повторный ingest того же `document_id` заменяет чанки и узлы этого документа, не дописывает дубликаты.

## LLM

`OpenAICompatibleClient` шлёт `POST {LLM_BASE_URL}/chat/completions`. `OpenAICompatibleEmbeddings` шлёт `POST {LLM_BASE_URL}/embeddings`. Модель чата — `LLM_MODEL`, модель эмбеддингов — `RAG_EMBEDDING_MODEL`. Ключ передаётся заголовком `Authorization: Bearer` и не пишется в логи, исключения и экспорт.

Повтор только на HTTP 429 и 5xx, не более `LLM_MAX_RETRIES`. Тело ответа с пустым `choices` — `LLMError`.

## Песочница

`create_sandbox` выбирает backend по `SANDBOX_BACKEND` (`docker` или `subprocess`) и не подключается к демону в конструкторе.

Перед запуском `validate_source` отклоняет пустой исходник, синтаксическую ошибку, импорт вне `allowed_imports`, вызовы `eval` / `exec` / `compile` / `open` / `__import__`. Нарушение — `SandboxPolicyError`, процесс не стартует.

Дочерняя среда ровно `PATH`, `SANDBOX=1`, `PYTHONUNBUFFERED=1`. `os.environ` хоста не копируется. Таймаут убивает группу процесса и возвращает `SandboxResult.timed_out=True`, без исключения. stdout и stderr обрезаются до `max_output_bytes`, тогда `truncated=True`.

Docker-профиль, который обязана соблюсти реализация: `network_disabled`, если политика запрещает сеть; лимит памяти; `CapDrop=ALL`; без монтирования корня хоста.

## Экспорт

Вход обоих экспортёров — `ReportDocument`. Уровень секции `1..3`. Запись во временный файл рядом с целью и замена цели только после успешного закрытия документа. Ошибка валидации или I/O — `ExportError`, полуготовый файл по пути назначения не оставляется.

## Проверки

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest
```

`tests/test_config.py` и `tests/test_sandbox.py` проверяют загрузчик и subprocess-песочницу без сети и без Docker-демона. `tests/test_rag.py` и `tests/test_graph.py` подменяют LLM и эмбеддинги фейками. `tests/test_export.py` открывает записанные docx и pdf. Живой ключ для этого прогона не нужен.

## Вне скоупа каркаса

Нет HTTP-сервера, очереди, учёта пользователей, персистентного диалога и автоматической установки Docker. Индекс и каталоги экспорта появляются только в задачах 3 и 4, не в загрузчике конфигурации.

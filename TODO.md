# План реализации

Порядок строгий: задача N не начинается, пока тесты задачи N-1 зелёные. Сигнатуры не менять. Новые параметры добавлять только если без них нельзя закрыть крайний случай из этого файла; тогда обновить тест и README в том же изменении.

Общее правило для I/O: запись через временный файл в том же каталоге и `os.replace`. Секреты не попадают в `str(exception)` и логи.

---

## Задача 1. Конфигурация

Целевой файл: `config.py`.

Функция:

```text
load_settings(env: Mapping[str, str] | None = None, env_file: Path | None = None) -> Settings
```

Порядок источников: разобрать `env_file` (если не `None`), затем наложить `env`. `env is None` означает `os.environ`. Пустой mapping не читает процесс.

Разбор dotenv: строки `KEY=VALUE` и `export KEY=VALUE`; `#` начинает комментарий, если перед ним начало строки или пробел; кавычки `"` и `'` вокруг значения снимаются; интерполяции `$VAR` нет. Отсутствующий путь `env_file` — `InvalidSettingError(key="env_file")`.

Обязательные ключи проверяются в этом порядке. На первом нарушении функция бросает исключение и не возвращает частичный `Settings`:

1. `LLM_BASE_URL` — непустой `str` после `strip`.
2. `LLM_API_KEY` — непустой `str`. Пробельная строка = отсутствие → `MissingSettingError`.
3. `LLM_MODEL` — непустой `str`.
4. `LLM_TIMEOUT_S` — `float > 0`, иначе `InvalidSettingError`.
5. `LLM_MAX_RETRIES` — `int >= 0`.
6. `RAG_CHUNK_SIZE` — `int >= 1`.
7. `RAG_CHUNK_OVERLAP` — `int >= 0` и строго `< RAG_CHUNK_SIZE`.
8. `RAG_TOP_K` — `int >= 1`.
9. `RAG_EMBEDDING_MODEL` — непустой `str`.
10. `RAG_INDEX_DIR` — непустой путь.
11. `SANDBOX_BACKEND` — `docker` или `subprocess`.
12. `SANDBOX_IMAGE` — непустой `str`.
13. `SANDBOX_TIMEOUT_S` — `float > 0`.
14. `SANDBOX_MEMORY_MB` — `int >= 1`.
15. `SANDBOX_CPU_LIMIT` — `float > 0`.
16. `SANDBOX_NETWORK_ENABLED` — `1|0|true|false` без учёта регистра.
17. `SANDBOX_MAX_OUTPUT_BYTES` — `int >= 1`.
18. `SANDBOX_WORKDIR` — непустой путь.
19. `EXPORT_OUTPUT_DIR` — непустой путь.
20. `EXPORT_PDF_FONT`, `EXPORT_DOCX_FONT` — непустые `str`.

`LOG_LEVEL` необязателен. Отсутствие → `INFO`. Иначе `DEBUG|INFO|WARNING|ERROR` без учёта регистра, в объект пишется верхний регистр.

Пути: `Path.expanduser`, затем абсолютный путь относительно `Path.cwd()`, если относительный. Каталоги не создавать. Неизвестные ключи игнорировать.

Крайние случаи: пустой файл dotenv; только комментарии; `KEY=` для обязательного строкового ключа; `RAG_CHUNK_OVERLAP` равен размеру чанка; дробный `RAG_CHUNK_SIZE`; `SANDBOX_TIMEOUT_S=0`; backend `podman`; одновременное отсутствие нескольких ключей — код ошибки соответствует первому ключу списка (для полностью пустого mapping это `LLM_BASE_URL`); значение из mapping перекрывает файл.

Критерий готовности: `pytest tests/test_config.py` зелёный, `tests/test_sandbox.py` всё ещё красный.

---

## Задача 2. Песочница

Целевые файлы: `src/sandbox/policy.py`, `src/sandbox/runner.py`.

Функции и типы:

```text
build_policy(settings: SandboxSettings, allowed_imports: frozenset[str] | None = None) -> SandboxPolicy
validate_source(source: str, policy: SandboxPolicy) -> None
SubprocessSandbox.run(request: SandboxRequest) -> SandboxResult
DockerSandbox.run(request: SandboxRequest) -> SandboxResult
create_sandbox(settings: SandboxSettings) -> SandboxRunner
```

`build_policy` копирует лимиты. `allowed_imports is None` → `DEFAULT_ALLOWED_IMPORTS`. `timeout_s <= 0` или `memory_mb < 1` → `SandboxPolicyError`.

`validate_source` использует `ast`, не `exec`. Отклонить:

- пустой или пробельный исходник;
- длина больше 100_000 символов;
- `SyntaxError`;
- `import` / `from` модуля, чьё верхнее имя не входит в `allowed_imports`;
- вызовы `eval`, `exec`, `compile`, `open`, `__import__`, `globals`, `locals`, `getattr`, `setattr`, `delattr`;
- имена атрибутов `__subclasses__`, `__globals__`, `__builtins__`, `__bases__`, `__mro__`.

`create_sandbox` возвращает экземпляр нужного класса и не открывает сокет к Docker.

`SubprocessSandbox.run`:

1. `validate_source`. При ошибке процесс не создаётся.
2. Записать исходник в файл внутри `policy.workdir` (каталог создать с правами `0o700`).
3. Запустить `sys.executable` с `-I -S` не требуется: нужен `-I`. Аргумент — путь к файлу.
4. Среда ребёнка только `PATH` (минимальный), `SANDBOX=1`, `PYTHONUNBUFFERED=1`.
5. `stdin` записать и закрыть. Декодирование stdout/stderr: UTF-8, `errors="replace"`.
6. Лимит времени: убить группу процессов. Вернуть `timed_out=True`, `exit_code != 0`. Не бросать `SandboxTimeoutError`.
7. Обрезать каждый поток до `max_output_bytes`. Если обрезка была, `truncated=True`.
8. После завершения удалить файл исходника. Каталог `workdir` не удалять.

`DockerSandbox.run` соблюдает тот же результат и ту же валидацию. Контейнер: `network_disabled=not policy.network_enabled`, `mem_limit`, `nano_cpus` из `cpu_limit`, `cap_drop=["ALL"]`, `pids_limit` не выше 64, один каталог workdir смонтирован в `/work`, корень хоста не смонтирован. Образ — `settings.image`. Если демон недоступен — `SandboxError`, не пустой `SandboxResult`.

Крайние случаи: `SystemExit(3)` сохраняет код 3; бесконечный цикл укладывается в timeout и не оставляет зомби; stdout длиннее лимита; секрет из `os.environ` родителя отсутствует в ребёнке; `import os` при политике без `os` не исполняется; `allowed_imports={"sys"}` разрешает чтение stdin; второй параллельный `run` не делит один файл исходника (имя файла содержит `stable_id` или случайный суффикс, не фиксированное `main.py`).

Критерий: `pytest tests/test_sandbox.py tests/test_config.py` зелёный. Тест Docker-демона не обязателен в CI без сокета; выбор класса `DockerSandbox` обязателен.

---

## Задача 3. RAG и граф знаний

Целевые файлы: `src/utils/text.py`, `src/utils/ids.py`, `src/rag/parsers.py`, `src/rag/chunker.py`, `src/rag/embeddings.py`, `src/rag/store.py`, `src/rag/ingestor.py`, `src/rag/retriever.py`, `src/knowledge/graph.py`, `src/knowledge/extractor.py`, `src/core/llm_client.py` (только транспорт, который нужен экстрактору и эмбеддингам).

Входы и выходы — как в аннотациях этих модулей. Дополнительно реализовать `stable_id(*parts: str) -> str` (SHA-256 hex, разделитель `\x1f`, пустой вызов → `ValueError`) и `normalize_ws(text: str) -> str` (CRLF/CR → `\n`, серии пробелов и табов → один пробел, перевод строки сохраняется).

Парсеры:

- `.txt`, `.md`: UTF-8, иначе `ParseError`. `page is None`. Для `.md` строки ATX-заголовков задают `section`.
- `.pdf`: одна `TextBlock` на непустую страницу, `page` с 1. Битый PDF — `ParseError`.
- `.docx`: абзацы; стиль Heading задаёт `section`.
- иной суффикс или отсутствующий файл — `ParseError`.

`Chunker.split`:

- склеивать блоки через `\n`, считая `char_start/char_end` по этой склейке;
- окно `chunk_size`, шаг `chunk_size - chunk_overlap`;
- не пересекать границу страницы: если блок короче окна, он один чанк; если длиннее — режется внутри блока;
- `embedding is None`;
- пустой документ → `[]`.

`FileVectorStore`: каталог `index_dir`. `upsert` требует непустой `embedding` одинаковой размерности в одном вызове, иначе `IndexError_`. Замена по `chunk_id`. `search` — косинус, `top_k < 1` → `IndexError_`. Нулевой вектор в запросе → пустой список, не деление на ноль. Запись поколения атомарна: сбой не оставляет индекс без предыдущей версии.

`OpenAICompatibleEmbeddings.embed`: пустой вход → `[]` без HTTP. Иная длина ответа → `EmbeddingError`.

`DocumentIngestor.ingest_path`: `document_id` по умолчанию `stable_id(str(path.resolve()))`. Сначала собрать новые чанки и концепты в памяти, затем `remove_document` + `upsert`. Сбой эмбеддинга или экстракции не удаляет старые данные.

`KnowledgeGraph`: семантика методов в докстрингах `graph.py`. `snapshot` сортирует узлы по `concept_id`, рёбра по `(source_id, predicate, target_id)`. `restore` валидирует ссылки и только потом заменяет состояние.

`ConceptExtractor.extract`: один JSON-объект вида `{"concepts": [...], "relations": [...]}`. `source_refs` обязаны указывать на переданный чанк (`document_id` + пересечение `[char_start, char_end)`). Чужой span — `ExtractionError` и граф без изменений. Пустые `chunks` — `[]` без вызова модели.

`Retriever.search`: пустой или пробельный `query` → `ValueError`. Равные score сортируются по `(document_id, char_start, chunk_id)`.

Крайние случаи: PDF без текстового слоя (0 блоков, не исключение); чанк ровно `chunk_size`; overlap 0; повторный ingest того же пути меняет `chunk_count`, но не плодит узлы; `expand([], 1)` → `[]`; `expand` с неизвестным id пропускает id; `depth < 0` → `GraphError`; два концепта с одним id и разным `label` → `GraphError`.

Критерий: новые тесты в `tests/test_rag.py` и `tests/test_graph.py` на парсер txt, чанкер, stable_id, upsert/search на временном каталоге, expand и отказ экстрактора на битом JSON. Сеть в этих тестах не вызывать: эмбеддинги и LLM подменить фейками, реализующими протоколы.

---

## Задача 4. Экспорт

Целевые файлы: `src/documents/docx_exporter.py`, `src/documents/pdf_exporter.py`, `src/core/agent.py`.

```text
DocxExporter.export(document: ReportDocument, destination: Path) -> Path
PdfExporter.export(document: ReportDocument, destination: Path) -> Path
StudyAgent.to_report(answer: AgentAnswer, title: str) -> ReportDocument
StudyAgent.answer(question: str, *, execute_code: bool = False) -> AgentAnswer
StudyAgent.export_answer(answer: AgentAnswer, destination: Path, fmt: Literal["docx", "pdf"]) -> Path
```

Валидация документа до открытия файла:

- `title` непустой после `strip`;
- `level` каждой секции в `1..3`;
- `heading` непустой;
- суффикс пути `.docx` или `.pdf` совпадает с экспортёром;
- `destination` не существующий каталог.

Иначе `ExportError`, файл не создаётся. Родительский каталог создать. Цитаты вывести отдельной последней секцией: `source_path`, `page`, `section`, `char_start-char_end`. Пустой `citations` — секцию «Источники» не добавлять.

`to_report`: первая секция — текст ответа, уровень 1, заголовок `title`. `author` фиксирован строкой `study-agent`. `executed` в документ не вшивать (stdout песочницы не является источником для цитирования).

`answer`:

- пробельный `question` → `ValueError`;
- retrieval, затем `expand` id концептов документов из хитов, глубина 1;
- в промпт передать только тексты хитов и подписи соседей; если хитов нет — ответ модели с пустым `citations`, без выдуманных `SourceSpan`;
- `execute_code=False` → `executed is None`, песочница не вызывается;
- `execute_code=True` → исполнить не более одного блока ` ```python `; ноль блоков → `executed is None`; два блока → `SandboxPolicyError`, ответ пользователю не возвращать;
- `citations` — подмножество `SourceSpan` хитов, которые модель перечислила. Неизвестный span отбросить.

Крайние случаи: Unicode в заголовке и теле; `level=0` и `level=4`; путь без родительского каталога; обрыв диска имитировать не нужно, но временный файл при `ExportError` после открытия удалить; существующий файл назначения заменить только после успешной записи; `fmt` вне литерала не принимать (тип уже это запрещает, реализация должна бросить `ExportError` на любой другой `str`, если вызвана в обход проверки типов).

Критерий: `tests/test_export.py` открывает полученный docx через `python-docx` и pdf через `pypdf`, проверяет заголовок и отсутствие файла при невалидном level. `pytest` целиком зелёный.

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import ChatArea from './components/ChatArea.jsx';
import Composer from './components/Composer.jsx';
import AccountModal from './components/AccountModal.jsx';
import PlansModal from './components/PlansModal.jsx';
import WorkspaceModal from './components/WorkspaceModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import UpdatesModal from './components/UpdatesModal.jsx';
import ToastHost from './components/ToastHost.jsx';
import { formatBytes, isImageFile } from './fileUtils.js';
import { LATEST_UPDATE_ID } from './changelog.js';
import { pickGreeting } from './greetings.js';
import { getTier } from './capabilities.js';
import { showToast } from './toastBus.js';
import { streamAsk, backendFileToAttachment, checkBackendOnline, resetHistory, fetchLibrary, uploadBook, deleteBook } from './api/agentClient.js';

const WORKSPACES = [{ id: 'personal', name: 'Личное', icon: 'PawPrint' }];

const INITIAL_CONVERSATIONS = [];

const INITIAL_SKILLS = [
  { id: 's1', name: 'Конспект', description: 'Структура: тезис, пояснение, цитата из источника. Не выдумывай факты вне фрагментов.' },
];

const INITIAL_CONNECTORS = [
  { id: 'obsidian', connected: false },
  { id: 'telegram', connected: false },
];

const IMAGE_REQUEST_RE = /нарису|сгенерир.*(изображ|картин)|картинк|изображени/i;
const DRAFT_KEY = 'doggy-draft';
const SEEN_UPDATE_KEY = 'doggy-last-seen-update';
const USER_KEY = 'doggy-user';

function stripExt(name) {
  return name.replace(/\.[^.]+$/, '');
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage?.getItem('doggy-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [workspaces, setWorkspaces] = useState(WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('personal');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState('search');
  const [input, setInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    // A query passed in by the browser extension (?q=...) wins over any
    // leftover draft, since it's an explicit "ask this now" intent.
    const fromExtension = new URLSearchParams(window.location.search).get('q');
    if (fromExtension) return fromExtension;
    return window.sessionStorage?.getItem(DRAFT_KEY) || '';
  });
  const [messages, setMessages] = useState([]);
  const [chatStore, setChatStore] = useState({}); // chatId -> messages (session only)
  const [isWorking, setIsWorking] = useState(false);
  const stopRef = useRef(false);
  const abortControllerRef = useRef(null);
  const composerRef = useRef(null);
  const handledClipboardRef = useRef(new Set());

  const [attachedFiles, setAttachedFiles] = useState([]);
  const [quote, setQuote] = useState(null);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [webEnabled, setWebEnabled] = useState(false);

  const [skills, setSkills] = useState(INITIAL_SKILLS);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [books, setBooks] = useState([]);
  const [connectors, setConnectors] = useState(INITIAL_CONNECTORS);
  const [showSettings, setShowSettings] = useState(false);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  });
  const [showAuth, setShowAuth] = useState(false);

  const [plan, setPlan] = useState('Free');
  const [showAccount, setShowAccount] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [hasUnseenUpdates, setHasUnseenUpdates] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage?.getItem(SEEN_UPDATE_KEY) !== LATEST_UPDATE_ID;
  });

  const [backendOnline, setBackendOnline] = useState(null); // null = still checking
  useEffect(() => {
    let cancelled = false;
    checkBackendOnline().then((online) => {
      if (!cancelled) setBackendOnline(online);
    });
    fetchLibrary()
      .then((items) => {
        if (!cancelled) setBooks(items.map((item) => ({ id: item.id, title: item.title })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage?.setItem('doggy-theme', theme);
  }, [theme]);

  // Clean up the ?q= param from the extension's "ask" link once read.
  useEffect(() => {
    if (window.location.search.includes('q=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Draft persistence — if the tab closes by accident, the unsent prompt
  // survives for the rest of the browser session.
  useEffect(() => {
    window.sessionStorage?.setItem(DRAFT_KEY, input);
  }, [input]);

  useEffect(() => {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  }, [user]);

  const hasMessages = messages.length > 0;
  const visibleConversations = conversations.filter((c) => c.workspaceId === activeWorkspaceId);
  const activeConversation = conversations.find((c) => c.id === activeId);

  // Keep a per-chat copy of the thread: the backend remembers history by
  // chat_id, so the UI must let you come back to a conversation too.
  useEffect(() => {
    if (activeId && messages.length > 0) {
      setChatStore((prev) => (prev[activeId] === messages ? prev : { ...prev, [activeId]: messages }));
    }
  }, [activeId, messages]);
  const tier = getTier(user, plan);
  const greeting = useMemo(() => pickGreeting(user?.name), [hasMessages]);

  // Must come after activeConversation is declared above — the dependency
  // array is evaluated at render time, not deferred, so referencing it
  // earlier threw "Cannot access before initialization".
  useEffect(() => {
    document.title = activeConversation?.title ? `${activeConversation.title} · Doggy AI` : 'Doggy AI';
  }, [activeConversation?.title]);

  const updateAssistant = useCallback((id, updater) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }, []);

  const handleNewChat = useCallback(() => {
    if (isWorking) {
      showToast('Дождись ответа или останови генерацию');
      return;
    }
    setActiveId(null);
    setMessages([]);
    setAttachedFiles([]);
    setMobileSidebarOpen(false);
  }, [isWorking]);

  const handleSelect = useCallback(
    (id) => {
      if (isWorking) {
        showToast('Дождись ответа или останови генерацию');
        return;
      }
      setActiveId(id);
      setMessages(chatStore[id] || []);
      setAttachedFiles([]);
      setMobileSidebarOpen(false);
    },
    [isWorking, chatStore]
  );

  const handleDeleteChat = useCallback(
    (id) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setChatStore((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      resetHistory(id); // free the backend-side memory for this chat too
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
        setAttachedFiles([]);
      }
      showToast('Чат удалён');
    },
    [activeId]
  );

  const handleRenameChat = useCallback(
    (title) => {
      if (!activeId) return;
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, title } : c)));
    },
    [activeId]
  );

  const handleSelectWorkspace = useCallback((id) => {
    setActiveWorkspaceId(id);
    setActiveId(null);
    setMessages([]);
    setAttachedFiles([]);
  }, []);

  const handleAddFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList).map((file) => {
      const url = URL.createObjectURL(file);
      return {
        id: crypto.randomUUID(),
        name: file.name,
        size: formatBytes(file.size),
        file,
        url,
        previewUrl: isImageFile(file.name) ? url : undefined,
      };
    });
    setAttachedFiles((prev) => {
      const next = [...prev, ...incoming];
      if (next.length > 1) showToast('Бэкенд читает только один файл за раз — уйдёт первый');
      return next;
    });
  }, []);

  const handleRemoveFile = useCallback((id) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleToggleSkill = useCallback((id) => {
    setSelectedSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }, []);

  const handleAddConnectorItem = useCallback((connectorId, label) => {
    setAttachedFiles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: label, source: connectorId },
    ]);
  }, []);

  const handleToggleConnector = useCallback(() => {
    showToast('Коннекторы к этому агенту не подключены');
  }, []);

  // ---- Harness: skills ----
  const handleUploadSkill = useCallback((file) => {
    setSkills((prev) => [...prev, { id: crypto.randomUUID(), name: stripExt(file.name), description: '' }]);
  }, []);
  const handleRenameSkill = useCallback((id, name) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);
  const handleEditSkill = useCallback((id, description) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, description } : s)));
  }, []);
  const handleDeleteSkill = useCallback((id) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
    setSelectedSkillIds((prev) => prev.filter((s) => s !== id));
  }, []);

  // ---- Harness: library ----
  const handleUploadBook = useCallback(async (file) => {
    try {
      const saved = await uploadBook(file);
      setBooks((prev) => {
        const without = prev.filter((b) => b.id !== saved.id);
        return [...without, { id: saved.id, title: saved.title }];
      });
      showToast(`В индексе: ${saved.chunk_count} фрагм., ${saved.concept_count} понятий`);
    } catch (err) {
      showToast(err.message || 'Файл не проиндексирован');
    }
  }, []);
  const handleDeleteBook = useCallback(async (id) => {
    try {
      await deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      showToast(err.message || 'Не удалось удалить документ');
    }
  }, []);

  // ---- Auth ----
  const handleAuth = useCallback((newUser) => {
    setUser(newUser);
    setShowAuth(false);
  }, []);
  const handleLogout = useCallback(() => {
    setUser(null);
    setShowAccount(false);
  }, []);
  const handleDeleteAccount = useCallback(() => {
    setUser(null);
    setShowSettings(false);
    setShowAccount(false);
    setSkills([]);
    setBooks([]);
    setConnectors(INITIAL_CONNECTORS);
    setPlan('Free');
  }, []);
  const handleSaveProfile = useCallback((updated) => {
    setUser((prev) => ({ ...prev, ...updated }));
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if ((!trimmed && attachedFiles.length === 0) || isWorking) return;

      stopRef.current = false;
      const sentFiles = attachedFiles;
      const sentQuote = quote;
      const userMsg = { id: crypto.randomUUID(), role: 'user', content: trimmed, files: sentFiles, quote: sentQuote };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setAttachedFiles([]);
      setQuote(null);

      let chatId = activeId;
      if (!activeId) {
        const newConv = {
          id: crypto.randomUUID(),
          title: (trimmed || sentFiles[0]?.name || 'Новый чат').slice(0, 40),
          workspaceId: activeWorkspaceId,
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveId(newConv.id);
        chatId = newConv.id;
      }

      const assistantId = crypto.randomUUID();
      const startedAt = Date.now();

      const replyDone = (content) =>
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', mode, status: 'done', startedAt, durationMs: 150, content, files: [] },
        ]);

      // ---- image generation: not implemented on the backend yet ----
      if (IMAGE_REQUEST_RE.test(trimmed)) {
        replyDone('Генерация изображений пока в разработке — бэкенд её ещё не поддерживает.');
        return;
      }

      // ---- Agent mode runs the same answer and, if the model emits one
      // python fence, executes that fence in the sandbox. ----

      // ---- real call against server_core.py ----
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', mode, status: 'thinking', startedAt, reasoning: null, commands: [], content: '' },
      ]);
      setIsWorking(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let currentCommands = [];
        let streamedContent = '';
        let sawAnyEvent = false;
        let finished = false;
        const notices = [];

        for await (const event of streamAsk({
          chatId,
          question: trimmed,
          attachmentFile: sentFiles[0]?.file,
          taskPrompt: skills
            .filter((skill) => selectedSkillIds.includes(skill.id))
            .map((skill) => `${skill.name}: ${skill.description}`)
            .join('\n'),
          executeCode: mode === 'agent',
          signal: controller.signal,
        })) {
          sawAnyEvent = true;
          if (stopRef.current) break;

          if (event.type === 'stage') {
            if (reasoningEnabled) {
              currentCommands = currentCommands.map((c) => ({ ...c, status: 'done' }));
              currentCommands = [...currentCommands, { id: crypto.randomUUID(), label: event.text, status: 'running' }];
              updateAssistant(assistantId, (m) => ({ ...m, status: 'running', commands: currentCommands }));
            }
          } else if (event.type === 'chunk') {
            streamedContent += event.text;
            updateAssistant(assistantId, (m) => ({ ...m, status: 'running', content: streamedContent }));
          } else if (event.type === 'permission_request' || event.type === 'action_ready') {
            // Browser-control requests are confirmed in Telegram / the extension —
            // the web client can't act on a page, so just surface it.
            const where = event.domain ? ` на ${event.domain}` : '';
            notices.push(
              event.type === 'permission_request'
                ? `> Агент хочет выполнить действие${where}: ${event.description}. Подтверди это в Telegram — в веб-версии управление браузером пока в разработке.`
                : `> Агент готов выполнить действие${where}: ${event.description}.`
            );
          } else if (event.type === 'done') {
            finished = true;
            const files = (event.files || []).map(backendFileToAttachment);
            const answer = event.answer || streamedContent || 'Готово.';
            const finalContent = notices.length ? `${answer}\n\n${notices.join('\n\n')}` : answer;
            updateAssistant(assistantId, (m) => ({
              ...m,
              status: 'done',
              content: finalContent,
              commands: currentCommands.map((c) => ({ ...c, status: 'done' })),
              files,
              durationMs: Date.now() - startedAt,
            }));
          } else if (event.type === 'error') {
            finished = true;
            updateAssistant(assistantId, (m) => ({
              ...m,
              status: 'done',
              content: `Ошибка от сервера агента: ${event.message || 'неизвестная ошибка'}`,
              durationMs: Date.now() - startedAt,
            }));
          }
        }

        if (stopRef.current) {
          updateAssistant(assistantId, (m) => ({
            ...m,
            status: 'done',
            content: m.content || 'Остановлено.',
            durationMs: Date.now() - startedAt,
          }));
        } else if (sawAnyEvent && !finished) {
          // stream closed without a final event — don't leave the bubble spinning
          updateAssistant(assistantId, (m) => ({
            ...m,
            status: 'done',
            content: m.content || 'Соединение с сервером оборвалось до конца ответа. Попробуй ещё раз.',
            commands: (m.commands || []).map((c) => ({ ...c, status: 'done' })),
            durationMs: Date.now() - startedAt,
          }));
        } else if (!sawAnyEvent) {
          updateAssistant(assistantId, (m) => ({
            ...m,
            status: 'done',
            content: 'Сервер агента не ответил. Убедись, что бэкенд запущен (`uvicorn server_core:app`).',
            durationMs: Date.now() - startedAt,
          }));
        }
      } catch (err) {
        updateAssistant(assistantId, (m) => ({
          ...m,
          status: 'done',
          content:
            err.name === 'AbortError'
              ? m.content || 'Остановлено.'
              : `Не удалось связаться с сервером агента: ${err.message}`,
          durationMs: Date.now() - startedAt,
        }));
      } finally {
        abortControllerRef.current = null;
        setIsWorking(false);
      }
    },
    [activeId, activeWorkspaceId, mode, isWorking, updateAssistant, attachedFiles, quote, reasoningEnabled, skills, selectedSkillIds]
  );

  const handleStop = useCallback(() => {
    stopRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  const handleQuote = useCallback((text) => {
    setQuote(text);
  }, []);

  const handleOpenUpdates = useCallback(() => {
    setShowUpdates(true);
    setHasUnseenUpdates(false);
    window.localStorage?.setItem(SEEN_UPDATE_KEY, LATEST_UPDATE_ID);
  }, []);

  // ---- global hotkeys ----
  // Uses e.code (physical key position) instead of e.key so shortcuts keep
  // working regardless of active keyboard layout (e.g. Cyrillic/ЙЦУКЕН) —
  // e.key would otherwise report the localized character, not "k"/"b"/"l".
  useEffect(() => {
    const handleKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.code === 'KeyK') {
        e.preventDefault();
        handleNewChat();
        return;
      }
      if (mod && e.code === 'KeyB') {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
        return;
      }
      if (mod && e.shiftKey && e.code === 'KeyL') {
        e.preventDefault();
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
        return;
      }
      if (e.code === 'Escape') {
        if (showUpdates) return setShowUpdates(false);
        if (showSettings) return setShowSettings(false);
        if (showAccount) return setShowAccount(false);
        if (showPlans) return setShowPlans(false);
        if (showWorkspaceModal) return setShowWorkspaceModal(false);
        if (showAuth) return setShowAuth(false);
        if (isWorking) return handleStop();
        return;
      }
      if (e.code === 'Slash' && !mod) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
          activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          composerRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, showAccount, showPlans, showWorkspaceModal, showAuth, showUpdates, isWorking, handleNewChat, handleStop]);

  const composer = (autoFocus) => (
    <Composer
      ref={composerRef}
      value={input}
      onChange={setInput}
      onSend={() => sendMessage(input)}
      mode={mode}
      onModeChange={setMode}
      isWorking={isWorking}
      onStop={handleStop}
      autoFocus={autoFocus}
      isNewChat={!hasMessages}
      attachedFiles={attachedFiles}
      onAddFiles={handleAddFiles}
      onRemoveFile={handleRemoveFile}
      quote={quote}
      onRemoveQuote={() => setQuote(null)}
      reasoningEnabled={reasoningEnabled}
      onToggleReasoning={() => setReasoningEnabled((v) => !v)}
      webEnabled={webEnabled}
      onToggleWeb={() => showToast('Веб-поиск у этого агента не подключён')}
      skills={skills}
      selectedSkillIds={selectedSkillIds}
      onToggleSkill={handleToggleSkill}
      connectors={connectors}
      onAddConnectorItem={handleAddConnectorItem}
      handledClipboardTexts={handledClipboardRef}
    />
  );

  return (
    <div className="h-screen w-screen flex bg-bg text-text-primary overflow-hidden">
      <Sidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        conversations={visibleConversations}
        activeId={activeId}
        onSelect={handleSelect}
        onDeleteChat={handleDeleteChat}
        onNewChat={handleNewChat}
        onOpenAccount={() => setShowAccount(true)}
        userName={user?.name}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={() => setShowWorkspaceModal(true)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setMobileSidebarOpen(true)}
          chatTitle={activeConversation?.title}
          onRenameChat={handleRenameChat}
          plan={plan}
          onOpenPlans={() => setShowPlans(true)}
          hasUnseenUpdates={hasUnseenUpdates}
          onOpenUpdates={handleOpenUpdates}
          backendOnline={backendOnline}
        />

        {hasMessages ? (
          <>
            <ChatArea messages={messages} onQuote={handleQuote} />
            <motion.div
              layoutId="composer-shell"
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="px-4 md:px-6 pb-4 md:pb-6 pt-2"
            >
              <div className="max-w-[720px] mx-auto">
                {composer(false)}
                <p className="mt-2 text-center text-[11px] text-text-tertiary">
                  Doggy AI может ошибаться. Проверяй важные факты.
                </p>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-center mb-6 animate-fadeRise">
              <h1 className="font-display text-[28px] md:text-[32px] text-text-primary leading-tight">
                {greeting}
              </h1>
              <p className="mt-2 text-text-secondary text-[14px]">
                Мощный ИИ-агент для ресёрча и учёбы
              </p>
            </div>

            <motion.div
              layoutId="composer-shell"
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="w-full max-w-[640px]"
            >
              {composer(true)}
            </motion.div>
          </div>
        )}
      </div>

      <AccountModal
        open={showAccount}
        onClose={() => setShowAccount(false)}
        user={user}
        onOpenAuth={() => {
          setShowAccount(false);
          setShowAuth(true);
        }}
        onOpenSettings={() => {
          setShowAccount(false);
          setShowSettings(true);
        }}
        onLogout={handleLogout}
        plan={plan}
        onOpenPlans={() => {
          setShowAccount(false);
          setShowPlans(true);
        }}
      />

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} onAuth={handleAuth} />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onSaveProfile={handleSaveProfile}
        telegramLinked={Boolean(user?.telegram)}
        onOpenTelegram={() => {
          if (user?.telegram) {
            showToast('Аккаунт уже привязан к Telegram');
          } else {
            setShowSettings(false);
            setShowAuth(true);
          }
        }}
        onDeleteAccount={handleDeleteAccount}
        skills={skills}
        onUploadSkill={handleUploadSkill}
        onRenameSkill={handleRenameSkill}
        onEditSkill={handleEditSkill}
        onDeleteSkill={handleDeleteSkill}
        books={books}
        onUploadBook={handleUploadBook}
        onDeleteBook={handleDeleteBook}
        connectors={connectors}
        onToggleConnector={handleToggleConnector}
      />

      <PlansModal
        open={showPlans}
        onClose={() => setShowPlans(false)}
        currentPlan={plan}
        onSelectPlan={(p) => {
          setPlan(p);
          setShowPlans(false);
        }}
      />

      <WorkspaceModal
        open={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
      />

      <UpdatesModal open={showUpdates} onClose={() => setShowUpdates(false)} />
      <ToastHost />
    </div>
  );
}

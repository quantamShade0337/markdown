"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const STORAGE_KEY = "minimal-md-editor-content";
const STORAGE_TITLE_KEY = "minimal-md-editor-title";
const STORAGE_THEME_KEY = "minimal-md-editor-theme";

const STARTER_MD = `# Minimal Markdown Editor Walkthrough

Use this template to try every feature, one by one.

---

## 1) Title + Local Save

Rename the title in the top-left (try: **My First Draft**).
Type a sentence here, refresh the page, and confirm your content is still here.

> Auto-save is local-first and stored in your browser.

---

## 2) Insert Menu (Center: Insert)

Try each insert option and see live preview instantly:

### Heading
This section is a heading example.

### Bold + Italic
Make text **bold** and *italic*.

### Quote
> "Write as clearly as possible."

### Code Block
\`\`\`ts
const message = "Instant preview with no lag";
console.log(message);
\`\`\`

### Checklist
- [ ] Open the Insert menu
- [ ] Add a heading
- [ ] Add a code block
- [ ] Add a table

### Table
| Feature | Where | Status |
| --- | --- | --- |
| Insert | Top center | ✅ |
| Open \`.md\` | Top center | ✅ |
| Export \`.md\` | Top center | ✅ |
| Export \`.html\` | Top center | ✅ |

---

## 3) Open a File (\`Open\`)

Click **Open** and load any \`.md\` file from your computer.

---

## 4) Export (\`.md\` and \`.html\`)

When ready, click:
- \`.md\` to download raw markdown
- \`.html\` to download rendered HTML document

---

## 5) Preview + Split Layout

Left side: editor.
Right side: live preview.
Keep typing here to see instant updates.

---

## 6) Footer Stats

Watch the footer update in real time:
- Word count
- Character count
- Reading time
- Last saved time

---

## 7) Theme Toggle + Settings Icon

Use the top-right theme toggle to switch between sans and mono text.
Settings icon is present for future options.

---

Done. You just tested the full app. Start your real draft below:

## New Draft

`;

const INSERT_OPTIONS = [
  { label: "Heading", syntax: "\n## Heading\n" },
  { label: "Bold", syntax: "**bold**" },
  { label: "Italic", syntax: "*italic*" },
  { label: "Code Block", syntax: "\n```\ncode\n```\n" },
  { label: "Checklist", syntax: "\n- [ ] Task\n- [ ] Task\n" },
  { label: "Table", syntax: "\n| Column | Column |\n| --- | --- |\n| Value | Value |\n" },
  { label: "Quote", syntax: "\n> Quote\n" },
] as const;

type ThemeMode = "sans" | "mono";

const formatTime = (date: Date | null): string => {
  if (!date) {
    return "Not saved";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const estimateReadingMinutes = (wordCount: number): number => {
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

const normalizeCheckboxMarkdown = (markdown: string): string =>
  markdown.replace(/^([ \t]*)\[(x|X| )\](?:[ \t]+(.*)|$)/gm, (_, indent: string, state: string, text: string) => {
    const checkboxState = state.toLowerCase() === "x" ? "x" : " ";
    const content = text ? ` ${text}` : "";

    return `${indent}- [${checkboxState}]${content}`;
  });

const getInitialContent = (): string => {
  if (typeof window === "undefined") {
    return STARTER_MD;
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? STARTER_MD;
};

const getInitialTitle = (): string => {
  if (typeof window === "undefined") {
    return "Untitled";
  }

  return window.localStorage.getItem(STORAGE_TITLE_KEY) ?? "Untitled";
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "sans";
  }

  const stored = window.localStorage.getItem(STORAGE_THEME_KEY);
  return stored === "mono" ? "mono" : "sans";
};

const getInitialSaveTime = (): Date | null => {
  if (typeof window === "undefined") {
    return null;
  }

  if (
    window.localStorage.getItem(STORAGE_KEY) ||
    window.localStorage.getItem(STORAGE_TITLE_KEY)
  ) {
    return new Date();
  }

  return null;
};

export default function Home() {
  const [title, setTitle] = useState(getInitialTitle);
  const [content, setContent] = useState(getInitialContent);
  const [lastSaved, setLastSaved] = useState<Date | null>(getInitialSaveTime);
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const insertMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const trimmed = content.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = content.length;

    return {
      words,
      chars,
      readingMinutes: estimateReadingMinutes(words),
    };
  }, [content]);

  const previewContent = useMemo(() => normalizeCheckboxMarkdown(content), [content]);

  const themeClasses = {
    bg: "bg-[#050505]",
    text: "text-white",
    secondaryText: "text-[#888888]",
    border: "border-[#1A1A1A]",
    hover: "hover:bg-[#0D0D0D]",
    input: "bg-[#050505] text-white",
    divider: "bg-[#1A1A1A]",
  };

  const textStyle = theme === "mono" ? "font-mono" : "font-sans";

  const handleInsert = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${content.slice(0, start)}${syntax}${content.slice(end)}`;
    setContent(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setLastSaved(new Date());
    setIsInsertOpen(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + syntax.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleOpenFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setContent(text);
      window.localStorage.setItem(STORAGE_KEY, text);
      const nextTitle = selected.name.replace(/\.md$/i, "") || "Untitled";
      setTitle(nextTitle);
      window.localStorage.setItem(STORAGE_TITLE_KEY, nextTitle);
      setLastSaved(new Date());
    };
    reader.readAsText(selected);

    event.target.value = "";
  };

  const downloadFile = (filename: string, data: string, mimeType: string) => {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMd = () => {
    const safeTitle = title.trim() || "untitled";
    downloadFile(`${safeTitle}.md`, content, "text/markdown;charset=utf-8");
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    window.localStorage.setItem(STORAGE_KEY, value);
    setLastSaved(new Date());
  };

  const handleTitleChange = (value: string) => {
    const nextTitle = value || "Untitled";
    setTitle(value);
    window.localStorage.setItem(STORAGE_TITLE_KEY, nextTitle);
    setLastSaved(new Date());
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === "sans" ? "mono" : "sans";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
  };

  const handleResetTemplate = () => {
    setTitle("Untitled");
    setContent(STARTER_MD);
    setLastSaved(new Date());
    window.localStorage.setItem(STORAGE_TITLE_KEY, "Untitled");
    window.localStorage.setItem(STORAGE_KEY, STARTER_MD);
    setIsSettingsOpen(false);
  };

  const handleClearSavedData = () => {
    setTitle("Untitled");
    setContent(STARTER_MD);
    setLastSaved(null);
    window.localStorage.removeItem(STORAGE_TITLE_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    setIsSettingsOpen(false);
  };

  const handleExportHtml = async () => {
    const html = String(
      await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(previewContent)
    );

    const safeTitle = title.trim() || "untitled";
    const wrapped = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    body { background: #000000; color: #FFFFFF; font-family: ui-sans-serif, system-ui, sans-serif; max-width: 860px; margin: 0 auto; padding: 32px; line-height: 1.7; }
    pre, code { background: #0A0A0A; border: 1px solid #1A1A1A; }
    pre { padding: 12px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #1A1A1A; padding: 8px; text-align: left; }
    blockquote { border-left: 2px solid #1A1A1A; margin-left: 0; padding-left: 12px; color: #888888; }
    a { color: #FFFFFF; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

    downloadFile(`${safeTitle}.html`, wrapped, "text/html;charset=utf-8");
  };

  const handleSettingsToggle = () => {
    setIsSettingsOpen((open) => !open);
    setIsInsertOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        isInsertOpen &&
        insertMenuRef.current &&
        !insertMenuRef.current.contains(target)
      ) {
        setIsInsertOpen(false);
      }

      if (
        isSettingsOpen &&
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(target)
      ) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isInsertOpen, isSettingsOpen]);

  return (
    <div
      className={`flex min-h-screen flex-col overflow-hidden ${themeClasses.bg} ${themeClasses.text} ${textStyle}`}
    >
      <header
        className={`relative grid h-14 grid-cols-3 items-center border-b px-4 ${themeClasses.border}`}
      >
        <div className="min-w-0 pr-2">
          <input
            type="text"
            value={title}
            aria-label="Document title"
            onChange={(event) => handleTitleChange(event.target.value)}
            className={`w-full truncate border-none bg-transparent text-base font-medium outline-none ${themeClasses.text}`}
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <div ref={insertMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsInsertOpen((open) => !open)}
              className={`rounded border px-3 py-1.5 transition ${themeClasses.border} ${themeClasses.hover}`}
            >
              Insert
            </button>

            {isInsertOpen ? (
              <div
                className={`absolute left-0 top-10 z-20 min-w-44 border ${themeClasses.border} ${themeClasses.bg}`}
              >
                {INSERT_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleInsert(option.syntax)}
                    className={`block w-full px-3 py-2 text-left text-sm transition ${themeClasses.hover}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`rounded border px-3 py-1.5 transition ${themeClasses.border} ${themeClasses.hover}`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={handleExportMd}
            className={`rounded border px-3 py-1.5 transition ${themeClasses.border} ${themeClasses.hover}`}
          >
            .md
          </button>
          <button
            type="button"
            onClick={handleExportHtml}
            className={`rounded border px-3 py-1.5 transition ${themeClasses.border} ${themeClasses.hover}`}
          >
            .html
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            onChange={handleOpenFile}
            className="hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <div ref={settingsMenuRef} className="relative">
            <button
              type="button"
              aria-label="Settings"
              aria-expanded={isSettingsOpen}
              onClick={handleSettingsToggle}
              className={`rounded border p-2 transition ${themeClasses.border} ${themeClasses.hover}`}
            >
              ⚙
            </button>

            {isSettingsOpen ? (
              <div
                className={`absolute right-0 top-10 z-20 min-w-52 border ${themeClasses.border} ${themeClasses.bg}`}
              >
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className={`block w-full px-3 py-2 text-left text-sm transition ${themeClasses.hover}`}
                >
                  Toggle theme
                </button>
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className={`block w-full px-3 py-2 text-left text-sm transition ${themeClasses.hover}`}
                >
                  Reset template
                </button>
                <button
                  type="button"
                  onClick={handleClearSavedData}
                  className={`block w-full px-3 py-2 text-left text-sm transition ${themeClasses.hover}`}
                >
                  Clear saved draft
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleThemeToggle}
            className={`rounded border px-3 py-1.5 text-xs uppercase tracking-wide transition ${themeClasses.border} ${themeClasses.hover}`}
          >
            {theme === "sans" ? "Mono" : "Sans"}
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 overflow-hidden grid-cols-1 md:grid-cols-[1fr_1px_1fr]">
        <section className="min-h-0 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => handleContentChange(event.target.value)}
            spellCheck={false}
            className={`h-full min-h-[280px] w-full resize-none overflow-y-auto border-none p-6 text-base leading-7 outline-none ${themeClasses.input}`}
            aria-label="Markdown editor"
            placeholder="Start writing..."
          />
        </section>

        <div className={`hidden md:block ${themeClasses.divider}`} />

        <section className="min-h-0 overflow-y-auto p-6">
          <div
            ref={previewRef}
            className={`markdown-preview max-w-none text-base leading-7 ${themeClasses.text}`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
            >
              {previewContent}
            </ReactMarkdown>
          </div>
        </section>
      </main>

      <footer
        className={`grid h-11 grid-cols-2 items-center border-t px-4 text-xs md:grid-cols-4 ${themeClasses.border} ${themeClasses.secondaryText}`}
      >
        <p>Words: {stats.words}</p>
        <p>Characters: {stats.chars}</p>
        <p>Reading time: {stats.readingMinutes} min</p>
        <p className="text-right">Last saved: {formatTime(lastSaved)}</p>
      </footer>
    </div>
  );
}

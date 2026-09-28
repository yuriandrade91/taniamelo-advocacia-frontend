"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { Label } from "@heroui/react";

/**
 * Editor rich text (TipTap) para campos de texto livre longo.
 *
 * O valor trafega como HTML — o backend já aceita HTML em `content`
 * (`ClientInterviewRequestDTO`), então trocar o textarea simples pelo editor
 * não muda o payload, só o que o usuário consegue formatar.
 */

function BulletListIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </svg>
  );
}

function OrderedListIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M10 6h11M10 12h11M10 18h11" />
      <path d="M4 4h1v4M4 8h2" />
      <path d="M4 14h2.5c.6 0 1 .4 1 1s-.5 1-1 1H5.5c1 0 2 .4 2 1.5S6.5 19 5.5 19H4" />
    </svg>
  );
}

function QuoteIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 8a3 3 0 0 0-3 3v2a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a3 3 0 0 0-1-4Z" />
      <path d="M17 8a3 3 0 0 0-3 3v2a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a3 3 0 0 0-1-4Z" />
    </svg>
  );
}

function ToolbarButton({
  isActive,
  isDisabled,
  onClick,
  label,
  children,
}: {
  isActive: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Sem isto o clique tira o foco do editor antes do `onClick` rodar, e o
      // TipTap perde a seleção sobre a qual o comando deveria aplicar.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      aria-pressed={isActive}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded text-sm font-medium hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40 ${
        isActive ? "bg-light-secondary text-secondary" : "text-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-black/10 px-2 py-1.5">
      <ToolbarButton
        label="Negrito"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        label="Itálico"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Sublinhado"
        isActive={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        label="Tachado"
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <span className="mx-1 h-4 w-px bg-black/10" aria-hidden="true" />

      <ToolbarButton
        label="Lista com marcadores"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Lista numerada"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <OrderedListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Citação"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <QuoteIcon />
      </ToolbarButton>
    </div>
  );
}

export type RichTextFieldProps = {
  label: string;
  /** HTML — o formato que `ClientInterviewRequestDTO.content` aceita. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  onBlur?: () => void;
};

export function RichTextField({
  label,
  value,
  onChange,
  placeholder,
  className,
  isRequired,
  isInvalid,
  errorMessage,
  isDisabled,
  onBlur,
}: RichTextFieldProps) {
  const editor = useEditor({
    // Next.js renderiza o editor no servidor por padrão; sem isto o HTML do
    // primeiro paint diverge do client e o React acusa hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      CharacterCount.configure(),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editable: !isDisabled,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class:
          "min-h-32 px-3 py-2 text-sm text-gray-100 focus:outline-none [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-secondary/50 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500",
      },
    },
  });

  // Sincroniza valor vindo de fora (reset do formulário, dados carregados)
  // sem reescrever a cada tecla — só quando o HTML realmente diverge do que
  // o editor já tem, senão o cursor pularia pro fim a cada `onChange`.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!isDisabled);
  }, [editor, isDisabled]);

  const characters =
    editor?.storage.characterCount?.characters() ??
    value.replace(/<[^>]*>/g, "").length;

  return (
    <div className={className}>
      <Label className="text-secondary" isRequired={isRequired}>
        {label}
      </Label>
      <div
        className={`form-border-style mt-1 overflow-hidden ${
          isInvalid ? "border-danger" : ""
        } ${isDisabled ? "opacity-60" : ""}`}
      >
        {editor && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        {isInvalid && errorMessage ? (
          <p className="text-sm text-danger">{errorMessage}</p>
        ) : (
          <span />
        )}
        <span className="text-xs text-gray-100">
          {characters} caractere{characters === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

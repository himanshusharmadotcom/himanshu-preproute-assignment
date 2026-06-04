import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import TextAlignExt from '@tiptap/extension-text-align';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image,
  Sigma,
  Trash2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onDelete?: () => void;
}

/* ── toolbar button ──────────────────────────────────── */
const ToolBtn: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault(); // preserve editor focus
      onClick();
    }}
    className={`w-7 h-7 rounded flex items-center justify-center transition-colors
      ${active
        ? 'bg-[#EEF1FD] text-[#4361EE]'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0" />;

/* ── editor ──────────────────────────────────────────── */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type here',
  minHeight = '120px',
  onDelete,
}) => {
  // flag: when we programmatically set content, suppress the onChange echo
  const settingContent = useRef(false);
  // always-current ref so the useEditor onUpdate closure is never stale
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExt,
      TextAlignExt.configure({ types: ['heading', 'paragraph'] }),
      LinkExt.configure({ openOnClick: false, autolink: true }),
      ImageExt.configure({ inline: false, allowBase64: true }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-editor-content',
        style: `min-height:${minHeight}; padding:10px 12px; font-size:14px; color:#374151; outline:none;`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (settingContent.current) return;
      const html = ed.getHTML();
      onChangeRef.current(html === '<p></p>' ? '' : html);
    },
  });

  /* sync when question switches (external value changes) */
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    const current = editor.getHTML();
    const currentNorm = current === '<p></p>' ? '' : current;
    if (currentNorm !== incoming) {
      settingContent.current = true;
      editor.commands.setContent(incoming || '<p></p>');
      // reset flag after microtask so onUpdate has already fired
      Promise.resolve().then(() => { settingContent.current = false; });
    }
  }, [value, editor]);

  /* ── link ── */
  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = (editor.getAttributes('link').href as string) ?? '';
    const url = window.prompt('Enter URL', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  /* ── image ── */
  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  /* ── formula ── */
  const addFormula = useCallback(() => {
    if (!editor) return;
    const f = window.prompt('Enter formula (LaTeX)', 'E = mc^2');
    if (f) editor.chain().focus().insertContent(`<code>${f}</code>`).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">

      {/* toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 flex-wrap">

        <ToolBtn title="Italic (Ctrl+I)" active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={13} />
        </ToolBtn>

        <ToolBtn title="Bold (Ctrl+B)" active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={13} />
        </ToolBtn>

        <ToolBtn title="Underline (Ctrl+U)" active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline size={13} />
        </ToolBtn>

        <ToolBtn title="Strikethrough" active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={13} />
        </ToolBtn>

        <ToolBtn title="Link" active={editor.isActive('link')} onClick={setLink}>
          <Link size={13} />
        </ToolBtn>

        <Sep />

        <ToolBtn title="Align left" active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={13} />
        </ToolBtn>

        <ToolBtn title="Align center" active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={13} />
        </ToolBtn>

        <ToolBtn title="Align right" active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={13} />
        </ToolBtn>

        <ToolBtn title="Justify" active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={13} />
        </ToolBtn>

        <Sep />

        <ToolBtn title="Bullet list" active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={13} />
        </ToolBtn>

        <ToolBtn title="Numbered list" active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={13} />
        </ToolBtn>

        <Sep />

        <ToolBtn title="Insert image" onClick={addImage}>
          <Image size={13} />
        </ToolBtn>

        <ToolBtn title="Insert formula" onClick={addFormula}>
          <Sigma size={13} />
        </ToolBtn>
      </div>

      {/* editable area */}
      <div className="relative">
        <EditorContent editor={editor} />

        {/* placeholder */}
        {editor.isEmpty && (
          <span className="absolute top-[10px] left-3 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </span>
        )}

        {/* delete button */}
        {onDelete && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onDelete(); }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

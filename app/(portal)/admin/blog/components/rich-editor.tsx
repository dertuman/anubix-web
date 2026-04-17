'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon, Undo2, Redo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichEditorProps {
  value: string;
  onChange: (_html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, className }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-md border border-border' },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing…',
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep editor in sync when value is changed externally (e.g. after AI generation)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className={cn('rounded-md border border-border bg-background', className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const iconBtn = (active: boolean) =>
    cn(
      'h-8 w-8 p-0',
      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
    );

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const setImage = () => {
    const url = window.prompt('Image URL');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/30 p-1">
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </Button>
      <div className="mx-1 h-6 w-px bg-border" />
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('code'))} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-4" />
      </Button>
      <div className="mx-1 h-6 w-px bg-border" />
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </Button>
      <div className="mx-1 h-6 w-px bg-border" />
      <Button type="button" size="sm" variant="ghost" className={iconBtn(editor.isActive('link'))} onClick={setLink}>
        <LinkIcon className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(false)} onClick={setImage}>
        <ImageIcon className="size-4" />
      </Button>
      <div className="mx-1 h-6 w-px bg-border" />
      <Button type="button" size="sm" variant="ghost" className={iconBtn(false)} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" className={iconBtn(false)} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </Button>
    </div>
  );
}

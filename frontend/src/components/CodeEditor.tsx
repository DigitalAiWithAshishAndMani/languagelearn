import React, { useRef, useEffect, useState } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState<number>(1);

  // Sync line numbers count
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines || 1);
  }, [value]);

  // Sync scroll between textarea and line numbers gutter
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Handle Tab key press to insert 4 spaces
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      
      const newValue = val.substring(0, start) + '    ' + val.substring(end);
      onChange(newValue);

      // Reset selection range after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  // Generate line number list
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="code-container" style={styles.container}>
      <div className="code-header">
        <span>💻 Sandbox Editor</span>
        <span style={styles.langBadge}>{language.toUpperCase()}</span>
      </div>

      <div style={styles.editorArea}>
        <div ref={gutterRef} style={styles.gutter}>
          {lineNumbers.map((num) => (
            <div key={num} style={styles.lineNo}>
              {num}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          style={styles.textarea}
          placeholder="// Write your code solution here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '400px',
    background: '#1e1e24',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  langBadge: {
    background: 'rgba(6, 182, 212, 0.15)',
    color: 'var(--accent-cyan)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '0.75rem',
  },
  editorArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gutter: {
    width: '45px',
    background: '#121214',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'hidden',
    userSelect: 'none',
  },
  lineNo: {
    fontFamily: "'Fira Code', ui-monospace, monospace",
    fontSize: '14px',
    lineHeight: '22px',
    color: 'var(--text-muted)',
    height: '22px',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    fontFamily: "'Fira Code', ui-monospace, monospace",
    fontSize: '14px',
    lineHeight: '22px',
    padding: '16px',
    resize: 'none',
    outline: 'none',
    overflowY: 'auto',
    overflowX: 'auto',
    whiteSpace: 'pre',
    wordWrap: 'normal',
  },
};

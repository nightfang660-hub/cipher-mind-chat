import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const customStyle = {
    ...atomDark,
    'pre[class*="language-"]': {
      ...atomDark['pre[class*="language-"]'],
      background: 'hsl(var(--background))',
      borderRadius: '8px',
      padding: '12px',
      margin: 0,
      fontSize: '12px',
      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
      '@media (min-width: 768px)': {
        padding: '16px',
        fontSize: '14px',
      }
    },
    'code[class*="language-"]': {
      ...atomDark['code[class*="language-"]'],
      color: 'hsl(var(--matrix-green))',
      background: 'transparent',
      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    }
  };

  return (
    <div className="relative my-3 md:my-6 w-full max-w-full overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-background rounded-t-lg px-3 md:px-5 py-2 md:py-3 gap-2 border-b border-primary/20">
        <span className="text-primary font-mono text-xs md:text-base font-semibold truncate flex-1 min-w-0">
          {language}
        </span>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50"></div>
            <button 
              onClick={handleCopy}
              className={`text-lg md:text-xl cursor-pointer transition-all duration-200 touch-manipulation border-none bg-transparent p-1 ${
                copied 
                  ? 'text-green-500 scale-110' 
                  : 'text-primary hover:text-primary/80 hover:scale-110'
              }`}
              title={copied ? "Copied!" : "Click to copy code"}
              aria-label="Copy code"
            >
              ⧉
            </button>
          </div>
        </div>
      </div>
      
      {/* Code Content */}
      <div className="rounded-b-lg overflow-hidden w-full bg-background border border-primary/10">
        <div 
          className="max-h-[70vh] md:max-h-[80vh] overflow-x-auto overflow-y-auto enhanced-scroll w-full"
        >
          <SyntaxHighlighter
            language={language}
            style={customStyle}
            customStyle={{
              margin: 0,
              background: 'hsl(var(--background))',
              borderRadius: '0 0 8px 8px',
              padding: window.innerWidth < 768 ? '12px 16px' : '20px 24px',
              minWidth: '100%',
              maxWidth: '100%',
              whiteSpace: 'pre',
              overflow: 'visible',
              fontSize: window.innerWidth < 768 ? '13px' : '15px',
              lineHeight: window.innerWidth < 768 ? '1.6' : '1.8',
              display: 'block',
              wordBreak: 'break-word'
            }}
            wrapLines={true}
            wrapLongLines={true}
            PreTag="div"
            showLineNumbers={false}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;
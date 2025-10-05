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
    <div className="relative my-2 md:my-4 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between bg-background rounded-t-lg px-2 md:px-4 py-1.5 md:py-2 gap-2">
        <span className="text-primary font-mono text-xs md:text-sm truncate flex-1 min-w-0">{language}</span>
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500"></div>
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-500"></div>
            <div 
              onClick={handleCopy}
              className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500 cursor-pointer hover:bg-red-400 transition-colors touch-manipulation"
              title={copied ? "Copied!" : "Click to copy"}
            ></div>
          </div>
        </div>
      </div>
      <div className="rounded-b-lg overflow-hidden w-full">
        <div 
          className="max-h-[80vh] overflow-x-auto overflow-y-auto scrollbar-hidden w-full"
          style={{
            scrollbarWidth: 'none',
            scrollbarColor: 'transparent transparent'
          }}
        >
          <SyntaxHighlighter
            language={language}
            style={customStyle}
            customStyle={{
              margin: 0,
              background: 'hsl(var(--background))',
              borderRadius: '0 0 8px 8px',
              padding: window.innerWidth < 640 ? '8px' : '12px',
              minWidth: 'fit-content',
              maxWidth: 'none',
              whiteSpace: 'pre',
              overflow: 'visible',
              fontSize: window.innerWidth < 640 ? '11px' : '13px',
              display: 'inline-block'
            }}
            wrapLines={false}
            wrapLongLines={false}
            PreTag="div"
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;
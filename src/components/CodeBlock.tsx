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
        <button 
          onClick={handleCopy}
          className={`text-2xl md:text-3xl cursor-pointer transition-all duration-300 border-none bg-transparent p-2 md:p-3 ${
            copied 
              ? 'text-green-500 scale-125 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
              : 'text-primary hover:text-primary/90 hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(0,255,65,0.4)]'
          }`}
          title={copied ? "Copied!" : "Click to copy code"}
          aria-label="Copy code"
        >
          ⧉
        </button>
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
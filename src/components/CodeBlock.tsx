import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from "@/hooks/use-toast";

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', code }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        description: "✓ Code copied to clipboard!",
        duration: 2000,
        className: "bg-background border-primary/30 text-primary shadow-[0_0_15px_rgba(0,255,65,0.3)]"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      toast({
        description: "Failed to copy code",
        variant: "destructive",
        duration: 2000
      });
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
    <div className="relative my-3 md:my-6 w-full max-w-full overflow-hidden animate-fade-in">
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-[rgba(0,0,0,0.9)] rounded-t-lg px-3 md:px-5 py-3 md:py-4 gap-2 border border-primary/30 border-b-0 shadow-[0_0_20px_rgba(0,255,65,0.15)]">
        <span className="text-primary font-mono text-sm md:text-lg font-bold truncate flex-1 min-w-0 drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]">
          {language}
        </span>
        <button 
          onClick={handleCopy}
          className={`text-2xl md:text-3xl cursor-pointer transition-all duration-300 ease-out border-none bg-transparent p-2 md:p-3 rounded hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95 ${
            copied 
              ? 'text-primary scale-125 drop-shadow-[0_0_12px_rgba(0,255,65,0.8)] animate-pulse' 
              : 'text-primary/80 hover:text-primary hover:scale-125 hover:drop-shadow-[0_0_10px_rgba(0,255,65,0.6)]'
          }`}
          title={copied ? "Copied!" : "Click to copy code"}
          aria-label="Copy code"
          tabIndex={0}
        >
          ⧉
        </button>
      </div>
      
      {/* Code Content */}
      <div className="rounded-b-lg overflow-hidden w-full bg-[rgba(0,0,0,0.9)] border border-primary/30 border-t-0 shadow-[0_0_25px_rgba(0,255,65,0.15)]">
        <div 
          className="max-h-[70vh] md:max-h-[80vh] overflow-x-auto overflow-y-auto enhanced-scroll w-full scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50"
        >
          <SyntaxHighlighter
            language={language}
            style={customStyle}
            customStyle={{
              margin: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              borderRadius: '0 0 8px 8px',
              padding: window.innerWidth < 768 ? '16px' : '24px',
              minWidth: '100%',
              maxWidth: '100%',
              whiteSpace: 'pre',
              overflow: 'visible',
              fontSize: window.innerWidth < 768 ? '14px' : '16px',
              lineHeight: window.innerWidth < 768 ? '1.7' : '1.9',
              display: 'block',
              wordBreak: 'break-word',
              textShadow: '0 0 5px rgba(0, 255, 65, 0.3)'
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
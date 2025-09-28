import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      border: '1px solid hsl(var(--matrix-green))',
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
    <div className="relative my-2 md:my-4">
      <div className="flex items-center justify-between bg-background border border-primary/30 rounded-t-lg px-2 md:px-4 py-1.5 md:py-2">
        <span className="text-primary font-mono text-xs md:text-sm">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-5 w-5 md:h-6 md:w-6 p-0 hover:bg-primary/20 touch-manipulation"
        >
          {copied ? (
            <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-hacker" />
          ) : (
            <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
          )}
        </Button>
      </div>
      <div className="rounded-b-lg overflow-hidden border border-t-0 border-primary/30">
        <div className="max-h-[250px] md:max-h-[400px] overflow-auto">
          <SyntaxHighlighter
            language={language}
            style={customStyle}
            customStyle={{
              margin: 0,
              background: 'hsl(var(--background))',
              borderRadius: '0 0 8px 8px',
              overflow: 'visible'
            }}
            wrapLines={true}
            wrapLongLines={true}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;
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
      background: '#000000',
      border: '1px solid #00FF00',
      borderRadius: '8px',
      padding: '16px',
      margin: 0,
      fontSize: '14px',
      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    },
    'code[class*="language-"]': {
      ...atomDark['code[class*="language-"]'],
      color: '#00FF00',
      background: 'transparent',
      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    }
  };

  return (
    <div className="relative my-4">
      <div className="flex items-center justify-between bg-black border border-primary/30 rounded-t-lg px-4 py-2">
        <span className="text-primary font-mono text-sm">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0 hover:bg-primary/20"
        >
          {copied ? (
            <Check className="w-3 h-3 text-hacker" />
          ) : (
            <Copy className="w-3 h-3 text-primary" />
          )}
        </Button>
      </div>
      <div className="rounded-b-lg overflow-hidden border border-t-0 border-primary/30">
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          customStyle={{
            margin: 0,
            background: '#000000',
            borderRadius: '0 0 8px 8px',
            maxHeight: '400px',
            overflow: 'auto'
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Shield, Terminal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MatrixRain from '@/components/MatrixRain';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [terminalText, setTerminalText] = useState('');
  const navigate = useNavigate();

  // Check if user is already logged in and handle auth state changes
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/chat');
      }
    };
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/chat');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const terminalMessages = [
    '> INITIALIZING SECURE CONNECTION...',
    '> ESTABLISHING ENCRYPTED TUNNEL...',
    '> AUTHENTICATION PROTOCOL ACTIVE',
    '> READY FOR LOGIN CREDENTIALS',
  ];

  useEffect(() => {
    let messageIndex = 0;
    let charIndex = 0;
    
    const typeText = () => {
      if (messageIndex < terminalMessages.length) {
        const currentMessage = terminalMessages[messageIndex];
        if (charIndex < currentMessage.length) {
          setTerminalText(prev => prev + currentMessage[charIndex]);
          charIndex++;
          setTimeout(typeText, 50);
        } else {
          messageIndex++;
          charIndex = 0;
          setTerminalText(prev => prev + '\n');
          setTimeout(typeText, 500);
        }
      }
    };

    setTimeout(typeText, 1000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        // You can add toast notification here
      }
      // Success is handled by the auth state change listener
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <MatrixRain />
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-20" />
      
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Terminal Header */}
        <div className="mb-6 p-4 terminal-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-mono">SECURE_LOGIN.EXE</span>
            <div className="ml-auto flex gap-1">
              <div className="w-2 h-2 bg-hacker rounded-full" />
              <div className="w-2 h-2 bg-accent rounded-full" />
              <div className="w-2 h-2 bg-primary rounded-full status-online" />
            </div>
          </div>
          <pre className="text-xs text-primary/80 font-mono whitespace-pre-line">
            {terminalText}
            <span className="animate-terminal-blink">|</span>
          </pre>
        </div>

        {/* Login Form */}
        <Card className="terminal-border bg-card/90 backdrop-blur-md shadow-terminal">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-mono text-center text-primary glitch" data-text="ACCESS CONTROL">
              ACCESS CONTROL
            </CardTitle>
            <CardDescription className="text-center font-mono text-muted-foreground">
              Enter your credentials to access the secure system
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-primary font-mono">USER ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@system.net"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-terminal pl-10 font-mono"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-primary font-mono">ACCESS KEY</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-terminal pl-10 pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-primary/60 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-matrix font-mono uppercase tracking-wider"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    AUTHENTICATING...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    INITIATE LOGIN
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-muted-foreground">STATUS:</span>
                <span className="status-secure">SECURE CONNECTION</span>
              </div>
              <div className="flex items-center justify-between text-sm font-mono mt-1">
                <span className="text-muted-foreground">ENCRYPTION:</span>
                <span className="text-primary">AES-256 ACTIVE</span>
              </div>
              
              <div className="mt-4 text-center">
                <span className="text-sm text-muted-foreground font-mono">
                  Need access credentials?{' '}
                </span>
                <Link
                  to="/signup"
                  className="text-sm text-primary hover:text-primary/80 font-mono underline transition-colors"
                >
                  REQUEST_ACCESS.EXE
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
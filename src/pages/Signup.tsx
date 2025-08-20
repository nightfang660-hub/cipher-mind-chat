import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Shield, Terminal, CheckCircle, XCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MatrixRain from '@/components/MatrixRain';

interface PasswordStrength {
  score: number;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
    noCommon: boolean;
  };
}

const Signup: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [terminalText, setTerminalText] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      noCommon: false
    }
  });

  const terminalMessages = [
    '> INITIALIZING REGISTRATION PROTOCOL...',
    '> LOADING SECURITY PARAMETERS...',
    '> ENABLING ADVANCED ENCRYPTION...',
    '> SYSTEM READY FOR NEW USER CREATION',
  ];

  const commonPasswords = ['password', '123456', 'admin', 'letmein', 'welcome', 'monkey'];

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

  useEffect(() => {
    const checkPasswordStrength = (password: string) => {
      const requirements = {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /\d/.test(password),
        symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
        noCommon: !commonPasswords.some(common => password.toLowerCase().includes(common))
      };

      const score = Object.values(requirements).filter(Boolean).length;
      setPasswordStrength({ score, requirements });
    };

    if (formData.password) {
      checkPasswordStrength(formData.password);
    } else {
      setPasswordStrength({
        score: 0,
        requirements: {
          length: false,
          uppercase: false,
          lowercase: false,
          numbers: false,
          symbols: false,
          noCommon: false
        }
      });
    }
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordStrength.score < 6) {
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsLoading(false);
  };

  const getStrengthColor = (score: number) => {
    if (score < 3) return 'text-hacker';
    if (score < 5) return 'text-accent';
    return 'text-primary';
  };

  const getStrengthText = (score: number) => {
    if (score < 3) return 'WEAK - SYSTEM VULNERABLE';
    if (score < 5) return 'MODERATE - UPGRADE NEEDED';
    return 'STRONG - FORTRESS MODE';
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <MatrixRain />
      
      <div className="fixed inset-0 pointer-events-none scanlines opacity-20" />
      
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-6 p-4 terminal-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-mono">USER_REGISTRATION.EXE</span>
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

        <Card className="terminal-border bg-card/90 backdrop-blur-md shadow-terminal">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-mono text-center text-primary glitch" data-text="CREATE ACCESS">
              CREATE ACCESS
            </CardTitle>
            <CardDescription className="text-center font-mono text-muted-foreground">
              Initialize new user profile with maximum security
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-primary font-mono">EMAIL ADDRESS</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@secure.net"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="input-terminal pl-10 font-mono"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-primary font-mono">MASTER PASSWORD</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create fortress-level password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 p-3 terminal-border bg-secondary/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">SECURITY LEVEL:</span>
                      <span className={`text-xs font-mono ${getStrengthColor(passwordStrength.score)}`}>
                        {getStrengthText(passwordStrength.score)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                      {Object.entries({
                        'MIN 12 CHARS': passwordStrength.requirements.length,
                        'UPPERCASE': passwordStrength.requirements.uppercase,
                        'LOWERCASE': passwordStrength.requirements.lowercase,
                        'NUMBERS': passwordStrength.requirements.numbers,
                        'SYMBOLS': passwordStrength.requirements.symbols,
                        'NO COMMON': passwordStrength.requirements.noCommon,
                      }).map(([label, met]) => (
                        <div key={label} className="flex items-center gap-1">
                          {met ? (
                            <CheckCircle className="w-3 h-3 text-primary" />
                          ) : (
                            <XCircle className="w-3 h-3 text-hacker" />
                          )}
                          <span className={met ? 'text-primary' : 'text-muted-foreground'}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-primary font-mono">CONFIRM PASSWORD</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Verify master password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="input-terminal pl-10 pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-primary/60 hover:text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <div className="flex items-center gap-2 text-xs text-hacker font-mono">
                    <XCircle className="w-3 h-3" />
                    PASSWORDS DO NOT MATCH
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full btn-matrix font-mono uppercase tracking-wider"
                disabled={isLoading || passwordStrength.score < 6 || formData.password !== formData.confirmPassword}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    CREATING SECURE PROFILE...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    INITIALIZE USER
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-muted-foreground">PROTOCOL:</span>
                <span className="status-secure">MAXIMUM SECURITY</span>
              </div>
              <div className="flex items-center justify-between text-sm font-mono mt-1">
                <span className="text-muted-foreground">ENCRYPTION:</span>
                <span className="text-primary">QUANTUM RESISTANT</span>
              </div>
              
              <div className="mt-4 text-center">
                <span className="text-sm text-muted-foreground font-mono">
                  Already have access?{' '}
                </span>
                <Link
                  to="/login"
                  className="text-sm text-primary hover:text-primary/80 font-mono underline transition-colors"
                >
                  LOGIN.EXE
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
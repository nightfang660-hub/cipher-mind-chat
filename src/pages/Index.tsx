import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Users, MessageCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MatrixRain from '@/components/MatrixRain';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen relative">
      <MatrixRain />
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-20" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-4xl mx-auto text-center animate-fade-in-up">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-mono font-bold text-primary mb-4 glitch" data-text="CIPHER MIND">
              CIPHER MIND
            </h1>
            <div className="text-xl md:text-2xl font-mono text-accent mb-2">
              {"<"} ADVANCED AI CHAT INTERFACE {"/>"}
            </div>
            <p className="text-lg font-mono text-muted-foreground max-w-2xl mx-auto">
              Enter the neural network. Engage with cutting-edge AI technology 
              through our secure, encrypted chat interface.
            </p>
          </div>

          {/* Status Panel */}
          <div className="mb-8 p-4 terminal-border bg-card/80 backdrop-blur-sm max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-mono">SYSTEM_STATUS.LOG</span>
              </div>
              <div className="flex gap-1">
                <div className="status-online" />
                <span className="text-xs text-primary font-mono">ONLINE</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">CONNECTION:</span>
                <span className="text-primary">SECURE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">AI_CORE:</span>
                <span className="text-accent">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ENCRYPTION:</span>
                <span className="text-primary">ENABLED</span>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
            <Card className="terminal-border bg-card/90 backdrop-blur-md shadow-terminal hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary font-mono">
                  <Lock className="w-5 h-5" />
                  ACCESS SYSTEM
                </CardTitle>
                <CardDescription className="font-mono">
                  Authenticate with existing credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/login">
                  <Button className="w-full btn-matrix font-mono">
                    LOGIN.EXE
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="terminal-border bg-card/90 backdrop-blur-md shadow-terminal hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary font-mono">
                  <Users className="w-5 h-5" />
                  NEW USER
                </CardTitle>
                <CardDescription className="font-mono">
                  Create secure access profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/signup">
                  <Button className="w-full btn-hacker font-mono">
                    REGISTER.EXE
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto text-sm">
            <div className="p-4 terminal-border bg-card/60 backdrop-blur-sm">
              <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="font-mono text-primary mb-1">QUANTUM ENCRYPTION</div>
              <div className="font-mono text-muted-foreground">Military-grade security protocols</div>
            </div>
            
            <div className="p-4 terminal-border bg-card/60 backdrop-blur-sm">
              <MessageCircle className="w-6 h-6 text-accent mx-auto mb-2" />
              <div className="font-mono text-primary mb-1">AI NEURAL CORE</div>
              <div className="font-mono text-muted-foreground">Advanced conversation engine</div>
            </div>
            
            <div className="p-4 terminal-border bg-card/60 backdrop-blur-sm">
              <Terminal className="w-6 h-6 text-cyber mx-auto mb-2" />
              <div className="font-mono text-primary mb-1">HACKER INTERFACE</div>
              <div className="font-mono text-muted-foreground">Professional terminal experience</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-border max-w-2xl mx-auto">
            <div className="text-xs font-mono text-muted-foreground">
              © 2024 CIPHER MIND • CLASSIFIED SYSTEM • UNAUTHORIZED ACCESS PROHIBITED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

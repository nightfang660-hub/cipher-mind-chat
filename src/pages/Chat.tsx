import React, { useState, useEffect, useRef } from 'react';
import { Send, History, User, LogOut, Edit3, Upload, MessageSquare, Sparkles, MoreHorizontal, Trash2, Menu, X, Settings, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import MatrixRain from '@/components/MatrixRain';
import TypewriterText from '@/components/TypewriterText';
import CodeBlock from '@/components/CodeBlock';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User as UserType, Session } from '@supabase/supabase-js';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/useProfile';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  background_color: string;
  user_input_color: string;
  ai_response_color: string;
}

const Chat: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { profile, updateProfile } = useProfile(user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempColorValue, setTempColorValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Function to parse message content and detect code blocks
  const parseMessageContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index);
        if (textContent.trim()) {
          parts.push({ type: 'text', content: textContent });
        }
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[2],
        language: match[1] || 'text'
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex);
      if (textContent.trim()) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate('/login');
        } else {
          // Profile and conversations will be loaded automatically by hooks
          setTimeout(() => {
            loadConversations();
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/login');
      } else {
        loadConversations();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }
      
      setConversations(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      const loadedMessages: Message[] = data?.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at)
      })) || [];
      
      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const generateConversationTitle = (firstMessage: string) => {
    // Take first user message and truncate if longer than 30 characters
    const cleanMessage = firstMessage.trim();
    return cleanMessage.length > 30 ? cleanMessage.slice(0, 30) + '...' : cleanMessage;
  };

  const createNewConversation = async (firstMessage: string) => {
    try {
      const title = generateConversationTitle(firstMessage);
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user?.id,
          title: title
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }
      
      setCurrentConversationId(data.id);
      loadConversations();
      return data.id;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  };

  const saveMessage = async (conversationId: string, content: string, isUser: boolean) => {
    try {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: content,
          is_user: isUser
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) {
        console.error('Error deleting conversation:', error);
        return;
      }
      
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
      
      loadConversations();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    let conversationId = currentConversationId;
    
    // Create new conversation if none exists
    if (!conversationId) {
      conversationId = await createNewConversation(inputMessage);
      if (!conversationId) return;
    }

    setMessages(prev => [...prev, userMessage]);
    await saveMessage(conversationId, userMessage.content, true);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation context from recent messages (last 10 messages for context)
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }));
      
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { 
          message: userMessage.content,
          context: recentMessages
        }
      });

      if (error) {
        console.error('Error calling AI function:', error);
        throw error;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Sorry, I could not process your request.',
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setTypingMessageId(aiMessage.id);
      await saveMessage(conversationId, aiMessage.content, false);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      if (conversationId) {
        await saveMessage(conversationId, errorMessage.content, false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Sync temp color value with profile
  useEffect(() => {
    setTempColorValue(profile?.matrix_color || '#00FF00');
  }, [profile?.matrix_color]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  if (!user || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary font-mono">Authenticating...</div>
      </div>
    );
  }

  // Mobile Sidebar Component
  const MobileSidebar = () => (
    <Drawer open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
      <DrawerContent className="terminal-border bg-card/95 backdrop-blur-md h-[85vh]">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="font-mono text-primary text-sm">HISTORY</span>
              </div>
              <Button 
                onClick={() => setIsHistoryOpen(false)}
                className="h-8 w-8 p-0 bg-transparent border-0 text-primary hover:bg-primary/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              className="w-full btn-matrix font-mono text-xs"
              onClick={() => {
                setMessages([]);
                setCurrentConversationId(null);
                setIsHistoryOpen(false);
              }}
            >
              + NEW SESSION
            </Button>
          </div>
          
          {/* Chat History List */}
          <ScrollArea className="flex-1 p-4 enhanced-scroll">
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <Card 
                  key={conversation.id} 
                  className="terminal-border bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors group"
                  onClick={() => {
                    loadConversation(conversation.id);
                    setIsHistoryOpen(false);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-primary/80 truncate">
                          {conversation.title}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          {new Date(conversation.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="terminal-border bg-card">
                          <DropdownMenuItem 
                            className="font-mono text-xs text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conversation.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );

  // Desktop Sidebar Component
  const DesktopSidebar = () => (
    <>
      {/* Floating Toggle Button - Middle Left Edge */}
      <div className="fixed left-0 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="bg-background/90 border terminal-border text-primary hover:bg-primary/10 
                     rounded-none rounded-r-lg px-2 py-4 font-mono text-xs
                     shadow-lg backdrop-blur-sm transition-all duration-300"
          style={{ writingMode: 'horizontal-tb' }}
        >
          {isHistoryOpen ? '[<]' : '[>]'}
        </Button>
      </div>
      
      {/* Left Sidebar - Chat History */}
      <div className={`${isHistoryOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden
                      terminal-border bg-card/90 backdrop-blur-md flex flex-col`}>
        {isHistoryOpen && (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-primary" />
                <span className="font-mono text-primary text-sm">HISTORY</span>
              </div>
              <Button 
                className="w-full btn-matrix font-mono text-xs"
                onClick={() => {
                  setMessages([]);
                  setCurrentConversationId(null);
                }}
              >
                + NEW SESSION
              </Button>
            </div>
            
            {/* Chat History List */}
            <ScrollArea className="flex-1 p-4 enhanced-scroll">
              <div className="space-y-2">
                 {conversations.map((conversation) => (
                   <Card 
                     key={conversation.id} 
                     className="terminal-border bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors group"
                     onClick={() => loadConversation(conversation.id)}
                   >
                     <CardContent className="p-3">
                       <div className="flex items-center justify-between">
                         <div className="flex-1 min-w-0">
                           <TooltipProvider>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <div className="text-xs font-mono text-primary/80 truncate">
                                   {conversation.title.length > 30 
                                     ? conversation.title.slice(0, 30) + '...' 
                                     : conversation.title}
                                 </div>
                               </TooltipTrigger>
                               {conversation.title.length > 30 && (
                                 <TooltipContent className="terminal-border bg-card font-mono text-xs max-w-xs">
                                   <p>{conversation.title}</p>
                                 </TooltipContent>
                               )}
                             </Tooltip>
                           </TooltipProvider>
                           <div className="text-xs text-muted-foreground font-mono mt-1">
                             {new Date(conversation.created_at).toLocaleDateString()}
                           </div>
                         </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0">
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="terminal-border bg-card">
                            <DropdownMenuItem 
                              className="font-mono text-xs text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conversation.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen overflow-hidden relative flex" 
         style={{
           '--dynamic-matrix-color': profile?.matrix_color || '#00ff00',
           '--dynamic-border-color': profile?.matrix_color ? `${profile.matrix_color}66` : '#00ff0066'
         } as React.CSSProperties}>
      <MatrixRain 
        backgroundColor={profile?.background_color || '#003300'} 
        matrixColor={profile?.matrix_color || '#00ff00'}
      />
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 pointer-events-none scanlines opacity-10" />
      
      {/* Conditional Sidebar Rendering */}
      {isMobile ? <MobileSidebar /> : <DesktopSidebar />}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Fixed Top Header */}
        <div className="flex-shrink-0 p-3 md:p-4 terminal-border bg-card/80 backdrop-blur-sm 
                        flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                onClick={() => setIsHistoryOpen(true)}
                className="bg-transparent border-0 text-primary hover:bg-primary/10 p-2 h-8 w-8"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <div className="text-primary font-mono font-semibold text-sm md:text-base">
              TERMINAL://CHAT
            </div>
            <div className="hidden md:flex gap-1">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
          
          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-secondary/50">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-mono text-xs">
                    {profile?.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-mono text-sm text-primary">
                  {profile?.username || user.email?.split('@')[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="terminal-border bg-card">
              <DropdownMenuItem className="font-mono" onClick={() => navigate('/profile')}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="font-mono" onClick={() => setIsSettingsOpen(true)}>
                <Palette className="w-4 h-4 mr-2" />
                Matrix Color
              </DropdownMenuItem>
              <DropdownMenuItem className="font-mono">
                <Upload className="w-4 h-4 mr-2" />
                Change Avatar
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem className="font-mono text-destructive" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-hidden relative">
          <div 
            ref={chatContainerRef}
            className="h-full overflow-y-auto matrix-chat-container px-3 md:px-6 py-4"
            onScroll={handleScroll}
          >
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12 md:py-16">
                  <div className="text-primary font-mono text-xl md:text-2xl mb-3 text-glow">
                    SYSTEM_READY
                  </div>
                    <div className="text-muted-foreground font-mono text-xs md:text-sm px-4">
                      {"> Initialize query to begin terminal session..."}
                    </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`mb-4 md:mb-6 ${message.isUser ? 'text-right' : 'text-left'}`}>
                    {/* Terminal Header */}
                    <div className={`flex items-center gap-2 mb-1 text-xs md:text-xs ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-mono text-muted-foreground">
                        [{message.timestamp.toLocaleTimeString()}]
                      </span>
                      <span 
                        className="font-mono font-bold"
                        style={{ 
                          color: message.isUser 
                            ? profile?.user_input_color || '#00ff00' 
                            : profile?.ai_response_color || '#66ff66' 
                        }}
                      >
                        {message.isUser ? 
                          `${profile?.username || user.email?.split('@')[0] || 'USER'}@terminal:~$` : 
                          'SYSTEM_ASSISTANT@system'
                        }
                      </span>
                    </div>
                    
                    {/* Terminal Message Content */}
                    <div className={`font-mono text-xs md:text-sm leading-relaxed ${message.isUser ? 'text-right' : 'text-left'}`}>
                      {!message.isUser && typingMessageId === message.id ? (
                        <div style={{ color: profile?.ai_response_color || '#66ff66' }}>
                          <TypewriterText 
                            text={message.content} 
                            onComplete={() => setTypingMessageId(null)}
                          />
                        </div>
                      ) : (
                        parseMessageContent(message.content).map((part, index) => (
                          <React.Fragment key={index}>
                            {part.type === 'text' ? (
                              <div 
                                className={`whitespace-pre-wrap ${isMobile ? 'max-w-[90vw] break-words' : ''}`}
                                style={{ 
                                  color: message.isUser 
                                    ? profile?.user_input_color || '#00ff00' 
                                    : profile?.ai_response_color || '#66ff66' 
                                }}
                              >
                                {part.content}
                              </div>
                            ) : (
                              <div className="my-2 md:my-4 overflow-x-auto">
                                <CodeBlock language={part.language} code={part.content} />
                              </div>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <span 
                      className="font-mono text-xs font-semibold"
                      style={{ color: profile?.ai_response_color || '#66ff66' }}
                    >
                      {"SYSTEM_ASSISTANT@system"}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center gap-2 font-mono text-xs md:text-sm"
                    style={{ color: profile?.ai_response_color || '#66ff66' }}
                  >
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse [animation-delay:200ms]" />
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse [animation-delay:400ms]" />
                    <span className="ml-2">Processing request...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Fixed Bottom Input Area */}
        <div className="flex-shrink-0 p-2 md:p-4 terminal-border bg-card/90 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isMobile ? "> Enter command..." : "> Enter command... (Enter to execute, Shift+Enter for new line)"}
                className={`input-terminal font-mono resize-none border-0
                         ${isMobile ? 'min-h-[40px] max-h-[80px] text-xs pr-10' : 'min-h-[50px] max-h-[120px] text-sm pr-12'}
                         bg-background/50 text-primary placeholder:text-muted-foreground`}
                rows={isMobile ? 1 : 2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`absolute right-1 md:right-2 bottom-1 md:bottom-2 btn-matrix font-mono touch-manipulation
                          ${isMobile ? 'px-1.5 py-1 h-6 w-6' : 'px-2 py-1 h-8 w-8'}`}
              >
                <Send className={isMobile ? "w-2.5 h-2.5" : "w-3 h-3"} />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs font-mono">
              <div className="text-muted-foreground">
                STATUS: <span className="text-primary">SECURE_CONNECTION_ACTIVE</span>
              </div>
              <div className="text-muted-foreground">
                {inputMessage.length}/2000
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog for Matrix Color Customization */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="terminal-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">Matrix Animation Settings</DialogTitle>
            <DialogDescription className="font-mono text-sm">
              Customize the color of your matrix rain animation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="matrix-color" className="font-mono text-sm">
                Matrix Color
              </Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="matrix-color"
                  type="color"
                  value={profile?.matrix_color || '#00ff00'}
                  onChange={(e) => updateProfile({ matrix_color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={tempColorValue.toUpperCase()}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase();
                    // Auto-add # if not present and user starts typing
                    if (value && !value.startsWith('#')) {
                      value = '#' + value;
                    }
                    // Allow free typing - update temp value
                    setTempColorValue(value);
                  }}
                  onBlur={() => {
                    let value = tempColorValue.toUpperCase();
                    // Validate and update profile
                    if (/^#[0-9A-F]{6}$/i.test(value)) {
                      updateProfile({ matrix_color: value });
                    } else {
                      // Reset to profile color if invalid
                      setTempColorValue(profile?.matrix_color || '#00FF00');
                    }
                  }}
                  onFocus={() => {
                    // Allow user to select all and replace easily
                    setTempColorValue(tempColorValue || '#');
                  }}
                  className="font-mono text-sm flex-1 bg-background/50"
                  placeholder="e.g., #00FF00, FF5733"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Type any hex color code (e.g., #FF5733) or use the color picker
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Choose any color for the falling matrix characters
              </p>
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-sm">Quick Presets</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => updateProfile({ matrix_color: '#00ff00' })}
                >
                  Classic Green
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => updateProfile({ matrix_color: '#00ffff' })}
                >
                  Cyan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => updateProfile({ matrix_color: '#ff00ff' })}
                >
                  Magenta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => updateProfile({ matrix_color: '#ffff00' })}
                >
                  Yellow
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
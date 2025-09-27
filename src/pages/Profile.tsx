import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Save, User, Palette, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User as UserType, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import MatrixRain from '@/components/MatrixRain';

interface ProfileData {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  background_color: string;
  user_input_color: string;
  ai_response_color: string;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form states
  const [username, setUsername] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#003300');
  const [userInputColor, setUserInputColor] = useState('#00ff00');
  const [aiResponseColor, setAiResponseColor] = useState('#66ff66');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          navigate('/login');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setBackgroundColor(data.background_color || '#003300');
        setUserInputColor(data.user_input_color || '#00ff00');
        setAiResponseColor(data.ai_response_color || '#66ff66');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      
      toast({
        title: 'Success',
        description: 'Avatar updated successfully!',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updateData = {
        username: username || null,
        background_color: backgroundColor,
        user_input_color: userInputColor,
        ai_response_color: aiResponseColor,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...updateData,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updateData } : null);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MatrixRain backgroundColor={backgroundColor} />
      
      {/* Scanlines overlay */}
      <div className="scanlines fixed inset-0 pointer-events-none z-10" />
      
      <div className="relative z-20 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/chat')}
              className="terminal-border bg-background/80 hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 terminal-border">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-background text-primary">
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-primary text-glow font-mono">
                  {profile?.username || user.email}
                </h1>
                <p className="text-sm text-muted-foreground font-mono">Profile</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="terminal-border bg-background/80">
              <CardHeader>
                <CardTitle className="text-primary font-mono flex items-center gap-2">
                  <User className="w-5 h-5" />
                  PROFILE SETTINGS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-primary font-mono">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="input-terminal"
                  />
                </div>

                {/* Avatar Upload */}
                <div className="space-y-4">
                  <Label className="text-primary font-mono">Avatar</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 terminal-border">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-background text-primary">
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                        disabled={isUploading}
                      />
                      <Button
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={isUploading}
                        className="btn-hacker"
                      >
                        {isUploading ? (
                          <>
                            <Upload className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            Change
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Customization */}
            <Card className="terminal-border bg-background/80">
              <CardHeader>
                <CardTitle className="text-primary font-mono flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  COLOR CUSTOMIZATION
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Background Color */}
                <div className="space-y-2">
                  <Label htmlFor="bg-color" className="text-primary font-mono">Background</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded border terminal-border"
                      style={{ backgroundColor: backgroundColor }}
                    />
                    <Input
                      id="bg-color"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-20 h-10 p-1 input-terminal"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      placeholder="#003300"
                      className="input-terminal"
                    />
                  </div>
                </div>

                {/* User Input Color */}
                <div className="space-y-2">
                  <Label htmlFor="user-color" className="text-primary font-mono">User Input</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded border terminal-border"
                      style={{ backgroundColor: userInputColor }}
                    />
                    <Input
                      id="user-color"
                      type="color"
                      value={userInputColor}
                      onChange={(e) => setUserInputColor(e.target.value)}
                      className="w-20 h-10 p-1 input-terminal"
                    />
                    <Input
                      value={userInputColor}
                      onChange={(e) => setUserInputColor(e.target.value)}
                      placeholder="#00ff00"
                      className="input-terminal"
                    />
                  </div>
                </div>

                {/* AI Response Color */}
                <div className="space-y-2">
                  <Label htmlFor="ai-color" className="text-primary font-mono">AI Responses</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded border terminal-border"
                      style={{ backgroundColor: aiResponseColor }}
                    />
                    <Input
                      id="ai-color"
                      type="color"
                      value={aiResponseColor}
                      onChange={(e) => setAiResponseColor(e.target.value)}
                      className="w-20 h-10 p-1 input-terminal"
                    />
                    <Input
                      value={aiResponseColor}
                      onChange={(e) => setAiResponseColor(e.target.value)}
                      placeholder="#66ff66"
                      className="input-terminal"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full btn-matrix text-lg py-3"
            >
              {isLoading ? (
                <>
                  <Save className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card className="terminal-border bg-background/80">
              <CardHeader>
                <CardTitle className="text-primary font-mono text-center">
                  HACKVIBE_TERMINAL.EXE
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold font-mono" style={{ color: backgroundColor }}>
                    SYSTEM READY
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono mt-2">
                    Enter your query to begin hacking reality...
                  </p>
                </div>

                <Separator className="border-primary/30" />

                {/* Sample Messages */}
                <div className="space-y-3">
                  <div className="p-3 rounded bg-background/50 border border-primary/20">
                    <div className="text-sm font-mono" style={{ color: userInputColor }}>
                      What's your favorite anime?
                    </div>
                  </div>
                  
                  <div className="p-3 rounded bg-background/50 border border-primary/20">
                    <div className="text-sm font-mono" style={{ color: aiResponseColor }}>
                      I find the philosophical depth in Ghost in the Shell fascinating...
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-mono text-primary">
                    STATUS: SECURE CONNECTION ACTIVE
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat History Preview */}
            <Card className="terminal-border bg-background/80">
              <CardHeader>
                <CardTitle className="text-primary font-mono">CHAT_HISTORY.LOG</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm font-mono text-muted-foreground">
                  explain about ai ?
                  <br />
                  <span className="text-xs">8/22/2025</span>
                </div>
                
                <div className="text-sm font-mono text-muted-foreground">
                  what's your fav anime ?
                  <br />
                  <span className="text-xs">8/22/2025</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
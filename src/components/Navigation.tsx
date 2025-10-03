import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, X, User } from "lucide-react";
import { useState, useEffect } from "react";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            AdaptLearn
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-foreground/80 hover:text-primary transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-foreground/80 hover:text-primary transition-colors">
            How it Works
          </a>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">{user.email}</span>
              </div>
              <Button variant="hero" size="sm" onClick={() => window.location.href = '/dashboard'}>
                Dashboard
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
                Login
              </Button>
              <Button variant="hero" size="sm" onClick={() => window.location.href = '/auth'}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <a href="#features" className="block text-foreground/80 hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="block text-foreground/80 hover:text-primary transition-colors">
              How it Works
            </a>
            <div className="space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{user.email}</span>
                  </div>
                  <Button variant="hero" size="sm" className="w-full" onClick={() => window.location.href = '/dashboard'}>
                    Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = '/auth'}>
                    Login
                  </Button>
                  <Button variant="hero" size="sm" className="w-full" onClick={() => window.location.href = '/auth'}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
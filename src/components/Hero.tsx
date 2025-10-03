import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-image.jpg";

export const Hero = () => {
  const [user, setUser] = useState<User | null>(null);
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

  const handleStartLearning = () => {
    if (user) {
      window.location.href = '/onboarding';
    } else {
      window.location.href = '/auth';
    }
  };
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-hero relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary-glow/20 rounded-full animate-float" />
      <div className="absolute top-40 right-20 w-16 h-16 bg-primary/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-20 left-20 w-12 h-12 bg-primary-glow/30 rounded-full animate-float" style={{ animationDelay: '4s' }} />

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-full px-4 py-2 mb-8">
            <Sparkles className="h-4 w-4 text-primary-glow" />
            <span className="text-sm font-medium text-primary-glow">AI-Powered Learning Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Adaptive Learning
            </span>
            <br />
            <span className="text-foreground">Platform</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            Your personalized roadmap with quizzes & rewards. 
            Learn at your own pace with AI-generated content.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button variant="hero" size="xl" className="min-w-[200px]" onClick={handleStartLearning}>
              Start Learning
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl" className="min-w-[200px] bg-background/10 backdrop-blur-sm border-foreground/20 text-foreground hover:bg-background/20">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-glow mb-2">10K+</div>
              <div className="text-foreground/60">Active Learners</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-glow mb-2">500+</div>
              <div className="text-foreground/60">Courses Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-glow mb-2">95%</div>
              <div className="text-foreground/60">Completion Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Target, TrendingUp, MessageSquare, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NextStepItem {
  name: string;
  description: string;
  impact: string;
}

interface SuggestionData {
  currentOpportunities: {
    title: string;
    items: string[];
  };
  nextSteps: {
    title: string;
    items: NextStepItem[];
  };
  careerPaths: {
    title: string;
    items: string[];
  };
}

interface CourseSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SuggestionData | null;
  courseName: string;
}

export const CourseSuggestionModal: React.FC<CourseSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  courseName
}) => {
  const navigate = useNavigate();

  const handleCreateNewRoadmap = () => {
    onClose();
    navigate('/onboarding');
  };

  if (!suggestions) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Your Next Learning Journey
          </DialogTitle>
          <DialogDescription className="text-base">
            Based on completing <strong>{courseName}</strong>, here's what you can do next
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Opportunities */}
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Briefcase className="w-5 h-5" />
                {suggestions.currentOpportunities.title}
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Immediate opportunities to apply your new skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {suggestions.currentOpportunities.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-green-800 dark:text-green-200">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Target className="w-5 h-5" />
                {suggestions.nextSteps.title}
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Strategic learning paths for maximum impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.nextSteps.items.map((item, index) => (
                  <div key={index} className="p-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-900/20">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">{item.name}</h4>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                        High Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">{item.description}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 italic">💡 {item.impact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Career Paths */}
          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <TrendingUp className="w-5 h-5" />
                {suggestions.careerPaths.title}
              </CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                Career directions you can pursue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {suggestions.careerPaths.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-purple-900/20">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-300 font-semibold text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-purple-800 dark:text-purple-200 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Learning CTA */}
          <Card className="border-primary bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">Want More Advanced Learning?</h3>
                </div>
                <p className="text-muted-foreground">
                  Create a personalized learning roadmap with our AI-powered chatbot
                </p>
                <Button onClick={handleCreateNewRoadmap} className="bg-primary hover:bg-primary/90">
                  Create New Roadmap
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
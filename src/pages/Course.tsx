import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';
import { ArrowLeft, CheckCircle, Lock, Play, ExternalLink, Youtube } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Course {
  id: string;
  name: string;
  duration: string;
  status: string;
  roadmap_json: any;
}

interface Milestone {
  id: string;
  title: string;
  order_index: number;
  resources: any;
  quiz: any;
}

interface ProgressItem {
  milestone_id: string;
  status: string;
  quiz_score: number;
}

const Course = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && courseId) {
      fetchCourseData();
    }
  }, [user, courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('user_id', user?.id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);

      // Fetch progress
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('milestone_id, status, quiz_score')
        .eq('course_id', courseId)
        .eq('user_id', user?.id);

      if (progressError) throw progressError;
      setProgress(progressData || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneStatus = (milestoneId: string) => {
    const progressItem = progress.find(p => p.milestone_id === milestoneId);
    return progressItem?.status || 'locked';
  };

  const calculateOverallProgress = () => {
    const completedCount = progress.filter(p => p.status === 'completed').length;
    return milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    const status = getMilestoneStatus(milestone.id);
    if (status === 'locked') {
      toast({
        title: "Milestone Locked",
        description: "Complete the previous milestone to unlock this one.",
        variant: "destructive",
      });
      return;
    }
    setSelectedMilestone(milestone);
  };

  const startQuiz = () => {
    setShowQuiz(true);
    setQuizAnswers(new Array(selectedMilestone?.quiz.length).fill(-1));
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = async () => {
    if (!selectedMilestone || quizAnswers.some(answer => answer === -1)) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingQuiz(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-quiz', {
        body: {
          userId: user?.id,
          courseId: courseId,
          milestoneId: selectedMilestone.id,
          answers: quizAnswers
        }
      });

      if (error) {
        console.error('Quiz submission error:', error);
        throw new Error(error.message || 'Failed to submit quiz');
      }

      if (!data) {
        throw new Error('No response data received');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.passed) {
        toast({
          title: "Congratulations!",
          description: `Quiz passed! Score: ${data.score}%`,
        });
        
        // Immediately refresh data to show unlocked milestone
        await fetchCourseData();
        
        if (data.courseCompleted) {
          toast({
            title: "Course Completed!",
            description: "You've completed the entire course! Certificate generated.",
          });
          // Navigate to completion page
          setTimeout(() => {
            navigate(`/course-completion/${courseId}`);
          }, 1500);
        }
      } else {
        toast({
          title: "Quiz Failed",
          description: `Score: ${data.score}%. You need 100% to pass. Try again!`,
          variant: "destructive",
        });
      }

      setShowQuiz(false);
      setSelectedMilestone(null);

    } catch (error: any) {
      console.error('Quiz submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{course.name}</h1>
              <p className="text-muted-foreground">Duration: {course.duration}</p>
            </div>
            <Badge variant={course.status === 'completed' ? 'default' : 'secondary'}>
              {course.status}
            </Badge>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{Math.round(calculateOverallProgress())}%</span>
            </div>
            <Progress value={calculateOverallProgress()} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Roadmap Timeline */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Learning Roadmap</h2>
          
          <div className="grid gap-6">
            {milestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone.id);
              const isLocked = status === 'locked';
              const isCompleted = status === 'completed';
              const isActive = status === 'active';

              return (
                <Card 
                  key={milestone.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isLocked ? 'opacity-60' : ''
                  } ${isActive ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleMilestoneClick(milestone)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted ? 'bg-green-500 text-white' :
                          isActive ? 'bg-primary text-primary-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> :
                           isLocked ? <Lock className="w-4 h-4" /> :
                           index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{milestone.title}</CardTitle>
                          <CardDescription>Milestone {milestone.order_index}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={
                        isCompleted ? 'default' :
                        isActive ? 'secondary' :
                        'outline'
                      }>
                        {isCompleted ? 'Completed' :
                         isActive ? 'Active' :
                         'Locked'}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestone Details Dialog */}
      <Dialog open={!!selectedMilestone && !showQuiz} onOpenChange={() => setSelectedMilestone(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedMilestone?.title}</DialogTitle>
            <DialogDescription>
              Study the resources below, then take the quiz to unlock the next milestone
            </DialogDescription>
          </DialogHeader>

          {selectedMilestone && (
            <div className="space-y-6">
              {/* Resources */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Learning Resources</h3>
                
                <div className="space-y-4">
                  {/* Website Resource */}
                  {selectedMilestone.resources.website && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Website Resource
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-2">{selectedMilestone.resources.website}</p>
                        <Button variant="outline" size="sm" asChild>
                          <a href={selectedMilestone.resources.website} target="_blank" rel="noopener noreferrer">
                            Open Website
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* YouTube Resources */}
                  {selectedMilestone.resources.youtube && selectedMilestone.resources.youtube.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Youtube className="w-4 h-4" />
                          YouTube Videos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {selectedMilestone.resources.youtube.map((video: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium text-sm">{video.title}</p>
                              <p className="text-xs text-muted-foreground">{video.channel}</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={video.url} target="_blank" rel="noopener noreferrer">
                                Watch
                              </a>
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Resources */}
                  {selectedMilestone.resources.additional && selectedMilestone.resources.additional.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Additional Resources</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedMilestone.resources.additional.map((resource: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium text-sm">{resource.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{resource.type}</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                Open
                              </a>
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Quiz Button */}
              <div className="flex justify-center pt-4 border-t">
                <Button onClick={startQuiz} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Take Quiz to Continue
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={showQuiz} onOpenChange={() => setShowQuiz(false)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz: {selectedMilestone?.title}</DialogTitle>
            <DialogDescription>
              Answer all questions correctly to unlock the next milestone
            </DialogDescription>
          </DialogHeader>

          {selectedMilestone && (
            <div className="space-y-6">
              {selectedMilestone.quiz.map((question: any, questionIndex: number) => (
                <Card key={questionIndex}>
                  <CardHeader>
                    <CardTitle className="text-sm">Question {questionIndex + 1}</CardTitle>
                    <CardDescription>{question.question}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={quizAnswers[questionIndex]?.toString()}
                      onValueChange={(value) => handleQuizAnswer(questionIndex, parseInt(value))}
                    >
                      {question.options.map((option: string, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <RadioGroupItem value={optionIndex.toString()} id={`q${questionIndex}-o${optionIndex}`} />
                          <Label htmlFor={`q${questionIndex}-o${optionIndex}`} className="text-sm">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowQuiz(false)}>
                  Back to Resources
                </Button>
                <Button onClick={submitQuiz} disabled={submittingQuiz}>
                  {submittingQuiz && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                  Submit Quiz
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Course;
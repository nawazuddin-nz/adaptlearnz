import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';
import { LogOut, Plus, BookOpen, Award, TrendingUp, Download, Lightbulb } from 'lucide-react';
import { CourseSuggestionModal } from "@/components/CourseSuggestionModal";

interface Course {
  id: string;
  name: string;
  duration: string;
  status: string;
  created_at: string;
  roadmap_json: any;
}

interface Certificate {
  id: string;
  course_id: string;
  certificate_data: any;
  created_at: string;
}

interface CourseProgress {
  [courseId: string]: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress>({});
  const [loading, setLoading] = useState(true);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [suggestingNext, setSuggestingNext] = useState<string | null>(null);
  const [suggestionModal, setSuggestionModal] = useState<{
    isOpen: boolean;
    suggestions: any;
    courseName: string;
  }>({
    isOpen: false,
    suggestions: null,
    courseName: ''
  });
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
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch certificates
      const { data: certificatesData, error: certificatesError } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (certificatesError) throw certificatesError;
      setCertificates(certificatesData || []);

      // Calculate progress for each course
      if (coursesData) {
        const progressPromises = coursesData.map(async (course) => {
          const { data: progress, error } = await supabase
            .from('progress')
            .select('status')
            .eq('user_id', user?.id)
            .eq('course_id', course.id);

          if (error) return { courseId: course.id, progress: 0 };

          const totalMilestones = (course.roadmap_json as any)?.milestones?.length || 1;
          const completedMilestones = progress?.filter(p => p.status === 'completed').length || 0;
          const progressPercentage = Math.round((completedMilestones / totalMilestones) * 100);

          return { courseId: course.id, progress: progressPercentage };
        });

        const progressResults = await Promise.all(progressPromises);
        const progressMap: CourseProgress = {};
        progressResults.forEach(({ courseId, progress }) => {
          progressMap[courseId] = progress;
        });
        setCourseProgress(progressMap);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const calculateProgress = (course: Course) => {
    return courseProgress[course.id] || 0;
  };

  const downloadCertificate = async (courseId: string, courseName: string) => {
    try {
      setDownloadingCert(courseId);
      
      const certificate = certificates.find(cert => cert.course_id === courseId);
      if (!certificate) {
        toast({
          title: "Error",
          description: "Certificate not found for this course",
          variant: "destructive",
        });
        return;
      }

      const certificateData = certificate.certificate_data;
      
      // Create certificate HTML
      const certificateHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Certificate - ${courseName}</title>
            <style>
                body { margin: 0; padding: 40px; font-family: 'Georgia', serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .certificate { background: white; max-width: 800px; margin: 0 auto; padding: 60px; box-shadow: 0 0 30px rgba(0,0,0,0.3); border-radius: 10px; }
                .header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 30px; margin-bottom: 40px; }
                .title { font-size: 48px; color: #2c3e50; margin: 0; font-weight: bold; }
                .subtitle { font-size: 20px; color: #7f8c8d; margin: 10px 0 0 0; }
                .content { text-align: center; }
                .recipient { font-size: 32px; color: #2980b9; margin: 30px 0; font-weight: bold; }
                .course { font-size: 24px; color: #27ae60; margin: 20px 0; font-style: italic; }
                .details { font-size: 16px; color: #34495e; margin: 30px 0; }
                .footer { margin-top: 50px; text-align: center; border-top: 2px solid #ecf0f1; padding-top: 30px; }
                .date { color: #7f8c8d; }
                .cert-id { font-size: 12px; color: #95a5a6; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="header">
                    <h1 class="title">CERTIFICATE</h1>
                    <p class="subtitle">of Completion</p>
                </div>
                <div class="content">
                    <p>This is to certify that</p>
                    <div class="recipient">${certificateData.recipientName}</div>
                    <p>has successfully completed the course</p>
                    <div class="course">${certificateData.courseName}</div>
                    <div class="details">
                        <p>Duration: ${certificateData.duration}</p>
                        <p>Completion Date: ${new Date(certificateData.completionDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="footer">
                    <p><strong>${certificateData.issuer}</strong></p>
                    <p class="date">${new Date().toLocaleDateString()}</p>
                    <p class="cert-id">Certificate ID: ${certificateData.certificateId}</p>
                </div>
            </div>
        </body>
        </html>
      `;

      // Create and download the file
      const blob = new Blob([certificateHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseName.replace(/[^a-z0-9]/gi, '_')}_Certificate.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Certificate downloaded successfully!",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download certificate",
        variant: "destructive",
      });
    } finally {
      setDownloadingCert(null);
    }
  };

  const suggestNextCourse = async (courseId: string, courseName: string) => {
    try {
      setSuggestingNext(courseId);
      
      const { data, error } = await supabase.functions.invoke('suggest-next-course', {
        body: { 
          completedCourse: courseName,
          userPreferences: 'advanced learning'
        }
      });

      if (error) throw error;

      setSuggestionModal({
        isOpen: true,
        suggestions: data.suggestions,
        courseName: courseName
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to get course suggestions",
        variant: "destructive",
      });
    } finally {
      setSuggestingNext(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/30">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back!</p>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {courses.filter(c => c.status === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Courses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {courses.filter(c => c.status === 'completed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificates.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button onClick={() => navigate('/onboarding')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Start New Course
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Courses Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">My Courses</h2>
            {courses.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No courses yet. Start your first learning journey!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <Card key={course.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <CardDescription>Duration: {course.duration}</CardDescription>
                        </div>
                        <Badge variant={course.status === 'completed' ? 'default' : 'secondary'}>
                          {course.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{calculateProgress(course)}%</span>
                        </div>
                        <Progress value={calculateProgress(course)} />
                      </div>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <Button 
                          onClick={() => navigate(`/course/${course.id}`)}
                          variant="outline" 
                          size="sm"
                        >
                          {course.status === 'completed' ? 'Review' : 'Continue'}
                        </Button>
                        
                        {course.status === 'completed' && certificates.find(cert => cert.course_id === course.id) && (
                          <Button 
                            onClick={() => downloadCertificate(course.id, course.name)}
                            variant="outline"
                            size="sm"
                            disabled={downloadingCert === course.id}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            {downloadingCert === course.id ? 'Downloading...' : 'Certificate'}
                          </Button>
                        )}
                        
                        {course.status === 'completed' && (
                          <Button 
                            onClick={() => suggestNextCourse(course.id, course.name)}
                            variant="outline"
                            size="sm"
                            disabled={suggestingNext === course.id}
                          >
                            <Lightbulb className="w-4 h-4 mr-1" />
                            {suggestingNext === course.id ? 'Suggesting...' : 'Next Course'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Certificates Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Certificates</h2>
            {certificates.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Complete courses to earn certificates!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {certificates.map((certificate) => {
                  const course = courses.find(c => c.id === certificate.course_id);
                  return (
                    <Card key={certificate.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{course?.name || 'Course'} Certificate</CardTitle>
                        <CardDescription>
                          Earned on {new Date(certificate.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadCertificate(certificate.course_id, course?.name || 'Course')}
                          disabled={downloadingCert === certificate.course_id}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {downloadingCert === certificate.course_id ? 'Downloading...' : 'Download Certificate'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Suggestion Modal */}
      <CourseSuggestionModal
        isOpen={suggestionModal.isOpen}
        onClose={() => setSuggestionModal(prev => ({ ...prev, isOpen: false }))}
        suggestions={suggestionModal.suggestions}
        courseName={suggestionModal.courseName}
      />
    </div>
  );
};

export default Dashboard;
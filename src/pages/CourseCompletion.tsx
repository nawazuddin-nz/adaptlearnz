import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';
import { Trophy, Download, ArrowRight, Star, Clock, Target } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  duration: string;
}

interface Certificate {
  id: string;
  certificate_data: any;
  created_at: string;
}

interface CourseSuggestion {
  title: string;
  description: string;
  difficulty: string;
  duration: string;
}

const CourseCompletion = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
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
      fetchData();
    }
  }, [user, courseId]);

  const fetchData = async () => {
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

      // Check for existing certificate
      const { data: certData, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user?.id)
        .eq('course_id', courseId)
        .single();

      if (!certError && certData) {
        setCertificate(certData);
      } else {
        // Generate certificate if it doesn't exist
        await generateCertificate();
      }

      // Load course suggestions
      await loadCourseSuggestions(courseData.name);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load completion data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async () => {
    try {
      setGeneratingCertificate(true);

      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: {
          userId: user?.id,
          courseId: courseId
        }
      });

      if (error) throw error;

      if (data.success) {
        setCertificate(data.certificate);
        toast({
          title: "Certificate Generated!",
          description: "Your completion certificate is ready for download.",
        });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate certificate",
        variant: "destructive",
      });
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const loadCourseSuggestions = async (completedCourse: string) => {
    try {
      setLoadingSuggestions(true);

      const { data, error } = await supabase.functions.invoke('suggest-next-course', {
        body: {
          completedCourse,
          userPreferences: {}
        }
      });

      if (error) throw error;

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

    } catch (error: any) {
      console.error('Failed to load course suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const downloadCertificate = () => {
    if (!certificate) return;

    const certData = certificate.certificate_data;
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Completion - ${certData.recipientName}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @page { size: A4 landscape; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Georgia', serif; 
            background: linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #dc2626 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .certificate { 
            background: white; 
            padding: 80px 60px; 
            border-radius: 20px; 
            box-shadow: 0 25px 50px rgba(0,0,0,0.2);
            width: 900px;
            max-width: 90vw;
            position: relative;
            overflow: hidden;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 8px;
            background: linear-gradient(90deg, #1e40af, #7c3aed, #dc2626);
          }
          .header { 
            text-align: center; 
            margin-bottom: 50px; 
            border-bottom: 3px solid #f1f5f9;
            padding-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            color: #1e40af;
            font-weight: bold;
            margin-bottom: 15px;
          }
          .title { 
            font-size: 52px; 
            color: #1e293b; 
            margin-bottom: 15px; 
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          }
          .subtitle { 
            font-size: 20px; 
            color: #64748b; 
            font-style: italic;
          }
          .recipient { 
            text-align: center; 
            margin: 50px 0; 
          }
          .certifies { 
            font-size: 22px; 
            color: #475569; 
            margin-bottom: 25px;
          }
          .recipient-name { 
            font-size: 48px; 
            color: #1e40af; 
            border-bottom: 4px solid #3b82f6; 
            display: inline-block; 
            padding: 20px 40px;
            margin: 25px 0;
            font-weight: bold;
            background: linear-gradient(135deg, #eff6ff, #f8fafc);
            border-radius: 15px;
            text-transform: capitalize;
          }
          .completion-text {
            font-size: 22px;
            color: #475569;
            margin-top: 25px;
          }
          .course-info { 
            text-align: center; 
            margin: 50px 0; 
            background: #f8fafc;
            padding: 40px;
            border-radius: 20px;
            border-left: 8px solid #3b82f6;
          }
          .course-name { 
            font-size: 32px; 
            color: #1e293b; 
            margin-bottom: 20px;
            font-weight: bold;
            text-transform: capitalize;
          }
          .course-details {
            font-size: 20px;
            color: #64748b;
            margin: 15px 0;
          }
          .completion-date { 
            font-size: 18px; 
            color: #7c3aed;
            font-weight: bold;
            margin-top: 25px;
            padding: 15px;
            background: #faf5ff;
            border-radius: 10px;
            display: inline-block;
          }
          .footer { 
            text-align: center; 
            margin-top: 60px; 
            padding-top: 40px;
            border-top: 3px solid #f1f5f9;
          }
          .cert-id { 
            font-size: 16px; 
            color: #94a3b8; 
            font-family: 'Courier New', monospace;
            background: #f8fafc;
            padding: 15px 25px;
            border-radius: 30px;
            display: inline-block;
            margin-bottom: 30px;
            border: 2px solid #e2e8f0;
          }
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .signature {
            text-align: center;
            flex: 1;
          }
          .signature-line {
            border-top: 3px solid #cbd5e1;
            margin: 0 auto 15px;
            width: 220px;
          }
          .signature-text {
            font-size: 16px;
            color: #64748b;
            font-weight: 600;
          }
          @media print {
            body { 
              background: white !important; 
              padding: 0;
            }
            .certificate { 
              box-shadow: none; 
              margin: 0; 
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="logo">🎓 AI Learning Platform</div>
            <div class="title">Certificate of Completion</div>
            <div class="subtitle">Awarded for Outstanding Achievement in Learning Excellence</div>
          </div>
          
          <div class="recipient">
            <div class="certifies">This is to certify that</div>
            <div class="recipient-name">${certData.recipientName}</div>
            <div class="completion-text">has successfully completed the comprehensive learning course</div>
          </div>
          
          <div class="course-info">
            <div class="course-name">"${certData.courseName}"</div>
            <div class="course-details"><strong>Course Duration:</strong> ${certData.duration}</div>
            <div class="course-details"><strong>Certification Authority:</strong> ${certData.issuer || 'AI Learning Platform'}</div>
            <div class="completion-date">
              <strong>Completed on:</strong> ${new Date(certData.completionDate).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          
          <div class="footer">
            <div class="cert-id">Certificate ID: ${certData.certificateId}</div>
            <div class="signature-section">
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">Platform Director</div>
              </div>
              <div style="text-align: center; flex: 0.5;">
                <div style="font-size: 24px; color: #1e40af;">⭐</div>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">Course Instructor</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create and download the certificate
    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Create a clean filename
    const cleanName = certData.recipientName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanCourse = certData.courseName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Certificate_${cleanName}_${cleanCourse}_${new Date().getFullYear()}.html`;
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Certificate Downloaded!",
      description: `Certificate for "${certData.courseName}" has been downloaded. Open the HTML file in a browser and save as PDF for a permanent copy.`,
    });
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
      <div className="container mx-auto px-4 py-8">
        {/* Congratulations Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Congratulations! 🎉</h1>
            <p className="text-xl text-muted-foreground">
              You've successfully completed <span className="font-semibold text-primary">{course?.name}</span>
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Certificate Section */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5" />
                Your Certificate
              </CardTitle>
              <CardDescription>
                Download your completion certificate to showcase your achievement
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {certificate && !generatingCertificate ? (
                <div className="space-y-4">
                  <div className="p-6 border-2 border-dashed border-primary rounded-lg bg-primary/5">
                    <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Certificate Ready!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generated on {new Date(certificate.created_at).toLocaleDateString()}
                    </p>
                    <Button onClick={downloadCertificate} className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Certificate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span>Generating your certificate...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                What's Next?
              </CardTitle>
              <CardDescription>
                Continue your learning journey with these recommended courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSuggestions ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span>Loading course suggestions...</span>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {suggestion.difficulty}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {suggestion.duration}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {suggestion.description}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate('/onboarding')}
                          className="w-full"
                        >
                          Start Learning
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              Back to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Start New Course
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCompletion;
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, duration, goal, skillLevel, preference, userId } = await req.json();
    console.log('Generating roadmap for:', { topic, duration, goal, skillLevel, preference, userId });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not found');
    }

    // Determine milestone count based on duration
    let milestoneCount = 4; // default
    if (duration === '1 week') milestoneCount = 3;
    else if (duration === '2 weeks') milestoneCount = 4;
    else if (duration === '4 weeks') milestoneCount = 5;

    // Build personalization rules
    let resourceRules = '';
    if (preference === 'Videos') {
      resourceRules = '- Include 2-3 YouTube videos and 1 website/documentation link per milestone\n';
    } else if (preference === 'Notes') {
      resourceRules = '- Include 2 websites/documentation links and 1 video per milestone\n';
    } else if (preference === 'Interactive') {
      resourceRules = '- Include coding playgrounds, GitHub labs, and interactive tutorials\n';
    }

    let difficultyRules = '';
    if (skillLevel === 'Beginner') {
      difficultyRules = '- Use simple explanations and easier quiz questions\n- Focus on fundamentals and basic concepts\n';
    } else if (skillLevel === 'Advanced') {
      difficultyRules = '- Include advanced documentation and complex tutorials\n- Create challenging quiz questions\n';
    }

    let goalRules = '';
    if (goal === 'Exam') {
      goalRules = '- Create practice-style quiz questions similar to exam format\n- Focus on testable concepts\n';
    } else if (goal === 'Project') {
      goalRules = '- Include 1 small project idea or exercise per milestone\n- Focus on practical application\n';
    } else if (goal === 'Placement') {
      goalRules = '- Add interview-style questions and resources\n- Include real-world problem-solving scenarios\n';
    }

    const prompt = `CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no explanations, no additional text.

Generate a learning roadmap for: "${topic}" (Duration: ${duration})

User Profile: ${skillLevel} level, prefers ${preference}, goal: ${goal}

EXACT JSON FORMAT REQUIRED:
{
  "courseName": "Course title here",
  "duration": "${duration}",
  "milestones": [
    {
      "title": "Milestone title",
      "order": 1,
      "resources": {
        "website": "High-quality website URL with description",
        "youtube": [
          {"title": "Exact video title", "channel": "Channel name", "url": "YouTube URL"},
          {"title": "Exact video title", "channel": "Channel name", "url": "YouTube URL"}
        ],
        "additional": [
          {"title": "Resource title", "url": "URL", "type": "article"},
          {"title": "Resource title", "url": "URL", "type": "documentation"}
        ]
      },
      "quiz": [
        {
          "question": "Quiz question here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 0
        },
        {
          "question": "Another quiz question?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 1
        },
        {
          "question": "Third quiz question?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 2
        }
      ]
    }
  ]
}

REQUIREMENTS:
- Exactly ${milestoneCount} milestones
- Each milestone: 3-5 quiz questions
${resourceRules}${difficultyRules}${goalRules}
- Real URLs only
- Logical progression

RESPOND WITH JSON ONLY. NO OTHER TEXT.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Gemini API full error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', JSON.stringify(data, null, 2));
    
    const roadmapContent = data.candidates[0].content.parts[0].text;
    let roadmap;
    
    // Robust JSON parsing with multiple strategies
    const parseStrategies = [
      // Strategy 1: Direct parsing
      (content: string) => JSON.parse(content.trim()),
      
      // Strategy 2: Remove markdown code blocks
      (content: string) => {
        let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        return JSON.parse(cleaned.trim());
      },
      
      // Strategy 3: Remove any markdown formatting
      (content: string) => {
        let cleaned = content.replace(/```[\s\S]*?```/g, '').replace(/```/g, '');
        return JSON.parse(cleaned.trim());
      },
      
      // Strategy 4: Extract JSON from mixed content
      (content: string) => {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON found');
      },
      
      // Strategy 5: Find JSON between braces
      (content: string) => {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          return JSON.parse(content.substring(start, end + 1));
        }
        throw new Error('No valid JSON structure found');
      }
    ];
    
    let parseError = null;
    for (const strategy of parseStrategies) {
      try {
        roadmap = strategy(roadmapContent);
        console.log('Successfully parsed JSON with strategy');
        break;
      } catch (e) {
        parseError = e;
        continue;
      }
    }
    
    if (!roadmap) {
      console.error('All parsing strategies failed for content:', roadmapContent);
      console.error('Final parsing error:', parseError);
      
      // Fallback: Create a basic roadmap structure
      roadmap = {
        courseName: `${topic} Learning Path`,
        duration: duration,
        milestones: Array.from({ length: milestoneCount }, (_, i) => ({
          title: `${topic} - Milestone ${i + 1}`,
          order: i + 1,
          resources: {
            website: "https://developer.mozilla.org/en-US/docs/Web",
            youtube: [
              { title: "Introduction Tutorial", channel: "Educational Channel", url: "https://youtube.com" }
            ],
            additional: [
              { title: "Documentation", url: "https://docs.example.com", type: "documentation" }
            ]
          },
          quiz: [
            {
              question: `What is the key concept in ${topic}?`,
              options: ["Option A", "Option B", "Option C", "Option D"],
              correct: 0
            },
            {
              question: `How do you implement ${topic}?`,
              options: ["Method 1", "Method 2", "Method 3", "Method 4"],
              correct: 1
            },
            {
              question: `What are best practices for ${topic}?`,
              options: ["Practice A", "Practice B", "Practice C", "Practice D"],
              correct: 2
            }
          ]
        }))
      };
      console.log('Using fallback roadmap structure');
    }
    
    // Validate the roadmap structure
    if (!roadmap.courseName || !roadmap.milestones || !Array.isArray(roadmap.milestones)) {
      throw new Error('Invalid roadmap structure - missing required fields');
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create course record
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: userId,
        name: roadmap.courseName,
        duration: roadmap.duration,
        roadmap_json: roadmap
      })
      .select()
      .single();

    if (courseError) {
      console.error('Course creation error:', courseError);
      throw new Error('Failed to create course');
    }

    // Create milestones
    const milestones = roadmap.milestones.map((milestone: any, index: number) => ({
      course_id: course.id,
      title: milestone.title,
      order_index: milestone.order || index + 1,
      resources: milestone.resources,
      quiz: milestone.quiz
    }));

    const { data: createdMilestones, error: milestonesError } = await supabase
      .from('milestones')
      .insert(milestones)
      .select();

    if (milestonesError) {
      console.error('Milestones creation error:', milestonesError);
      throw new Error('Failed to create milestones');
    }

    // Create initial progress records (first milestone active, rest locked)
    const progressRecords = createdMilestones.map((milestone: any, index: number) => ({
      user_id: userId,
      course_id: course.id,
      milestone_id: milestone.id,
      status: index === 0 ? 'active' : 'locked'
    }));

    const { error: progressError } = await supabase
      .from('progress')
      .insert(progressRecords);

    if (progressError) {
      console.error('Progress creation error:', progressError);
      throw new Error('Failed to create progress records');
    }

    return new Response(JSON.stringify({
      success: true,
      course: course,
      milestones: createdMilestones
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-roadmap function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
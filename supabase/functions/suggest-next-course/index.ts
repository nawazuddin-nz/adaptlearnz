import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { completedCourse, userPreferences } = await req.json();
    console.log('Suggesting next course for:', { completedCourse, userPreferences });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `
You are a career development AI that analyzes completed courses and provides personalized learning recommendations.

COMPLETED COURSE: "${completedCourse}"
USER PREFERENCES: ${JSON.stringify(userPreferences)}

INSTRUCTIONS:
1. Analyze the specific skills and knowledge gained from "${completedCourse}"
2. Consider current industry trends and job market demands for this field
3. Research real career opportunities and salary ranges for someone with these skills
4. Suggest specific, actionable next steps that build upon "${completedCourse}"

RESPONSE FORMAT - Return ONLY this exact JSON structure with NO additional text:

{
  "currentOpportunities": {
    "title": "What You Can Do Now With ${completedCourse}",
    "items": [
      "Specific job role with ${completedCourse} skills ($X-Y salary range)",
      "Concrete project idea using ${completedCourse} techniques",
      "Freelance opportunity in ${completedCourse} domain"
    ]
  },
  "nextSteps": {
    "title": "Strategic Next Learning Steps",
    "items": [
      {
        "name": "Specific Advanced Course/Certification Name",
        "description": "How this directly builds on ${completedCourse} skills",
        "impact": "Specific career advancement (e.g., +$X salary, specific job titles)"
      },
      {
        "name": "Complementary Skill/Technology",
        "description": "Why this pairs perfectly with ${completedCourse}",
        "impact": "Market advantage and specific career opportunities"
      }
    ]
  },
  "careerPaths": {
    "title": "Career Trajectories From ${completedCourse}",
    "items": [
      "Senior ${completedCourse} Specialist (2-3 years, $X-Y range)",
      "Related leadership role combining ${completedCourse} + management",
      "Specialized consultant in ${completedCourse} niche"
    ]
  }
}

REQUIREMENTS:
- All suggestions must be specific to "${completedCourse}" - no generic advice
- Include real salary ranges and timeframes where relevant
- Focus on current 2024-2025 job market trends
- Make career paths progressive (junior → senior → leadership)
- Ensure all JSON is valid and properly formatted
- Be concrete and actionable, not vague or theoretical`;

    const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
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
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');

    const suggestionText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    try {
      const suggestions = JSON.parse(suggestionText);
      return new Response(JSON.stringify({
        success: true,
        suggestions: suggestions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse suggestions JSON:', parseError, 'Raw response:', suggestionText);
      return new Response(JSON.stringify({
        success: true,
        suggestions: {
          currentOpportunities: {
            title: `What You Can Do Now With ${completedCourse}`,
            items: [
              `Apply ${completedCourse} skills in practical projects`,
              `Build a portfolio showcasing ${completedCourse} expertise`,
              `Connect with ${completedCourse} professionals and communities`
            ]
          },
          nextSteps: {
            title: "Recommended Next Steps",
            items: [
              {
                name: `Advanced ${completedCourse} Concepts`,
                description: `Deepen your ${completedCourse} expertise with advanced techniques`,
                impact: `Become a recognized expert in ${completedCourse}`
              },
              {
                name: "Industry Certifications",
                description: `Obtain relevant certifications in ${completedCourse} domain`,
                impact: "Increase credibility and job market value"
              }
            ]
          },
          careerPaths: {
            title: "Career Opportunities",
            items: [
              `${completedCourse} Specialist`,
              `${completedCourse} Consultant`,
              `${completedCourse} Team Lead`
            ]
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in suggest-next-course function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
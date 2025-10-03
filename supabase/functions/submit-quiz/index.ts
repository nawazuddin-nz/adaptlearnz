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
    const { userId, courseId, milestoneId, answers } = await req.json();
    console.log('Processing quiz submission:', { userId, courseId, milestoneId, answers });

    if (!userId || !courseId || !milestoneId || !answers) {
      throw new Error('Missing required parameters: userId, courseId, milestoneId, or answers');
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get milestone with quiz data
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('quiz')
      .eq('id', milestoneId)
      .single();

    if (milestoneError) {
      console.error('Error fetching milestone:', milestoneError);
      throw new Error(`Failed to fetch milestone: ${milestoneError.message}`);
    }

    if (!milestone || !milestone.quiz) {
      throw new Error('Milestone or quiz not found');
    }

    // Calculate score
    const quiz = milestone.quiz;
    let correctAnswers = 0;
    const totalQuestions = quiz.length;

    quiz.forEach((question: any, index: number) => {
      if (answers[index] === question.correct) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= 70; // Must get at least 70% to pass

    console.log('Quiz results:', { correctAnswers, totalQuestions, score, passed });

    if (passed) {
      // Mark current milestone as completed
      const { error: updateError } = await supabase
        .from('progress')
        .update({
          status: 'completed',
          quiz_score: score,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('milestone_id', milestoneId);

      if (updateError) {
        console.error('Error updating progress:', updateError);
        throw new Error(`Failed to update progress: ${updateError.message}`);
      }

      // Get all milestones for this course to find the next one
      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('id, order_index')
        .eq('course_id', courseId)
        .order('order_index');

      if (milestonesError) {
        console.error('Error fetching milestones:', milestonesError);
        throw new Error(`Failed to fetch milestones: ${milestonesError.message}`);
      }

      // Find current milestone index and activate next one
      const currentIndex = milestones.findIndex(m => m.id === milestoneId);
      const nextMilestone = milestones[currentIndex + 1];
      let courseCompleted = false;

      if (nextMilestone) {
        // Activate next milestone
        const { error: nextError } = await supabase
          .from('progress')
          .update({ status: 'active' })
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .eq('milestone_id', nextMilestone.id);

        if (nextError) {
          console.error('Error activating next milestone:', nextError);
          // Don't throw here, just log the error
        } else {
          console.log('Next milestone activated:', nextMilestone.id);
        }
      } else {
        // No more milestones - course completed
        courseCompleted = true;
        const { error: courseError } = await supabase
          .from('courses')
          .update({ status: 'completed' })
          .eq('id', courseId)
          .eq('user_id', userId);

        if (courseError) {
          console.error('Error marking course as completed:', courseError);
          // Don't throw here, just log the error
        } else {
          console.log('Course marked as completed');
        }

        // Generate certificate automatically
        try {
          console.log('Generating certificate for completed course...');
          const certResponse = await fetch(`${supabaseUrl}/functions/v1/generate-certificate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              courseId
            })
          });

          if (certResponse.ok) {
            console.log('Certificate generated successfully');
          } else {
            const errorText = await certResponse.text();
            console.error('Failed to generate certificate:', errorText);
          }
        } catch (certError) {
          console.error('Error generating certificate:', certError);
        }
      }
    } else {
      console.log('Quiz failed with score:', score);
    }

    return new Response(JSON.stringify({
      success: true,
      passed,
      score,
      correctAnswers,
      totalQuestions,
      courseCompleted: passed && courseCompleted // Course is completed if passed and no next milestone
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in submit-quiz function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
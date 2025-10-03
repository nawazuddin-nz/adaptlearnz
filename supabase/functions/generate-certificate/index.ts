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
    const { userId, courseId } = await req.json();
    console.log('Generating certificate for:', { userId, courseId });

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('name, duration')
      .eq('id', courseId)
      .eq('user_id', userId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Check if certificate already exists
    const { data: existingCert, error: certCheckError } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (!certCheckError && existingCert) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Certificate already exists',
        certificateId: existingCert.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create certificate data
    const certificateData = {
      recipientName: profile.name,
      courseName: course.name,
      duration: course.duration,
      completionDate: new Date().toISOString().split('T')[0],
      certificateId: crypto.randomUUID(),
      issuer: 'AI Learning Platform',
    };

    // Insert certificate into database
    const { data: certificate, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: userId,
        course_id: courseId,
        certificate_data: certificateData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting certificate:', insertError);
      throw new Error('Failed to generate certificate');
    }

    console.log('Certificate generated successfully:', certificate.id);

    return new Response(JSON.stringify({
      success: true,
      certificate: certificate,
      certificateData: certificateData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-certificate function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
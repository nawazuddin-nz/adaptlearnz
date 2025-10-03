-- Add RLS bypass policies for service role operations
-- These policies allow service role (used in edge functions) to bypass user-specific restrictions

-- Allow service role to insert/update/select on all tables
CREATE POLICY "Service role bypass for courses" ON public.courses
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass for milestones" ON public.milestones
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass for progress" ON public.progress
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass for profiles" ON public.profiles
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role bypass for certificates" ON public.certificates
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
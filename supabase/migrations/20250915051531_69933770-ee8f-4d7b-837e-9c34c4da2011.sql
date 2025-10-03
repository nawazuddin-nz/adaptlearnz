-- Add RLS policies to allow course owners to manage their milestones

-- Allow users to insert milestones for courses they own
CREATE POLICY "Users can create milestones for their courses" 
ON public.milestones 
FOR INSERT 
WITH CHECK (
  course_id IN (
    SELECT id FROM courses WHERE user_id = auth.uid()
  )
);

-- Allow users to update milestones for courses they own
CREATE POLICY "Users can update milestones for their courses" 
ON public.milestones 
FOR UPDATE 
USING (
  course_id IN (
    SELECT id FROM courses WHERE user_id = auth.uid()
  )
);

-- Allow users to delete milestones for courses they own
CREATE POLICY "Users can delete milestones for their courses" 
ON public.milestones 
FOR DELETE 
USING (
  course_id IN (
    SELECT id FROM courses WHERE user_id = auth.uid()
  )
);
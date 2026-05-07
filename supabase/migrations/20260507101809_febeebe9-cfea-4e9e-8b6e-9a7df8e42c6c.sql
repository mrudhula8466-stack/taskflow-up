DROP POLICY IF EXISTS "admins update any task, members update own assigned" ON public.tasks;

CREATE POLICY "admins update any task"
ON public.tasks
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "assignees update own task limited fields"
ON public.tasks
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (
  assigned_to = auth.uid()
  AND project_id = (SELECT project_id FROM public.tasks t WHERE t.id = tasks.id)
  AND title     = (SELECT title      FROM public.tasks t WHERE t.id = tasks.id)
  AND description IS NOT DISTINCT FROM (SELECT description FROM public.tasks t WHERE t.id = tasks.id)
  AND priority  = (SELECT priority   FROM public.tasks t WHERE t.id = tasks.id)
  AND due_date IS NOT DISTINCT FROM (SELECT due_date FROM public.tasks t WHERE t.id = tasks.id)
  AND created_by = (SELECT created_by FROM public.tasks t WHERE t.id = tasks.id)
);
-- Create goals table for savings goals
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    target_amount numeric NOT NULL CHECK (target_amount > 0::numeric),
    current_amount numeric NOT NULL DEFAULT 0,
    category text NOT NULL,
    target_date date NOT NULL,
    is_active boolean DEFAULT true,
    icon text DEFAULT 'goal',
    icon_color text DEFAULT '#10b981',
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT goals_pkey PRIMARY KEY (id),
    CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT goals_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_account_id ON public.goals(account_id);
CREATE INDEX IF NOT EXISTS idx_goals_category ON public.goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_is_active ON public.goals(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_goals_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON public.goals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_goals_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own goals
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own goals
CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own goals
CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own goals
CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON public.goals TO authenticated;
GRANT USAGE ON SEQUENCE goals_id_seq TO authenticated;

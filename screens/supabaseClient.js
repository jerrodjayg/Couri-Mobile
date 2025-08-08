import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfkykasruwdzpcjuufdu.supabase.co';
// TODO: Replace with your actual API key from Supabase Dashboard > Settings > API > anon public
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ma3lrYXNydXdkenBjanV1ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTU5OTcsImV4cCI6MjA2NTc3MTk5N30._-SBo_yqk0ABeXNHYGsKjBn2HwrFP-QCjCkJn2KqtOw';

export const supabase = createClient(supabaseUrl, supabaseKey);
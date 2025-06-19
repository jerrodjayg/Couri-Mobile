import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_COURI_URL
const supabaseKey = process.env.REACT_COURI_KEY

const supabase = createClient(supabaseUrl, supabaseKey)
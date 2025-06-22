import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nfkykasruwdzpcjuufdu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ma3lrYXNydXdkenBjanV1ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTU5OTcsImV4cCI6MjA2NTc3MTk5N30._-SBo_yqk0ABeXNHYGsKjBn2HwrFP-QCjCkJn2KqtOw'

const supabase = createClient(supabaseUrl, supabaseKey)
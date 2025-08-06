import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wxcvloabiislvvnqqwuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Y3Zsb2FiaWlzbHZ2bnFxd3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MDg1MTAsImV4cCI6MjA2OTQ4NDUxMH0.kjS2ODsVVBaKKIlfAxmJfd2uOosb0Bp1JVedPNAPK34';

export const supabase = createClient(supabaseUrl, supabaseKey);
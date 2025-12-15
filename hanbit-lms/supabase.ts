import { createClient } from '@supabase/supabase-js';

// TODO: Supabase 대시보드 -> Project Settings -> API 에서 복사하여 입력하세요.
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

supabase.from('documents')
  .select('document_title, content')
  .order('created_at', { ascending: false })
  .limit(5)
  .then(res => {
    console.log("LAST 5 DOCUMENTS:");
    console.log(JSON.stringify(res.data, null, 2));
  })
  .catch(console.error);

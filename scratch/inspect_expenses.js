const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) env[key.trim()] = val.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'expenses' });
  
  if (error) {
    // If RPC doesn't exist, try getting a row and checking keys
    const { data: row, error: rowErr } = await supabase.from('expenses').select('*').limit(1);
    if (rowErr) {
        console.error("Error:", rowErr);
    } else {
        console.log("Columns found in data:", Object.keys(row[0] || {}));
    }
  } else {
    console.log("Columns:", data);
  }
}

inspect();

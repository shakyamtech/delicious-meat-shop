const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateBuffMeat() {
  // Update BUFF Meat (ID: 1) with the new variants
  // format is Name:Qty,Name:Qty
  const newSizes = "1kg:10, 1.5kg:10, 2kg:10";
  
  const { data, error } = await supabase
    .from('products')
    .update({ sizes: newSizes })
    .eq('id', 1)
    .select();

  if (error) {
    console.error("Error updating BUFF Meat:", error);
    return;
  }
  console.log("Successfully updated BUFF Meat:", JSON.stringify(data, null, 2));
}

updateBuffMeat();

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SERVICE_KEY);

  // 1. Check the assignments constraint
  const { data: sample } = await supabase.from('assignments').select('school_id,teacher_id,subject_id,class_id').eq('type', 'td').limit(1);
  if (!sample || sample.length === 0) { console.log('NO SAMPLE TD ROW - already cleaned up'); return; }
  const s = sample[0];

  const { error: tdErr } = await supabase.from('assignments').insert({
    school_id: s.school_id, teacher_id: s.teacher_id, subject_id: s.subject_id,
    class_id: s.class_id, title: 'constraint-test-td', type: 'td', due_date: '2026-12-31'
  });
  if (tdErr) console.log('CONSTRAINT OK - td rejected:', tdErr.message);
  else console.log('CONSTRAINT NOT UPDATED - td type still allowed');

  // 2. Check payments table columns using sample row or error message
  const { data: paySample } = await supabase.from('payments').select('*').limit(1);
  if (paySample && paySample.length > 0) {
    console.log('Payments columns:', Object.keys(paySample[0]).join(', '));
  } else {
    // Try inserting with the 'status' column to see if it's accepted
    const { data: validSchool } = await supabase.from('schools').select('id').limit(1).single();
    if (validSchool) {
      const { error: payErr } = await supabase.from('payments').insert({
        school_id: validSchool.id,
        student_id: '00000000-0000-0000-0000-000000000000',
        amount: 1000,
        status: 'pending'
      });
      console.log('Payments insert with status column:', payErr ? 'FAILED - ' + payErr.message : 'SUCCEEDED - status column exists');
    }
  }

  // 3. Check buckets
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketNames = (buckets || []).map(b => b.id);
  console.log('Buckets:', bucketNames.join(', '));
  console.log('receipts bucket:', bucketNames.includes('receipts') ? 'EXISTS' : 'MISSING');
  console.log('td-materials bucket:', bucketNames.includes('td-materials') ? 'EXISTS' : 'MISSING');
}

main().catch(console.error);
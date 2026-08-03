const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SERVICE_KEY);

  // 1. Check the old constraint
  const { data: constraints } = await supabase.rpc('pgquery', {
    query: `SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'assignments'::regclass AND contype = 'c'`
  }).catch(() => ({}));

  if (constraints) console.log('Assignments constraints:', JSON.stringify(constraints));

  // 2. Try migrating the data via REST API operations
  const { data: tdAssignments } = await supabase.from('assignments').select('*').in('type', ['td', 'tp']);
  console.log(`Found ${tdAssignments?.length || 0} td/tp assignment(s) to migrate`);

  if (tdAssignments && tdAssignments.length > 0) {
    for (const a of tdAssignments) {
      const { error: insertErr } = await supabase.from('td_sessions').insert({
        id: a.id,
        school_id: a.school_id,
        teacher_id: a.teacher_id,
        subject_id: a.subject_id,
        class_id: a.class_id,
        term_id: a.term_id,
        type: a.type,
        title: a.title,
        session_date: a.due_date,
        description: a.description,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at
      });
      if (insertErr) console.log(`Insert error for ${a.id}:`, insertErr.message);
      else console.log(`Migrated: ${a.id} (${a.title})`);

      // Also migrate attachments
      const { data: attachments } = await supabase.from('assignment_attachments').select('*').eq('assignment_id', a.id);
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const { error: attErr } = await supabase.from('td_materials').insert({
            td_session_id: att.assignment_id,
            file_name: att.file_name,
            file_type: att.file_type,
            file_size: att.file_size,
            storage_path: att.storage_path,
            created_at: att.created_at
          });
          if (attErr) console.log(`  Attach error: ${attErr.message}`);
          else console.log(`  Migrated attachment: ${att.file_name}`);
        }
      }
    }
  }

  // 3. Verify migration
  const { data: migrated } = await supabase.from('td_sessions').select('id,title,type');
  console.log(`\ntd_sessions now has ${migrated?.length || 0} record(s):`, JSON.stringify(migrated));
}

main().catch(console.error);
import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';

// Load environment variables
import 'dotenv/config';

program
  .name('create-school')
  .description('CLI to create a new school')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new school')
  .requiredOption('-n, --name <name>', 'Name of the school')
  .requiredOption('-s, --subdomain <subdomain>', 'Subdomain for the school')
  .requiredOption('-c, --code <code>', 'Unique code for the school')
  .action(createSchool);

export async function createSchool(options: { name: string; subdomain: string; code: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  console.log('Creating school with the following options:', options);

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabaseAdmin.from('schools').insert([
    {
      name: options.name,
      subdomain: options.subdomain,
      code: options.code,
    },
  ]);

  if (error) {
    console.error('Error creating school:', error);
    process.exit(1);
  }

  console.log('School created successfully:', data);
}

if (require.main === module) {
  program.parse(process.argv);
}

// Your existing code up until line 28

// Supabase query
const { data, error } = await supabase
  .from('schools')
  .select('*')
  .eq('id', schoolId);

// Error check
if (error) {
  // Handle error accordingly
  console.error('Error fetching school:', error);
  throw new Error('Unable to fetch school data.');
}

// Continue with the rest of your code
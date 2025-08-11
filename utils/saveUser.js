// utils/saveUser.js

export async function saveUserToDatabase(user) {
  // Split the full name into first and last name
  const fullName = user.user_metadata.full_name || user.user_metadata.name || '';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      avatar_url: user.user_metadata.avatar_url,
    });

  if (error) {
    console.error('Error saving user to Supabase:', error.message);
  } else {
    console.log('User saved to Supabase:', data);
  }
}


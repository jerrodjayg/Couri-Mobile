// utils/saveUser.js

export async function saveUserToDatabase(user) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata.full_name || user.user_metadata.name,
      avatar_url: user.user_metadata.avatar_url,
    });

  if (error) {
    console.error('Error saving user to Supabase:', error.message);
  } else {
    console.log('User saved to Supabase:', data);
  }
}


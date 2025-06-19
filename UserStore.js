//Mock database that stores user without using SQL

const users = [];

export function addUser(user) {
  users.push(user);
}

export function findUserByEmail(email) {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserByEmailOrPhone(emailOrPhone) {
  return users.find(u => 
    u.email.toLowerCase() === emailOrPhone.toLowerCase() || 
    u.phone === emailOrPhone
  );
}

export default {
  users,
  addUser,
  findUserByEmail,
  findUserByEmailOrPhone,
};

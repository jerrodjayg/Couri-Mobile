const jwt = require('jsonwebtoken');
const fs = require('fs');

const teamId = 'S4VHGX8378';
const keyId = '83TYK3PXXH';
const clientId = 'com.anonymous.jerroddd'; // e.g., com.anonymous.jerrod
const privateKey = fs.readFileSync('./AuthKey_83TYK3PXXH.p8');

const token = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000, // 6 months
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log('Apple Secret Key (JWT):');
console.log(token);

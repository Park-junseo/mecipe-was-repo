export const jwtConstants = {
  secret: process.env.JWT_SECRET
    ? Buffer.from(process.env.JWT_SECRET.trim(), 'base64').toString('utf-8')
    : 'default-secret-change-in-production',
};
export const loginCryptoConstants = {
  secret: process.env.SECRET_LOGIN_CRYPTO || 'default-crypto-change-in-production',
};
// health_club

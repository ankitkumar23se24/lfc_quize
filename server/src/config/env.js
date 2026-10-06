import 'dotenv/config';
export const env = { port: process.env.PORT || 4000, mongoUri: process.env.MONGO_URI, clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' };

import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // This tells Prisma to grab the URL from your .env file
    url: process.env.DATABASE_URL,
  },
});

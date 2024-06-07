import { z } from 'zod';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import type { User } from './app/lib/definitions';
import { sql } from '@vercel/postgres';
import { compare } from 'bcrypt';

const getUser = async (email: string): Promise<User | undefined> => {
  try {
    const user = await sql<User>`select * from users where email = ${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
};

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;

          const passwordIsValid = await compare(password, user.password);
          if (passwordIsValid) return user;
        }

        return null;
      },
    }),
  ],
});
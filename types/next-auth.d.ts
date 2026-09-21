// next-auth type extensions
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      extension: string;
    };
  }

  interface User {
    id: string;
    role: string;
    extension: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    extension: string;
  }
}

import type { Role } from "@/lib/enums";
import type { DefaultSession } from "next-auth";

// Augment NextAuth's Session/JWT/User with our id + role fields.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

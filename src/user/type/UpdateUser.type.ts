export type UpdateUserType =
  | {
      username?: string;
      email?: string;
    }
  | { password: string };

export type AccountRole = "CLIENT" | "COURIER" | "RESTAURANT";

export type Account = Readonly<{
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  fullName: string;
  email: string;
  password: string;
  role: AccountRole;
  createdAt: string;
}>;

import { User } from './user';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

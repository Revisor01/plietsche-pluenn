export interface AuthUser {
  sub: string;      // userId (UUID)
  storeId: string;  // UUID
  role: 'admin' | 'volunteer' | 'visitor';
}

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  storeId: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'volunteer' | 'visitor';
    storeId: string;
    plietschPoints: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}
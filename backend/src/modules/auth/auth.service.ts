import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import * as authRepo from './auth.repository';
import type { RegisterBody, LoginBody, AuthResponse, AuthUser } from './auth.types';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

export async function register(body: RegisterBody): Promise<AuthResponse> {
  const existing = await authRepo.findUserByEmail(body.email);
  if (existing) {
    const err = Object.assign(new Error('Email already registered'), { statusCode: 409 });
    throw err;
  }

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
  const user = await authRepo.createUser({
    username: body.username,
    email: body.email,
    passwordHash,
    storeId: body.storeId,
  });

  const payload: AuthUser = { sub: user.id, storeId: user.storeId, role: user.role as AuthUser['role'] };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: JWT_EXPIRY });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as AuthUser['role'],
      storeId: user.storeId,
      plietschPoints: user.plietschPoints ?? 0,
    },
  };
}

export async function login(body: LoginBody): Promise<AuthResponse> {
  const user = await authRepo.findUserByEmail(body.email);
  if (!user) {
    // Gleiche Fehlermeldung für "User nicht gefunden" und "Passwort falsch"
    // verhindert User-Enumeration (T-03-03)
    const err = Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    throw err;
  }

  const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);
  if (!passwordMatch) {
    const err = Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    throw err;
  }

  const payload: AuthUser = { sub: user.id, storeId: user.storeId, role: user.role as AuthUser['role'] };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: JWT_EXPIRY });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as AuthUser['role'],
      storeId: user.storeId,
      plietschPoints: user.plietschPoints ?? 0,
    },
  };
}

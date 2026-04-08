import bcrypt from 'bcrypt';
import * as adminRepo from './admin.repository';

const BCRYPT_ROUNDS = 12;

export async function listVolunteers(storeId: string) {
  return adminRepo.findUsersByStoreAndRole(storeId, 'volunteer');
}

export interface CreateVolunteerBody {
  username: string;
  email: string;
  password: string;
}

export async function createVolunteer(body: CreateVolunteerBody, storeId: string) {
  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
  return adminRepo.createUser({
    username: body.username,
    email: body.email,
    passwordHash,
    storeId,
    role: 'volunteer',
  });
}

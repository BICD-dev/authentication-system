import { User ,Credential } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/prisma/client";
import { IRepository } from "./interface/IRepository";

export class UserRepository  implements IRepository<User, { email?: string; firstName?: string; lastName?: string }, Partial<User>> {
  async create(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }, tx?: Prisma.TransactionClient): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.create({
                data: {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName
                }
            })
            resolve(user)
        } catch (error) {
            reject(error)
        }
    })
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return  new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.findUnique({
                where: { id },
            })
            resolve(user)
        } catch (error) {
            reject(error)
        }
    })
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return  new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.findUnique({
                where: { email },
            })
            resolve(user)
        } catch (error) {
            reject(error)
        }
    })
  }


  async update(id: string, data: Partial<User>, tx?: Prisma.TransactionClient): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.update({
                where: { id },
                data,
            });
            resolve(user);
        } catch (error) {
            reject(error);
        }
    });
}

    async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
        const db = tx ?? prisma;
        await db.user.delete({
            where: { id },
        });
    }

  async setEmailVerified(userId: string, tx?: Prisma.TransactionClient): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.update({
                where: { id: userId },
                data: { emailVerified: true },
            });
            resolve(user);
        } catch (error) {
            reject(error);
        }
    });
  }

  async updateLastLogin(userId: string, tx?: Prisma.TransactionClient): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.update({
                where: { id: userId },
                data: { lastLoginAt: new Date() },
            });
            resolve(user);
        } catch (error) {
            reject(error);
        }
    });
  }

  async createCredential(data: { user_id: string; passwordHash: string }, tx?: Prisma.TransactionClient): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            // i am not checkin if th credential already exists because the user_id is unique in the credentials table and it will throw an error if it already exists
            const db = tx ?? prisma;
            await db.credential.create({
                data: {
                    userId: data.user_id,
                    passwordHash: data.passwordHash
                }
            })
            resolve()
        } catch (error) {
            reject(error)
        }
    })
  }

  async findCredentialByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<Partial<Credential> | null> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const credential = await db.credential.findUnique({
                where: { userId },
                select: { passwordHash: true }
            })
            resolve(credential)
        } catch (error) {
            reject(error)
        }
    })
  }

  async updateCredential(userId: string, passwordHash: string, tx?: Prisma.TransactionClient): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            await db.credential.update({
                where: { userId },
                data: { passwordHash }
            })
            resolve()
        } catch (error) {
            reject(error)
        }
    })
  }
}

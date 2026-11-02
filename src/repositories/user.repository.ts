import { User } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/prisma/client";
import { IRepository } from "./interface/IRepository";

export class UserRepository implements IRepository<User, { email?: string; firstName?: string; lastName?: string, password?:string }, Partial<User>> {

  async create(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?:string;
  }, tx?: Prisma.TransactionClient): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.create({
                data: {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    password: data.password
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

  async setEmailVerifiedAt(userId: string, tx?: Prisma.TransactionClient): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = tx ?? prisma;
            const user = await db.user.update({
                where: { id: userId },
                data: { emailVerifiedAt: new Date() },
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


}

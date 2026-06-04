import { User } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { IRepository } from "./interface/IRepository";

export class UserRepository  implements IRepository<User, { email?: string; firstName?: string; lastName?: string }, Partial<User>> {
  async create(data: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await prisma.user.create({
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

  async findById(id: string): Promise<User | null> {
    return  new Promise(async (resolve, reject) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id },
            })
            resolve(user)
        } catch (error) {
            reject(error)
        }
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return  new Promise(async (resolve, reject) => {
        try {
            const user = await prisma.user.findUnique({
                where: { email },
            })
            resolve(user)
        } catch (error) {
            reject(error)
        }
    })
  }


  async update(id: string, data: Partial<User>): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await prisma.user.update({
                where: { id },
                data,
            });
            resolve(user);
        } catch (error) {
            reject(error);
        }
    });
}

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  async setEmailVerified(userId: string): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data: { emailVerified: true },
            });
            resolve(user);
        } catch (error) {
            reject(error);
        }
    });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await prisma.user.update({
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

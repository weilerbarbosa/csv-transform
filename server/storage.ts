import {
  type User,
  type InsertUser,
  type Template,
  type InsertTemplate,
  type Transformation,
  type InsertTransformation,
  type SftpConfig,
  type InsertSftpConfig,
  type UploadLog,
  type InsertUploadLog,
  users,
  templates,
  transformations,
  sftpConfigs,
  uploadLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(data: InsertTemplate): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;

  getTransformations(): Promise<Transformation[]>;
  getTransformation(id: number): Promise<Transformation | undefined>;
  createTransformation(data: InsertTransformation): Promise<Transformation>;
  updateTransformation(id: number, data: Partial<Transformation>): Promise<Transformation>;

  getSftpConfigs(): Promise<SftpConfig[]>;
  getSftpConfig(id: number): Promise<SftpConfig | undefined>;
  createSftpConfig(data: InsertSftpConfig): Promise<SftpConfig>;
  deleteSftpConfig(id: number): Promise<void>;

  getUploadLogs(): Promise<UploadLog[]>;
  createUploadLog(data: InsertUploadLog): Promise<UploadLog>;
  updateUploadLog(id: number, data: Partial<UploadLog>): Promise<UploadLog>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async createTemplate(data: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(data).returning();
    return template;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  async getTransformations(): Promise<Transformation[]> {
    return db.select().from(transformations).orderBy(desc(transformations.createdAt));
  }

  async getTransformation(id: number): Promise<Transformation | undefined> {
    const [t] = await db.select().from(transformations).where(eq(transformations.id, id));
    return t || undefined;
  }

  async createTransformation(data: InsertTransformation): Promise<Transformation> {
    const [t] = await db.insert(transformations).values(data).returning();
    return t;
  }

  async updateTransformation(id: number, data: Partial<Transformation>): Promise<Transformation> {
    const [t] = await db.update(transformations).set(data).where(eq(transformations.id, id)).returning();
    return t;
  }

  async getSftpConfigs(): Promise<SftpConfig[]> {
    return db.select().from(sftpConfigs).orderBy(desc(sftpConfigs.createdAt));
  }

  async getSftpConfig(id: number): Promise<SftpConfig | undefined> {
    const [config] = await db.select().from(sftpConfigs).where(eq(sftpConfigs.id, id));
    return config || undefined;
  }

  async createSftpConfig(data: InsertSftpConfig): Promise<SftpConfig> {
    const [config] = await db.insert(sftpConfigs).values(data).returning();
    return config;
  }

  async deleteSftpConfig(id: number): Promise<void> {
    await db.delete(sftpConfigs).where(eq(sftpConfigs.id, id));
  }

  async getUploadLogs(): Promise<UploadLog[]> {
    return db.select().from(uploadLogs).orderBy(desc(uploadLogs.createdAt));
  }

  async createUploadLog(data: InsertUploadLog): Promise<UploadLog> {
    const [log] = await db.insert(uploadLogs).values(data).returning();
    return log;
  }

  async updateUploadLog(id: number, data: Partial<UploadLog>): Promise<UploadLog> {
    const [log] = await db.update(uploadLogs).set(data).where(eq(uploadLogs.id, id)).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();

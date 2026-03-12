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
import { eq, desc, count, avg, sql } from "drizzle-orm";

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface DashboardStats {
  totalTransformations: number;
  completedTransformations: number;
  errorTransformations: number;
  successRate: number;
  averageConfidence: number;
  mostUsedTemplate: { id: number; name: string; count: number } | null;
  totalUploads: number;
  successfulUploads: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(data: InsertTemplate): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;

  getTransformations(pagination?: PaginationParams): Promise<Transformation[]>;
  getTransformation(id: number): Promise<Transformation | undefined>;
  createTransformation(data: InsertTransformation): Promise<Transformation>;
  updateTransformation(id: number, data: Partial<Transformation>): Promise<Transformation>;
  getTransformationCountByTemplate(templateId: number): Promise<number>;

  getSftpConfigs(): Promise<SftpConfig[]>;
  getSftpConfig(id: number): Promise<SftpConfig | undefined>;
  createSftpConfig(data: InsertSftpConfig): Promise<SftpConfig>;
  deleteSftpConfig(id: number): Promise<void>;

  getUploadLogs(pagination?: PaginationParams): Promise<UploadLog[]>;
  createUploadLog(data: InsertUploadLog): Promise<UploadLog>;
  updateUploadLog(id: number, data: Partial<UploadLog>): Promise<UploadLog>;

  getStats(): Promise<DashboardStats>;
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

  async getTransformations(pagination?: PaginationParams): Promise<Transformation[]> {
    let query = db.select().from(transformations).orderBy(desc(transformations.createdAt)).$dynamic();
    if (pagination?.limit !== undefined) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset !== undefined) {
      query = query.offset(pagination.offset);
    }
    return query;
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

  async getTransformationCountByTemplate(templateId: number): Promise<number> {
    const [result] = await db.select({ value: count() }).from(transformations).where(eq(transformations.templateId, templateId));
    return result?.value ?? 0;
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

  async getUploadLogs(pagination?: PaginationParams): Promise<UploadLog[]> {
    let query = db.select().from(uploadLogs).orderBy(desc(uploadLogs.createdAt)).$dynamic();
    if (pagination?.limit !== undefined) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset !== undefined) {
      query = query.offset(pagination.offset);
    }
    return query;
  }

  async createUploadLog(data: InsertUploadLog): Promise<UploadLog> {
    const [log] = await db.insert(uploadLogs).values(data).returning();
    return log;
  }

  async updateUploadLog(id: number, data: Partial<UploadLog>): Promise<UploadLog> {
    const [log] = await db.update(uploadLogs).set(data).where(eq(uploadLogs.id, id)).returning();
    return log;
  }

  async getStats(): Promise<DashboardStats> {
    // Total and status counts for transformations
    const [totalResult] = await db.select({ value: count() }).from(transformations);
    const totalTransformations = totalResult?.value ?? 0;

    const [completedResult] = await db.select({ value: count() }).from(transformations).where(eq(transformations.status, "completed"));
    const completedTransformations = completedResult?.value ?? 0;

    const [errorResult] = await db.select({ value: count() }).from(transformations).where(eq(transformations.status, "error"));
    const errorTransformations = errorResult?.value ?? 0;

    const successRate = totalTransformations > 0 ? completedTransformations / totalTransformations : 0;

    // Average confidence from column mappings
    const allTransformations = await db.select({
      columnMappings: transformations.columnMappings,
    }).from(transformations).where(eq(transformations.status, "completed"));

    let totalConfidence = 0;
    let mappingCount = 0;
    for (const t of allTransformations) {
      const mappings = t.columnMappings as { confidence: number }[] | null;
      if (mappings) {
        for (const m of mappings) {
          if (typeof m.confidence === "number") {
            totalConfidence += m.confidence;
            mappingCount++;
          }
        }
      }
    }
    const averageConfidence = mappingCount > 0 ? totalConfidence / mappingCount : 0;

    // Most used template
    const templateCounts = await db
      .select({
        templateId: transformations.templateId,
        usageCount: count(),
      })
      .from(transformations)
      .groupBy(transformations.templateId)
      .orderBy(desc(count()))
      .limit(1);

    let mostUsedTemplate: DashboardStats["mostUsedTemplate"] = null;
    if (templateCounts.length > 0) {
      const tmpl = await this.getTemplate(templateCounts[0].templateId);
      if (tmpl) {
        mostUsedTemplate = {
          id: tmpl.id,
          name: tmpl.name,
          count: templateCounts[0].usageCount,
        };
      }
    }

    // Upload stats
    const [totalUploadsResult] = await db.select({ value: count() }).from(uploadLogs);
    const totalUploads = totalUploadsResult?.value ?? 0;

    const [successUploadsResult] = await db.select({ value: count() }).from(uploadLogs).where(eq(uploadLogs.status, "success"));
    const successfulUploads = successUploadsResult?.value ?? 0;

    return {
      totalTransformations,
      completedTransformations,
      errorTransformations,
      successRate,
      averageConfidence,
      mostUsedTemplate,
      totalUploads,
      successfulUploads,
    };
  }
}

export const storage = new DatabaseStorage();

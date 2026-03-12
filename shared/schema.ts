import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/chat";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  columns: jsonb("columns").$type<string[]>().notNull(),
  sampleData: jsonb("sample_data").$type<Record<string, string>[]>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const templatesRelations = relations(templates, ({ many }) => ({
  transformations: many(transformations),
}));

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export const transformations = pgTable("transformations", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  originalFileName: text("original_file_name").notNull(),
  status: text("status").notNull().default("pending"),
  columnMappings: jsonb("column_mappings").$type<ColumnMapping[]>(),
  errors: jsonb("errors").$type<TransformationError[]>(),
  outputData: jsonb("output_data").$type<Record<string, string>[]>(),
  totalRows: integer("total_rows").default(0),
  successRows: integer("success_rows").default(0),
  errorRows: integer("error_rows").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const transformationsRelations = relations(transformations, ({ one }) => ({
  template: one(templates, {
    fields: [transformations.templateId],
    references: [templates.id],
  }),
}));

export const insertTransformationSchema = createInsertSchema(transformations).omit({
  id: true,
  createdAt: true,
});

export type Transformation = typeof transformations.$inferSelect;
export type InsertTransformation = z.infer<typeof insertTransformationSchema>;

export const sftpConfigs = pgTable("sftp_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(22),
  username: text("username").notNull(),
  password: text("password").notNull(),
  remotePath: text("remote_path").notNull().default("/"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSftpConfigSchema = createInsertSchema(sftpConfigs).omit({
  id: true,
  createdAt: true,
});

export type SftpConfig = typeof sftpConfigs.$inferSelect;
export type InsertSftpConfig = z.infer<typeof insertSftpConfigSchema>;

export const uploadLogs = pgTable("upload_logs", {
  id: serial("id").primaryKey(),
  transformationId: integer("transformation_id").notNull().references(() => transformations.id),
  sftpConfigId: integer("sftp_config_id").notNull().references(() => sftpConfigs.id),
  status: text("status").notNull().default("pending"),
  fileName: text("file_name").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUploadLogSchema = createInsertSchema(uploadLogs).omit({
  id: true,
  createdAt: true,
});

export type UploadLog = typeof uploadLogs.$inferSelect;
export type InsertUploadLog = z.infer<typeof insertUploadLogSchema>;

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
  status: "matched" | "unmatched" | "manual";
}

export interface TransformationError {
  row: number;
  column: string;
  value: string;
  error: string;
}

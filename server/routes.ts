import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import OpenAI from "openai";
import SftpClient from "ssh2-sftp-client";
import { insertSftpConfigSchema, type ColumnMapping, type TransformationError } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function parseFileToRows(buffer: Buffer, filename: string): { headers: string[]; rows: Record<string, string>[] } {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "csv") {
    const text = buffer.toString("utf-8");
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    const headers = result.meta.fields || [];
    const rows = result.data as Record<string, string>[];
    return { headers, rows };
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const rows = jsonData.map((row) => {
    const cleanRow: Record<string, string> = {};
    for (const key of headers) {
      cleanRow[key] = String(row[key] ?? "");
    }
    return cleanRow;
  });
  return { headers, rows };
}

function rowsToCSV(rows: Record<string, string>[], columns: string[]): string {
  const header = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => `"${String(row[c] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...dataLines].join("\n");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(parseInt(req.params.id));
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const name = req.body.name;
      if (!name) return res.status(400).json({ error: "Template name is required" });

      const { headers, rows } = parseFileToRows(req.file.buffer, req.file.originalname);
      if (headers.length === 0) return res.status(400).json({ error: "File has no columns" });

      const sampleData = rows.slice(0, 3);
      const template = await storage.createTemplate({
        name,
        columns: headers,
        sampleData,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      await storage.deleteTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post("/api/transform", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const templateId = parseInt(req.body.templateId);
      if (!templateId) return res.status(400).json({ error: "Template ID is required" });

      const template = await storage.getTemplate(templateId);
      if (!template) return res.status(404).json({ error: "Template not found" });

      const { headers: sourceHeaders, rows: sourceRows } = parseFileToRows(
        req.file.buffer,
        req.file.originalname
      );

      if (sourceHeaders.length === 0) return res.status(400).json({ error: "Source file has no columns" });

      const transformation = await storage.createTransformation({
        templateId,
        originalFileName: req.file.originalname,
        status: "processing",
        totalRows: sourceRows.length,
        successRows: 0,
        errorRows: 0,
        columnMappings: null,
        errors: null,
        outputData: null,
      });

      try {
        const targetColumns = template.columns as string[];
        const sampleSourceRows = sourceRows.slice(0, 5);

        const prompt = `You are a data mapping expert. I need to map source CSV columns to target CSV columns.

Source columns: ${JSON.stringify(sourceHeaders)}
Sample source data (first few rows): ${JSON.stringify(sampleSourceRows)}

Target columns: ${JSON.stringify(targetColumns)}
${template.sampleData ? `Sample target data: ${JSON.stringify(template.sampleData)}` : ""}

For each TARGET column, find the best matching SOURCE column. Return a JSON object with a "mappings" key containing an array.

Each mapping object should have:
- "sourceColumn": the source column name that best matches (or empty string if no match)
- "targetColumn": the target column name
- "confidence": a number from 0 to 1 indicating how confident you are in the match
- "status": "matched" if a good match was found, "unmatched" if no match

Consider column names, data types, sample values, and semantic meaning when matching.
Return ONLY JSON in the format: {"mappings": [...]}`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 4096,
        });

        const responseText = aiResponse.choices[0]?.message?.content || "{}";
        let parsedResponse: any;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch {
          parsedResponse = { mappings: [] };
        }

        let rawMappings: any[] = [];
        if (Array.isArray(parsedResponse)) {
          rawMappings = parsedResponse;
        } else if (Array.isArray(parsedResponse.mappings)) {
          rawMappings = parsedResponse.mappings;
        } else if (Array.isArray(parsedResponse.mapping)) {
          rawMappings = parsedResponse.mapping;
        } else {
          const keys = Object.keys(parsedResponse);
          for (const key of keys) {
            if (Array.isArray(parsedResponse[key])) {
              rawMappings = parsedResponse[key];
              break;
            }
          }
        }

        const validMappings: ColumnMapping[] = targetColumns.map((targetCol) => {
          const found = rawMappings.find(
            (m: any) =>
              m.targetColumn === targetCol ||
              m.target_column === targetCol ||
              m.targetcolumn === targetCol
          );
          const srcCol = found?.sourceColumn || found?.source_column || found?.sourcecolumn || "";
          if (found && srcCol && sourceHeaders.includes(srcCol)) {
            return {
              sourceColumn: srcCol,
              targetColumn: targetCol,
              confidence: typeof found.confidence === "number" ? found.confidence : 0.5,
              status: "matched" as const,
            };
          }
          return {
            sourceColumn: "",
            targetColumn: targetCol,
            confidence: 0,
            status: "unmatched" as const,
          };
        });

        const errors: TransformationError[] = [];
        const outputRows: Record<string, string>[] = [];
        let successCount = 0;
        let errorCount = 0;

        const unmatchedColumns = validMappings.filter((m) => m.status === "unmatched");
        for (const um of unmatchedColumns) {
          errors.push({
            row: 0,
            column: um.targetColumn,
            value: "",
            error: `No matching source column found for "${um.targetColumn}"`,
          });
        }

        const hasUnmatched = unmatchedColumns.length > 0;

        for (let i = 0; i < sourceRows.length; i++) {
          const sourceRow = sourceRows[i];
          const outputRow: Record<string, string> = {};
          let rowHasDataError = false;

          for (const mapping of validMappings) {
            if (mapping.status === "matched" && mapping.sourceColumn) {
              const value = sourceRow[mapping.sourceColumn];
              if (value !== undefined && value !== null && String(value).trim() !== "") {
                outputRow[mapping.targetColumn] = String(value);
              } else {
                outputRow[mapping.targetColumn] = "";
              }
            } else {
              outputRow[mapping.targetColumn] = "";
            }
          }

          outputRows.push(outputRow);
          if (rowHasDataError) {
            errorCount++;
          } else {
            successCount++;
          }
        }

        const updated = await storage.updateTransformation(transformation.id, {
          status: "completed",
          columnMappings: validMappings,
          errors: errors.length > 0 ? errors : null,
          outputData: outputRows,
          successRows: successCount,
          errorRows: errorCount,
        });

        res.json(updated);
      } catch (aiError: any) {
        console.error("AI transformation error:", aiError);
        const updated = await storage.updateTransformation(transformation.id, {
          status: "error",
          errors: [
            {
              row: 0,
              column: "",
              value: "",
              error: `AI processing error: ${aiError.message}`,
            },
          ],
        });
        res.json(updated);
      }
    } catch (error: any) {
      console.error("Transform error:", error);
      res.status(500).json({ error: error.message || "Transformation failed" });
    }
  });

  app.get("/api/transformations", async (req, res) => {
    try {
      const data = await storage.getTransformations();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transformations" });
    }
  });

  app.get("/api/transformations/:id", async (req, res) => {
    try {
      const t = await storage.getTransformation(parseInt(req.params.id));
      if (!t) return res.status(404).json({ error: "Not found" });
      res.json(t);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transformation" });
    }
  });

  app.get("/api/transformations/:id/download", async (req, res) => {
    try {
      const t = await storage.getTransformation(parseInt(req.params.id));
      if (!t) return res.status(404).json({ error: "Not found" });
      if (!t.outputData) return res.status(400).json({ error: "No output data" });

      const template = await storage.getTemplate(t.templateId);
      const columns = template?.columns as string[] || Object.keys((t.outputData as Record<string, string>[])[0] || {});
      const csv = rowsToCSV(t.outputData as Record<string, string>[], columns);

      const filename = t.originalFileName.replace(/\.(xlsx?|csv)$/i, "") + "_transformed.csv";
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to download" });
    }
  });

  app.get("/api/sftp-configs", async (req, res) => {
    try {
      const configs = await storage.getSftpConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch configs" });
    }
  });

  app.post("/api/sftp-configs", async (req, res) => {
    try {
      const parsed = insertSftpConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join(", ") });
      }
      const config = await storage.createSftpConfig(parsed.data);
      res.status(201).json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to create config" });
    }
  });

  app.delete("/api/sftp-configs/:id", async (req, res) => {
    try {
      await storage.deleteSftpConfig(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete config" });
    }
  });

  app.post("/api/sftp-configs/:id/test", async (req, res) => {
    try {
      const config = await storage.getSftpConfig(parseInt(req.params.id));
      if (!config) return res.status(404).json({ error: "Config not found" });

      const sftp = new SftpClient();
      try {
        await sftp.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          readyTimeout: 10000,
        });
        await sftp.list(config.remotePath);
        await sftp.end();
        res.json({ message: "Connection successful! Remote path is accessible." });
      } catch (sftpError: any) {
        await sftp.end().catch(() => {});
        res.status(400).json({ error: `Connection failed: ${sftpError.message}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Test failed" });
    }
  });

  app.post("/api/sftp/upload", async (req, res) => {
    try {
      const { transformationId, sftpConfigId } = req.body;
      if (!transformationId || !sftpConfigId) {
        return res.status(400).json({ error: "Missing transformationId or sftpConfigId" });
      }

      const transformation = await storage.getTransformation(transformationId);
      if (!transformation) return res.status(404).json({ error: "Transformation not found" });
      if (!transformation.outputData) return res.status(400).json({ error: "No output data to upload" });

      const config = await storage.getSftpConfig(sftpConfigId);
      if (!config) return res.status(404).json({ error: "SFTP config not found" });

      const template = await storage.getTemplate(transformation.templateId);
      const columns = template?.columns as string[] || Object.keys((transformation.outputData as Record<string, string>[])[0] || {});
      const csv = rowsToCSV(transformation.outputData as Record<string, string>[], columns);

      const filename = transformation.originalFileName.replace(/\.(xlsx?|csv)$/i, "") + "_transformed.csv";

      const log = await storage.createUploadLog({
        transformationId,
        sftpConfigId,
        status: "pending",
        fileName: filename,
        errorMessage: null,
      });

      const sftp = new SftpClient();
      try {
        await sftp.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          readyTimeout: 15000,
        });

        const remotePath = config.remotePath.endsWith("/")
          ? config.remotePath + filename
          : config.remotePath + "/" + filename;

        await sftp.put(Buffer.from(csv, "utf-8"), remotePath);
        await sftp.end();

        await storage.updateUploadLog(log.id, { status: "success" });
        res.json({ message: `File "${filename}" uploaded successfully to ${config.host}:${remotePath}` });
      } catch (sftpError: any) {
        await sftp.end().catch(() => {});
        const errorMsg = `SFTP upload failed: ${sftpError.message}`;
        await storage.updateUploadLog(log.id, { status: "error", errorMessage: errorMsg });
        res.status(500).json({ error: errorMsg });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  app.get("/api/upload-logs", async (req, res) => {
    try {
      const logs = await storage.getUploadLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  return httpServer;
}

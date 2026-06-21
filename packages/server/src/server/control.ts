import { CreateGrantRequest } from "@mikkel-ol/shared";
import express from "express";
import { Router } from "express";
import { createGrant, revokeGrants } from "./grants.js";

export const control: ReturnType<typeof Router> = Router();

control.use(express.json({ limit: "64kb" }));

control.use((req, res, next) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (token !== process.env.API_KEY) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }
  next();
});

control.post("/grants", (req, res) => {
  const result = CreateGrantRequest.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid grant request", details: result.error.flatten() });
    return;
  }

  const { scope, subject, expiresInSeconds } = result.data;
  res.status(201).json(createGrant(scope, subject, expiresInSeconds));
});

control.delete("/grants", (req, res) => {
  const scope = typeof req.body?.scope === "string" ? req.body.scope : "";
  const subject = typeof req.body?.subject === "string" ? req.body.subject : undefined;
  if (!scope) {
    res.status(400).json({ error: "scope is required" });
    return;
  }

  res.json({ revoked: revokeGrants(scope, subject) });
});

import { Router, type IRouter } from "express";
import {
  GetVersionsResponse,
  SaveVersionBody,
  GetVersionParams,
} from "@workspace/api-zod";
import {
  getAllVersions,
  saveVersion,
  getVersionById,
} from "../versionControl.js";

const router: IRouter = Router();

router.get("/versions", (_req, res) => {
  const versions = getAllVersions();
  const response = GetVersionsResponse.parse(
    versions.map((v) => ({
      id: v.id,
      username: v.username,
      code: v.code,
      language: v.language,
      timestamp: v.timestamp.toISOString(),
      label: v.label,
    }))
  );
  res.json(response);
});

router.post("/versions", (req, res) => {
  const parsed = SaveVersionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { username, code, language, label } = parsed.data;
  const version = saveVersion(username, code, language, label);

  res.status(201).json({
    id: version.id,
    username: version.username,
    code: version.code,
    language: version.language,
    timestamp: version.timestamp.toISOString(),
    label: version.label,
  });
});

router.get("/versions/:id", (req, res) => {
  const parsed = GetVersionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const version = getVersionById(parsed.data.id);
  if (!version) {
    res.status(404).json({ error: "Version not found" });
    return;
  }

  res.json({
    id: version.id,
    username: version.username,
    code: version.code,
    language: version.language,
    timestamp: version.timestamp.toISOString(),
    label: version.label,
  });
});

export default router;

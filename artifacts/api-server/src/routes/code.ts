import { Router, type IRouter } from "express";
import { ExecuteCodeBody, ExecuteCodeResponse } from "@workspace/api-zod";
import { executeCode } from "../executor.js";

const router: IRouter = Router();

router.post("/run", async (req, res) => {
  const parsed = ExecuteCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { language, code } = parsed.data;

  try {
    const result = await executeCode(language, code);
    const response = ExecuteCodeResponse.parse({
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
    });
    res.json(response);
  } catch (err: any) {
    res.json({
      output: "",
      error: err.message || "Execution failed",
      exitCode: 1,
    });
  }
});

export default router;

import { NextRequest, NextResponse } from "next/server";
import { analyzeTargetColor } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json({ error: "APIキーが設定されていません。" }, { status: 500 });
  }
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      const description = (formData.get("description") as string) || undefined;
      let base64: string | undefined;
      let mimeType: string | undefined;
      if (file) {
        const bytes = await file.arrayBuffer();
        base64 = Buffer.from(bytes).toString("base64");
        mimeType = file.type || "image/jpeg";
      }
      const result = await analyzeTargetColor(description, base64, mimeType);
      return NextResponse.json(result);
    } else {
      const { description } = await req.json();
      if (!description) return NextResponse.json({ error: "説明を入力してください" }, { status: 400 });
      const result = await analyzeTargetColor(description);
      return NextResponse.json(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `解析中にエラーが発生しました: ${message}` }, { status: 500 });
  }
}

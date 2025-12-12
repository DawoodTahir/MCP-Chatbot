import { API_BASE_URL } from "../config";
import type { ChatResponse } from "../types";

const defaultHeaders = {
  "Content-Type": "application/json"
};

const handleResponse = async (resp: Response) => {
  if (!resp.ok) {
    const message = await resp.text();
    throw new Error(message || "Unexpected API error");
  }
  return resp.json();
};

export async function sendChatMessage({
  userId,
  message,
  temperature
}: {
  userId: string;
  message: string;
  temperature: number;
}): Promise<ChatResponse> {
  const resp = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({
      user_id: userId,
      message,
      temperature
    })
  });
  return handleResponse(resp);
}

export async function uploadResume({
  userId,
  file
}: {
  userId: string;
  file: File;
}): Promise<{ status: string; indexed_path?: string; resume_indexed?: boolean } & Partial<ChatResponse>> {
  const form = new FormData();
  form.append("file", file);
  // optional: send user_id if backend ever wants it
  form.append("user_id", userId);

  const resp = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: form
  });
  return handleResponse(resp);
}


export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  pending?: boolean;
}

export interface InterviewState {
  slots: Record<string, string | null>;
  goal_completed: boolean;
  ended: boolean;
}

export interface ToolCall {
  tool: string;
  target?: string;
  [key: string]: unknown;
}

export interface ChatResponse {
  answer: string;
  interview_state: InterviewState;
  tool_calls: ToolCall[];
  next_input_mode?: "text" | "voice";
}


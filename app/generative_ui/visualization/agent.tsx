import "server-only";

import { agentExecutorV } from "./ai/chain";
import { exposeEndpoints, streamRunnableUI } from "../utils/server";
import { ChatMessage } from "@langchain/core/messages";

async function agent(inputs: {
  input: string;
  chat_history: [role: string, content: string][];
}) {
  "use server";

  return streamRunnableUI(agentExecutorV, {
    input: inputs.input,
    chat_history: inputs.chat_history.map(
      ([role, content]) => new ChatMessage(content, role),
    ),
  });
}

export const EndpointsContextV = exposeEndpoints({ agent });

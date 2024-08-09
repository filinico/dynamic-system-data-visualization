import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { Place } from "@/app/generative_ui/components/place";
import { createRunnableUI } from "../utils/server";
import { search, images } from "./tools";
import { Images } from "../components/image";
import { tool } from "@langchain/core/tools";

const searchTool = tool(
  async (input, config) => {
    console.log(`searchTool input: ${JSON.stringify(input)}`);
    const stream = await createRunnableUI(config);
    stream.update(<div>Searching the internet...</div>);

    const result = await search(input);

    stream.done(
      <div className="flex gap-2 flex-wrap justify-end">
        {JSON.parse(result).map((place: any, index: number) => (
          <Place place={place} key={index} />
        ))}
      </div>,
    );
    console.log(`searchTool result: ${result}`);

    return result;
  },
  {
    name: "SerpAPI",
    description:
      "A search engine. useful for when you need to answer questions about current events. input should be a search query.",
    schema: z.object({ query: z.string() }),
  },
);

const imagesTool = tool(
  async (input, config) => {
    console.log(`imagesTool input: ${JSON.stringify(input)}`);
    const stream = await createRunnableUI(config);
    stream.update(<div>Searching...</div>);

    const result = await images(input);
    stream.done(
      <Images
        images={result.images_results
          .map((image) => image.thumbnail)
          .slice(0, input.limit)}
      />,
    );
    console.log(`imagesTool result: ${JSON.stringify(result)}`);
    return `[Returned ${result.images_results.length} images]`;
  },
  {
    name: "Images",
    description: "A tool to search for images. input should be a search query.",
    schema: z.object({
      query: z.string().describe("The search query used to search for cats"),
      limit: z.number().describe("The number of pictures shown to the user"),
    }),
  },
);

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that takes a question and finds the most appropriate tool or tools to execute, along with the parameters required to run the tool.`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const tools = [searchTool, imagesTool];
/*
const llm = new ChatOpenAI({
  model: "llama3.1",
  apiKey: 'ollama',
  configuration: {
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama',
  },
  temperature: 0,
  streaming: true,
});*/
const getLlm = async () => {
  const sandUrl = process.env.SAND_URL
  const sandHeaders = new Headers();
  const sandClientId = process.env.SAND_CLIENT_ID
  const sandClientSecret = process.env.SAND_CLIENT_SECRET
  const basicAuth = Buffer.from(sandClientId + ":" + sandClientSecret).toString('base64')
  console.log(`basicAuth: ${basicAuth}`);
  sandHeaders.set('Authorization', 'Basic ' + basicAuth);
  const response = await fetch(sandUrl!, {
  method:'POST',
  headers: sandHeaders,
  body: new URLSearchParams({
  'grant_type': 'client_credentials',
  'scope': 'coupa',
  })
  })
  const jsonResponse = await response.json()
  console.log(`jsonResponse: ${JSON.stringify(jsonResponse)}`);
  return new ChatOpenAI({
  temperature: 0.8,
  model: "gpt-35-turbo",
  apiKey: 'coupa',
  configuration: {
  baseURL: `${process.env.GEN_AI_URL}/v1/openai/`,
  apiKey: 'coupa',
  defaultHeaders: {
  "X-Coupa-Application": "default",
  "X-Coupa-Tenant": "localhost",
  "Content-Type": "application/json",
  "Authorization": `bearer ${jsonResponse.access_token}`,
  }
  }
  });
}

export const getAgentExecutor = async () => {
  const llm = await getLlm()
  return new AgentExecutor({
    agent: createToolCallingAgent({ llm, tools, prompt }),
    tools,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import { AIMessage, BaseMessage, ChatMessage, HumanMessage } from "@langchain/core/messages";
import { END, MemorySaver, START, StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AgentState, ToolNode } from "@langchain/langgraph/prebuilt";
import { Calculator } from "@langchain/community/tools/calculator";
import { SerpAPI } from "@langchain/community/tools/serpapi";

export const runtime = "edge";

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
  if (message.role === "user") {
    return new HumanMessage(message.content);
  } else if (message.role === "assistant") {
    return new AIMessage(message.content);
  } else {
    return new ChatMessage(message.content, message.role);
  }
};

const convertLangChainMessageToVercelMessage = (message: BaseMessage) => {
  if (message._getType() === "human") {
    return { content: message.content, role: "user" };
  } else if (message._getType() === "ai") {
    return {
      content: message.content,
      role: "assistant",
      tool_calls: (message as AIMessage).tool_calls,
    };
  } else {
    return { content: message.content, role: message._getType() };
  }
};

const TEMPLATE = `You are a pirate named Patchy. All responses must be extremely verbose and in pirate dialect.

Current conversation:
{chat_history}

User: {input}
AI:`;

/**
 * This handler initializes and calls a simple chain with a prompt,
 * chat model, and output parser. See the docs for more information:
 *
 * https://js.langchain.com/docs/guides/expression_language/cookbook#prompttemplate--llm--outputparser
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (body.messages ?? [])
      .filter(
        (message: VercelChatMessage) =>
          message.role === "user" || message.role === "assistant",
      )
      .map(convertVercelMessageToLangChainMessage);
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    const currentMessageContent = messages[messages.length - 1].content;
    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    console.log(`message: ${currentMessageContent}`);

    // Define the state interface
    interface AgentState {
      messages: HumanMessage[];
    }

// Define the graph state
    const graphState: StateGraphArgs<AgentState>["channels"] = {
      messages: {
        value: (x: HumanMessage[], y: HumanMessage[]) => x.concat(y),
        default: () => [],
      },
    };

// Define the tools for the agent to use
    const tools = [new Calculator(), new SerpAPI()];

    const toolNode = new ToolNode<AgentState>(tools);

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
    const model = new ChatOpenAI({
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
    }).bindTools(tools);

    // Define the function that determines whether to continue or not
    const shouldContinue = (state: AgentState): "tools" | typeof END => {
      const messages = state.messages;

      const lastMessage = messages[messages.length - 1];

      // If the LLM makes a tool call, then we route to the "tools" node
      if (lastMessage.additional_kwargs.tool_calls) {
        return "tools";
      }
      // Otherwise, we stop (reply to the user)
      return END;
    }

// Define the function that calls the model
    const callModel = async (state: AgentState) => {
      const messages = state.messages;

      const response = await model.invoke(messages);

      // We return a list, because this will get added to the existing list
      return { messages: [response] };
    }

// Define a new graph
    const workflow = new StateGraph<AgentState>({ channels: graphState })
      .addNode("agent", callModel)
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent");

// Initialize memory to persist state between graph runs
    const checkpointer = new MemorySaver();

// Finally, we compile it!
// This compiles it into a LangChain Runnable.
// Note that we're (optionally) passing the memory when compiling the graph
    const app = workflow.compile({ checkpointer });

// Use the agent
    const finalState = await app.invoke(
      { messages: [new HumanMessage("what is the weather in sf")] },
      { configurable: { thread_id: "42" } },
    );

    console.log(finalState.messages[finalState.messages.length - 1].content);

    const nextState = await app.invoke(
      { messages: [new HumanMessage("what about ny")] },
      { configurable: { thread_id: "42" } },
    );

    console.log(nextState.messages[nextState.messages.length - 1].content);

    const lastState = await app.invoke(
      { messages: [new HumanMessage(currentMessageContent)] },
      { configurable: { thread_id: "42" } },
    );

    console.log(lastState.messages[lastState.messages.length - 1].content);

    return NextResponse.json(
      {
        messages: lastState.messages.map(convertLangChainMessageToVercelMessage),
      },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

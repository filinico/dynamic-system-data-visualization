import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { Message as VercelChatMessage, StreamingTextResponse } from "ai";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

export const runtime = "edge";

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `You are a helpful assistant.

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
    const messages = body.messages ?? [];
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    const currentMessageContent = messages[messages.length - 1].content;
    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    /**
     * You can also try e.g.:
     *
     * import { ChatAnthropic } from "@langchain/anthropic";
     * const model = new ChatAnthropic({});
     *
     * See a full list of supported models at:
     * https://js.langchain.com/docs/modules/model_io/models/
     */
    const model = new AzureChatOpenAI({
      model: "gpt-4o-2024-05-13",
      verbose: true,
      temperature: 0,
      maxTokens: undefined,
      maxRetries: 2,
    });

    console.log(`message: ${currentMessageContent}`);
    console.log(`model: ${JSON.stringify(model.toJSON())}`);

    const gqlSchema = `
"A payment representing a money transaction between the customer and its supplier, executed by a bank"
type Payment {
    id: ID!
    "The type of payment between Virtual Cards, Bank Transfer and Checks"
    paymentType: String
    "The paid amount"
    amount: Float
    "The ISO currency code"
    currencyCode: String
    "The state of the payment if it was successful or rejected"
    status: String
    "The name of the supplier that receive the money"
    supplierName: String
    "The name of the bank that executes the payment transaction"
    bank: String
    "The type of virtual credit card being used. It can be VISA, MASTERCARD. Only available for Virtual cards."
    cardType: String
}

type Query {
    "List the payments"
    listPayments: [Payment!]!
}
`
    const response = await model.invoke([
      [
        "system",
        `You are a GraphQL queries expert. The human sends a GraphQL query. What is the field name returned by this GraphQL query?
      Dont add any more text or formating to your response, I will use the query directly.`,
      ],
      ["human", currentMessageContent],
    ]);
    const result = response.content.toString()
    console.log(`response message: ${result}`);
/*
    const tools = [
      {
        type: "function",
        function: {
          name: "get_current_weather",
          description: "Get the current weather in a given location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA",
              },
              unit: { type: "string", enum: ["celsius", "fahrenheit"] },
            },
            required: ["location"],
          },
        },
      },
    ]

    const llm5 = model.bindTools(tools)

// Ask initial question that requires multiple tool calls
    const res5 = await llm5.invoke([
      ["human", "What's the weather like in San Francisco, Tokyo, and Paris?"],
    ]);
    console.log(`model with tool: ${JSON.stringify(res5.tool_calls)}`);*/


    /**
     * Chat models stream message chunks rather than bytes, so this
     * output parser handles serialization and byte-encoding.
     */
    const outputParser = new HttpResponseOutputParser();

    /**
     * Can also initialize as:
     *
     * import { RunnableSequence } from "@langchain/core/runnables";
     * const chain = RunnableSequence.from([prompt, model, outputParser]);
     */
    /*const chain = prompt.pipe(model).pipe(outputParser);

    const stream = await chain.stream({
      chat_history: formattedPreviousMessages.join("\n"),
      input: currentMessageContent,
    });

    return new StreamingTextResponse(stream);*/
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

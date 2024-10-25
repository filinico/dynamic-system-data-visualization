import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { createRunnableUI } from "../utils/server";
import {
  extractResponseItemFromGraphQL,
  generateFieldsDefinition,
  generateGraphQL,
  graphGeneration,
  loadData
} from "./tools";
import { tool } from "@langchain/core/tools";
import { Graph } from "@/app/generative_ui/components/Graph";
import {v4 as uuidv4} from "uuid";

const loadDataTool = tool(
  async (input, config) => {
    console.log(`loadDataTool: ${JSON.stringify(input)}`);
    const stream = await createRunnableUI(config);
    stream.update(<div className="flex gap-2 flex-wrap justify-end">
      <span>Starting LoadData tool...</span>
    </div>);
    const gqlQuery = await generateGraphQL(input.query);
    console.log(`graphQL query: ${gqlQuery}`);

    const fieldName = await extractResponseItemFromGraphQL(gqlQuery)
    console.log(`fieldName: ${fieldName}`);

    /*const getPayments = `query ListPayments {
            listPayments {
                id
                currencyCode
                paymentType
                amount
                status
                supplierName
                bank
                cardType
            }
        }
    `*/
    let result = ""
    try {
      result = await loadData(gqlQuery, fieldName);
      console.log(`loadDataTool result: ${result}`);
    } catch (error) {
      const errorMessage = `${error}`
      /*stream.done(<div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Generated GraphQL query: </span><span>{gqlQuery}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Extracted returned item: </span><span>{fieldName}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>An error occurred while loading the data: {errorMessage}</span>
        </div>
      </div>)*/
      console.error(`error loading the data: ${error}`);
      throw new Error("An error occurred while loading the data. Do not call the GenerateGraph tool. Do not try to load the data again.");
    }

    if (result === "") {
      /*stream.done(<div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Generated GraphQL query: </span><span>{gqlQuery}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Extracted returned item: </span><span>{fieldName}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>No data available</span>
        </div>
      </div>)*/
      console.log("No data available. Do not retry. Do not call the GenerateGraph tool.");
      return "No data available. Do not call the GenerateGraph tool. Do not try to load the data again.";
    }

    /*stream.done(
      <div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Generated GraphQL query: </span><span>{gqlQuery}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Extracted returned item: </span><span>{fieldName}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Successfully loaded data: </span><span>{result}</span>
        </div>
      </div>
    );*/
    stream.done(
      <div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Successfully loaded data</span>
        </div>
      </div>
    );

    return result;
  },
  {
    name: "LoadGraphData",
    description:
      "load graph data in order to generate a graph. input should be the user question",
    schema: z.object({ query: z.string() })
  }
);

const graphGenerationTool = tool(
  async (input, config) => {
    console.log(`graphGenerationTool: ${JSON.stringify(input)}`);

    if (input.data && input.data !== "" && (input.data === "{}" || input.data === "[]")) {
      console.log("No data available. Cannot generate the graph.");
      return "No data available. Cannot generate the graph. Do not try to load the data again."
    }

    const chartId = uuidv4()
    const stream = await createRunnableUI(config);
    stream.update(<div className="flex gap-2 flex-wrap justify-end">
      <span>Starting GraphGeneration tool...</span>
    </div>)
    console.log(`calling graphGeneration`);
    const result = await graphGeneration(input);
    console.log(`graphGenerationTool result: ${JSON.stringify(result)}`);
    stream.done(
      <Graph
        spec={result}
        chartId={chartId}
        key={chartId}
      />,
    );

    return "The graph has been generated successfully and rendered to the user.";
  },
  {
    name: "GenerateGraph",
    description: "generate a graph based on loaded data and show the graph to the user. input should be a generate graph query.",
    schema: z.object({
      query: z.string().describe("The user input to generate the graph"),
      data: z.string().describe("The data loaded as JSON string for the graph"),
    }),
  },
);

const schemaTool = tool(
  async (input, config) => {
    console.log(`schemaTool: ${JSON.stringify(input)}`);
    const stream = await createRunnableUI(config);
    stream.update(<div className="flex gap-2 flex-wrap justify-end">
      <span>Starting Schema definition tool...</span>
    </div>);

    const schemaResult = await generateFieldsDefinition(input.query);

    stream.done(
      <div>
        <div className="flex gap-2 flex-wrap justify-end">
          <span>Found schema definition</span>
        </div>
      </div>
    );

    return schemaResult;
  },
  {
    name: "SchemaTool",
    description:
      "Define which fields are available in order to generate a graph. input should be the user question",
    schema: z.object({ query: z.string() })
  }
);

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that takes a question and finds the most appropriate tool or tools to execute, along with the parameters required to run the tool.
    if any errors occur, do not retry and explain to the user that data are not available. Do not call the GenerateGraph tool. Do not pass fake data to the GenerateGraph tool.
    Using the tools you can generate charts based on the user query without specifying any data, only the field names are sufficient.
    `,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const llm = new AzureChatOpenAI({
  model: "gpt-4o-2024-08-06",
  //verbose: true,
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
  streaming: true,
});

const tools = [loadDataTool, graphGenerationTool, schemaTool];

export const agentExecutor = new AgentExecutor({
  agent: createToolCallingAgent({ llm, tools, prompt }),
  tools,
  //verbose: true,
  handleParsingErrors: "On any tool error, do not retry and explain to the user that data are not available. Do not call the GenerateGraph tool. Do not pass fake data to the GenerateGraph tool."
});

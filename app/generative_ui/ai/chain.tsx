import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { AzureChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { createRunnableUI } from "../utils/server";
import {
  extractResponseItemFromGraphQL, fillSpecWithData,
  generateFieldsDefinition,
  generateGraphQL,
  graphGeneration,
  loadData
} from "./tools";
import { tool } from "@langchain/core/tools";
import { Graph } from "@/app/generative_ui/components/Graph";
import {v4 as uuidV4} from "uuid";
import { createStreamableValue } from "ai/rsc";
import { AIMessage } from "@/app/generative_ui/ai/message";

type ChartDetails = {
  description: string;
  graphQLQuery: string;
  graphQLFieldName: string;
  specTemplate: any;
  specWithData: any;
}

const CHARTS_BY_DESCRIPTION: ChartDetails[] = [
  {
    description: "amount by payment type of each supplier",
    graphQLQuery: "query MyQuery { listPayments { supplierName paymentType amount } }",
    graphQLFieldName: "listPayments",
    specTemplate: {"type":"bar","data":{"id":"data","values":[]},"color":[{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#1DD0F3FF"},{"offset":1,"color":"#1DD0F300"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#2693FFFF"},{"offset":1,"color":"#2693FF00"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#3259F4FF"},{"offset":1,"color":"#3259F400"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#1B0CA1FF"},{"offset":1,"color":"#1B0CA100"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#CB2BC6FF"},{"offset":1,"color":"#CB2BC600"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#FF581DFF"},{"offset":1,"color":"#FF581D00"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#FBBB16FF"},{"offset":1,"color":"#FBBB1600"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#F6FB17FF"},{"offset":1,"color":"#F6FB1700"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#73EC55FF"},{"offset":1,"color":"#73EC5500"}]}],"xField":["paymentType","supplierName"],"yField":"total_amount","seriesField":"supplierName","axes":[{"orient":"bottom","type":"band","label":{"style":{}},"title":{"visible":false,"style":{}}},{"orient":"left","type":"linear","label":{"style":{}},"title":{"visible":false,"style":{}}}],"legends":[{"orient":"right","type":"discrete","item":{"visible":true,"background":{"style":{}},"label":{"style":{}},"shape":{"style":{}}}}],"bar":{"style":{}}},
    specWithData:  {"type":"bar","data":{"id":"data","values":[{"supplierName":"Amazon","paymentType":"Virtual card","total_amount":2900.5},{"supplierName":"Globus","paymentType":"Bank Transfer","total_amount":52.7},{"supplierName":"Amazon","paymentType":"Bank Transfer","total_amount":1847.7600000000002},{"supplierName":"HP","paymentType":"Virtual card","total_amount":10500},{"supplierName":"Microsoft","paymentType":"Virtual card","total_amount":10000},{"supplierName":"Microsoft","paymentType":"Bank Transfer","total_amount":331.46}]},"color":[{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#1DD0F3FF"},{"offset":1,"color":"#1DD0F300"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#2693FFFF"},{"offset":1,"color":"#2693FF00"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#3259F4FF"},{"offset":1,"color":"#3259F400"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#1B0CA1FF"},{"offset":1,"color":"#1B0CA100"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#CB2BC6FF"},{"offset":1,"color":"#CB2BC600"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#FF581DFF"},{"offset":1,"color":"#FF581D00"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#FBBB16FF"},{"offset":1,"color":"#FBBB1600"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#F6FB17FF"},{"offset":1,"color":"#F6FB1700"}]},{"gradient":"linear","x0":0.01,"y0":0,"x1":0.01,"y1":1,"stops":[{"offset":0,"color":"#73EC55FF"},{"offset":1,"color":"#73EC5500"}]}],"xField":["paymentType","supplierName"],"yField":"total_amount","seriesField":"supplierName","axes":[{"orient":"bottom","type":"band","label":{"style":{}},"title":{"visible":false,"style":{}}},{"orient":"left","type":"linear","label":{"style":{}},"title":{"visible":false,"style":{}}}],"legends":[{"orient":"right","type":"discrete","item":{"visible":true,"background":{"style":{}},"label":{"style":{}},"shape":{"style":{}}}}],"bar":{"style":{}}},
  }
]

let DASHBOARD: ChartDetails[]  = [
  CHARTS_BY_DESCRIPTION[0]
]

export const getDashboard = () => DASHBOARD

const addChartToDashboardTool = tool(
  async (input) => {
    const chartsInDashboard = DASHBOARD.filter((chartDetails) => chartDetails.description === input.query);
    if (chartsInDashboard.length > 0) {
      return "The dashboard already contains the chart.";
    }
    const generatedChartDetails = CHARTS_BY_DESCRIPTION.filter((chartDetails) => chartDetails.description === input.query);
    if (generatedChartDetails.length === 0) {
      return "The chart must be generated first in order to be added to the dashboard.";
    }

    DASHBOARD.push(generatedChartDetails[0])

    return "The chart has been added to the dashboard at the end of the list.";
  },
  {
    name: "AddChartToDashboard",
    description:
      "add a chart to the dashboard. input should be a short chart query to identify the chart in order to add it to the dashboard.",
    schema: z.object({
      query: z.string().describe("The chart query from the user input to identify the chart"),
    }),
  },
);

const deleteChartFromDashboardTool = tool(
  async (input) => {
    const chartsInDashboard = DASHBOARD.filter((chartDetails) => chartDetails.description === input.query );
    if (chartsInDashboard.length === 0) {
      return "The dashboard doesn't contains the chart. Ensure the chart is part of the dashboard list of charts before deleting it and provide the correct position from the list.";
    }

    DASHBOARD = DASHBOARD.filter((chartDetails) => chartDetails.description !== input.query );

    return "The chart has been removed from the dashboard.";
  },
  {
    name: "DeleteChartFromDashboard",
    description:
      "delete a chart from the dashboard. input should be a short chart query to identify the chart, and the index position of the chart in the list, in order to delete the chart from the dashboard.",
    schema: z.object({
      query: z.string().describe("The chart query from the user input to identify the chart"),
      index: z.number().describe("The position of the chart in the dashboard list of charts.")
    }),
  },
);

const graphGenerationTool = tool(
  async (input, config) => {
    const stream = await createRunnableUI(config);

    const existingChartDetails = CHARTS_BY_DESCRIPTION.filter((chartDetails) => chartDetails.description === input.query);
    if (existingChartDetails.length > 0) {
      const chartId = uuidV4();
      stream.done(
        <>
          <Graph width={380} height={275} spec={existingChartDetails[0].specWithData} chartId={chartId} key={chartId} />
        </>
      );
      return "The chart has been generated and could be added to the dashboard if the user wants to.";
    }

    const gqlQueryTextStream = createStreamableValue();
    const fieldNameTextStream = createStreamableValue();
    stream.update(
      <>
        <div className="empty:hidden border border-gray-700 p-3 rounded-lg max-w-[50vw]">
          Starting Chart Generation tool...
        </div>
        <AIMessage value={gqlQueryTextStream.value} />
        <AIMessage value={fieldNameTextStream.value} />
      </>,
    );
    gqlQueryTextStream.append("Processing GraphQL generation: ");
    const gqlQuery = await generateGraphQL(input.query);
    gqlQueryTextStream.append(gqlQuery);

    fieldNameTextStream.append("Processing extractResponseItemFromGraphQL: ");
    const fieldName = await extractResponseItemFromGraphQL(gqlQuery);
    fieldNameTextStream.append(fieldName);

    try {
      const sourceDataset = await loadData(gqlQuery, fieldName);

      const { spec, dataset } = await graphGeneration(input.query, sourceDataset);
      const specWithData = fillSpecWithData(spec, dataset)

      CHARTS_BY_DESCRIPTION.push({
        description: input.query,
        graphQLQuery: gqlQuery,
        graphQLFieldName: fieldName,
        specTemplate: spec,
        specWithData: specWithData,
      })

      const chartId = uuidV4();
      stream.done(
        <>
          <Graph width={380} height={275} spec={specWithData} chartId={chartId} key={chartId} />
        </>
      );
    } catch (error) {
      let errorMessage = `An error occurred: ${error}`
      const errorMessageTextStream = createStreamableValue();
      errorMessageTextStream.append(errorMessage);
      stream.done(
        <>
          <div className="empty:hidden border border-gray-700 p-3 rounded-lg max-w-[50vw]">
            Chart Generation tool Error...
          </div>
          <AIMessage value={gqlQueryTextStream.value} />
          <AIMessage value={fieldNameTextStream.value} />
          <AIMessage value={errorMessageTextStream.value} />
        </>
      )
      console.error(`error loading the data: ${error}`);
      return "An error occurred while loading the data. Do not retry the GenerateChart tool.";
    }

    return "The chart has been generated and could be added to the dashboard if the user wants to.";
  },
  {
    name: "GenerateChart",
    description:
      "generate a chart that is shown to the user. input should be a short chart query to identify the chart in order to generate the chart.",
    schema: z.object({
      query: z.string().describe("The chart query from the user input to identify the chart"),
    }),
  },
);

const schemaTool = tool(
  async (input, config) => {
    const stream = await createRunnableUI(config);
    stream.update(
      <div className="empty:hidden border border-gray-700 p-3 rounded-lg max-w-[50vw]">
        Starting Schema definition tool...
      </div>,
    );

    const schemaResult = await generateFieldsDefinition(input.query);

    stream.done(
      <div className="empty:hidden border border-gray-700 p-3 rounded-lg max-w-[50vw]">
        Found schema definition
      </div>,
    );

    return schemaResult;
  },
  {
    name: "SchemaTool",
    description:
      "Define which fields are available for chart generations. input should be the user question",
    schema: z.object({ query: z.string().describe("the user question about the available fields") }),
  },
);

const dashboardPrompt: string = DASHBOARD.map((chart, index) => `${index+1}. ${chart.description}`)
  .reduce((previousValue: string, currentValue: string): string => {
    return previousValue + "\n" + currentValue;
  }, "");

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that manages a dashboard containing a list of charts defined by their index in the list and their description. The dashboard currently contains the following charts:
${dashboardPrompt}
Finds the most appropriate tool or tools to execute, along with the parameters required to run the tool. Using the tools you can: 
- generate charts based on the user query without specifying any data, only the field names are sufficient. 
- add or delete chart from the list. Modifying a chart means to delete the chart first, generate a new one and then add it to the list.
- Get the available fields for the charts.
    `,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const llm = new AzureChatOpenAI({
  model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
  streaming: true,
});

const tools = [graphGenerationTool, schemaTool, addChartToDashboardTool, deleteChartFromDashboardTool];

export const agentExecutor = new AgentExecutor({
  agent: createToolCallingAgent({ llm, tools, prompt }),
  tools,
  handleParsingErrors: "On any tool error, do not retry and explain to the user that data are not available. Do not call the GenerateGraph tool. Do not pass fake data to the GenerateGraph tool."
});

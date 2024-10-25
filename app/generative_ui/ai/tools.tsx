import VMind from "@visactor/vmind";
import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { AzureChatOpenAI } from "@langchain/openai";
import { ILLMOptions } from "@visactor/vmind/cjs/common/typings";

export function fillSpecWithData(specTemplate: any, dataset: any) {
  const vmind = new VMind({})
  return vmind.fillSpecWithData(specTemplate, dataset)
}

const model = new AzureChatOpenAI({
  model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  temperature: 0.3,
  maxTokens: undefined,
  maxRetries: 2,
});

export async function graphGeneration(query: string, data: string) {
  const ModelRequestFunc = async (prompt: string, userMessage: string, options: ILLMOptions | undefined) => {
    const response = await model.invoke([
      [
        "system",
        prompt,
      ],
      ["human", userMessage],
    ]);
    const content = response.content
    const gptResponse = {
      usage: {},
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content
        }
      }]
    }
    return gptResponse
  }

  const vmind = new VMind({
    model: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    customRequestFunc: {
      chartAdvisor: ModelRequestFunc,
      dataQuery: ModelRequestFunc,
    }
  })

  const sourceDataset = JSON.parse(data)
  const sourceFieldInfo = vmind.getFieldInfo(sourceDataset);
  const { fieldInfo, dataset } = await vmind.dataQuery(query, sourceFieldInfo, sourceDataset);
  const { spec, time } = await vmind.generateChart(query, fieldInfo, undefined, {
    enableDataQuery: true,
  });
  return { spec, dataset };
}

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

export async function generateGraphQL(input: string) {
  const response = await model.invoke([
    [
      "system",
      `You are a GraphQL expert that can generate GraphQL queries. With this graphql schema: '${gqlSchema}',
      and the human question, generate a GraphQL query starting with the Query type and the name MyQuery without the term graphql.
      Dont add any more text or formating to your response, I will use the query directly.`,
    ],
    ["human", input],
  ]);
  let gqlResult = response.content.toString()
  gqlResult = gqlResult.replaceAll("`", "").replace("graphql\n", "")
  return gqlResult;
}

export async function generateFieldsDefinition(input: string) {
  const response = await model.invoke([
    [
      "system",
      `You are a GraphQL expert that can parse GraphQL schema. With this graphql schema: '${gqlSchema}',
      and the human question, summarize the fields available in this schema as a list with the field name and the description.`,
    ],
    ["human", input],
  ]);
  return response.content.toString();
}

export async function extractResponseItemFromGraphQL(gqlQuery: string) {
  const response = await model.invoke([
    [
      "system",
      `You are a GraphQL queries expert. The human sends a GraphQL query. What is the field name returned by this GraphQL query?
      Dont add any more text or formating to your response, I will use the field name directly.`,
    ],
    ["human", gqlQuery],
  ]);
  return response.content.toString();
}

export async function loadData(query: string, fieldName: string ) {
  const client = new ApolloClient({
    uri: 'http://localhost:4000/',
    cache: new InMemoryCache({addTypename: false}),
  });
  const gqlQuery = gql`${query}`
  const result = await client.query({
    query: gqlQuery,
  });
  if (result.error) {
    console.error(`error loading the data: ${JSON.stringify(result.error)}`);
    throw new Error("An error occurred while loading the data. Please retry only once. Do not call the GenerateGraph tool.");
  } else if (result.errors && result.errors.length > 0) {
    console.error(`error loading the data: ${JSON.stringify(result.errors)}`);
    throw new Error("An error occurred while loading the data. Please retry only once. Do not call the GenerateGraph tool.");
  }

  return JSON.stringify(result.data[fieldName]);
}

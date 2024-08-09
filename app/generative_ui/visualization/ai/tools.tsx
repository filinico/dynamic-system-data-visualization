import VMind from "@visactor/vmind";
import { ApolloClient, gql, InMemoryCache, TypedDocumentNode } from "@apollo/client";
import { query } from "@visactor/calculator";
import { AzureChatOpenAI } from "@langchain/openai";

export async function graphGeneration(input: { query: string, data: string }) {
  console.log(`graphGeneration input: ${JSON.stringify(input)}`);
  /*const vmind = new VMind({
    url: 'http://localhost:11434/v1/chat/completions', //Specify your LLM service url. The default is https://api.openai.com/v1/chat/completions
    model: "gpt-llama", //Specify the model you specify
  })*/
  const vmind = new VMind({
    url: "https://genai-dev-coupadev-eastus2.openai.azure.com/openai/deployments/gpt-4o-2024-05-13/chat/completions?api-version=2024-02-01", //Specify your LLM service url. The default is https://api.openai.com/v1/chat/completions
    model: "gpt-4o-2024-05-13", //Specify the model you specify
    // @ts-ignore
    headers: { //Specify the header when calling the LLM service
      'api-key': process.env.AZURE_OPENAI_API_KEY //Your LLM API Key
    }
  })

  const dataset = JSON.parse(input.data)
  const fieldInfo = vmind.getFieldInfo(dataset);
  const { spec, time } = await vmind.generateChart(input.query, fieldInfo, dataset);
  console.log(`graphGeneration spec: ${JSON.stringify(spec)}`);
  return spec;
}
/*
interface Payment {
  id: number
  currencyCode: string
  paymentType: string
  amount: number
  status: string
  supplierName: string
  bank: string
  cardType: string
}

interface PaymentsData {
  listPayments: Payment[]
}*/

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
  const model = new AzureChatOpenAI({
    model: "gpt-4o-2024-05-13",
    //verbose: true,
    temperature: 0.3,
    maxTokens: undefined,
    maxRetries: 2,
  });
  const response = await model.invoke([
    [
      "system",
      `You are a GraphQL expert that can generate GraphQL queries. With this graphql schema: '${gqlSchema}',
      and the human question, generate a GraphQL query starting with the Query type and the name MyQuery without the term graphql.
      Dont add any more text or formating to your response, I will use the query directly.`,
    ],
    ["human", input],
  ]);
  const gqlResult = response.content.toString()
  console.log(`gqlResult message: ${gqlResult}`);
  /*const gqlQueryResult = gqlResult.replace(/graphql/g, "query MyQuery")
  console.log(`gqlQueryResult: ${gqlQueryResult}`);*/
  return gqlResult;
}

export async function generateFieldsDefinition(input: string) {
  const model = new AzureChatOpenAI({
    model: "gpt-4o-2024-05-13",
    //verbose: true,
    temperature: 0.3,
    maxTokens: undefined,
    maxRetries: 2,
  });
  const response = await model.invoke([
    [
      "system",
      `You are a GraphQL expert that can parse GraphQL schema. With this graphql schema: '${gqlSchema}',
      and the human question, summarize the fields available in this schema as a list with the field name and the description.`,
    ],
    ["human", input],
  ]);
  const schemaResult = response.content.toString()
  console.log(`schemaResult message: ${schemaResult}`);
  return schemaResult;
}

export async function extractResponseItemFromGraphQL(gqlQuery: string) {
  const model = new AzureChatOpenAI({
    model: "gpt-4o-2024-05-13",
    //verbose: true,
    temperature: 0.3,
    maxTokens: undefined,
    maxRetries: 2,
  });
  const response = await model.invoke([
    [
      "system",
      `You are a GraphQL queries expert. The human sends a GraphQL query. What is the field name returned by this GraphQL query?
      Dont add any more text or formating to your response, I will use the field name directly.`,
    ],
    ["human", gqlQuery],
  ]);
  const resultMessage = response.content.toString()
  console.log(`resultMessage: ${resultMessage}`);
  return resultMessage
}

export async function loadData(query: string, fieldName: string ) {
  console.log(`loadData query: ${query}`);
  const client = new ApolloClient({
    uri: 'http://localhost:4000/',
    cache: new InMemoryCache({addTypename: false}),
  });
  /*
  const getPayments: TypedDocumentNode<PaymentsData> = gql`
      query ListPayments {
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

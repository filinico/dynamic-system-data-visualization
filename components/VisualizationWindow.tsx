"use client";

import { ToastContainer } from "react-toastify";
import { FormEvent, useState } from "react";
import VMind from "@visactor/vmind";
import VChart from "@visactor/vchart";
import { DataType, ROLE, type SimpleFieldInfo } from "@visactor/vmind/esm/common/typings";
import { ChatOpenAI } from "@langchain/openai";

export function VisualizationWindow(props: {
  endpoint: string,
  titleText?: string,
  emoji?: string;
}){
  const {endpoint, emoji, titleText} = props
  const [message, setMessage] = useState("");
  const [vchart, setVChart] = useState<VChart | null>(null);
  const [currentSpec, setCurrentSpec] = useState(null);

  const sourceDataset= [
    {
      "Product name": "Coke",
      "Sales": 2350
    },
    {
      "Product name": "Coke",
      "Sales": 1027
    },
    {
      "Product name": "Coke",
      "Sales": 1027
    },
    {
      "Product name": "Coke",
      "Sales": 1027
    },
    {
      "Product name": "Sprite",
      "Sales": 215
    },
    {
      "Product name": "Sprite",
      "Sales": 654
    },
    {
      "Product name": "Sprite",
      "Sales": 159
    },
    {
      "Product name": "Sprite",
      "Sales": 28
    },
    {
      "Product name": "Fanta",
      "Sales": 345
    },
    {
      "Product name": "Fanta",
      "Sales": 654
    },
    {
      "Product name": "Fanta",
      "Sales": 2100
    },
    {
      "Product name": "Fanta",
      "Sales": 1679
    },
    {
      "Product name": "Mirinda",
      "Sales": 1476
    },
    {
      "Product name": "Mirinda",
      "Sales": 830
    },
    {
      "Product name": "Mirinda",
      "Sales": 532
    },
    {
      "Product name": "Mirinda",
      "Sales": 498
    }
  ]

  const sourceFieldInfo : SimpleFieldInfo[] = [
    {
      "fieldName": "Product name",
      type: DataType.STRING,
      role: ROLE.DIMENSION
    },
    {
      "fieldName": "Sales",
      "type": DataType.INT,
      role: ROLE.MEASURE
    }
  ]

  const dataset=[
    {
      "Product name": "Coke",
      "region": "south",
      "Sales": 2350
    },
    {
      "Product name": "Coke",
      "region": "east",
      "Sales": 1027
    },
    {
      "Product name": "Coke",
      "region": "west",
      "Sales": 1027
    },
    {
      "Product name": "Coke",
      "region": "north",
      "Sales": 1027
    },
    {
      "Product name": "Fanta",
      "region": "north",
      "Sales": 1500
    },
  ]

  const dataset2 = [
    {
      "Brand Name": "Apple",
      "Market Share": 0.5,
      "Average Price": 7068,
      "Net Profit": 314531
    },
    {
      "Brand Name": "Samsung",
      "Market Share": 0.2,
      "Average Price": 6059,
      "Net Profit": 362345
    },
    {
      "Brand Name": "Vivo",
      "Market Share": 0.05,
      "Average Price": 3406,
      "Net Profit": 234512
    },
    {
      "Brand Name": "Nokia",
      "Market Share": 0.01,
      "Average Price": 1064,
      "Net Profit": -1345
    },
    {
      "Brand Name": "Xiaomi",
      "Market Share": 0.1,
      "Average Price": 4087,
      "Net Profit": 131345
    }
  ]

  async function sendPrompt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const sandUrl = process.env.SAND_URL
    const sandHeaders = new Headers();
    const sandClientId = process.env.SAND_CLIENT_ID
    const sandClientSecret = process.env.SAND_CLIENT_SECRET
    const basicAuth = Buffer.from(sandClientId + ":" + sandClientSecret).toString('base64')
    console.log(`basicAuth: ${basicAuth}`);
    sandHeaders.set('Authorization', 'Basic ' + basicAuth);
    const response = await fetch(sandUrl!, {
      method:'POST',
      mode: 'cors',
      headers: sandHeaders,
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'coupa',
      })
    })
    const jsonResponse = await response.json()
    console.log(`jsonResponse: ${JSON.stringify(jsonResponse)}`);
    /*
    const vmind = new VMind({
      url: 'http://localhost:11434/v1/chat/completions', //Specify your LLM service url. The default is https://api.openai.com/v1/chat/completions
      model: "gpt-llama", //Specify the model you specify
    })*/
    const vmind = new VMind({
      url: `${process.env.GEN_AI_URL}/v1/openai/chat/completions`, //Specify your LLM service url. The default is https://api.openai.com/v1/chat/completions
      model: "gpt-35-turbo", //Specify the model you specify
      headers: {
        "X-Coupa-Application": "default",
        "X-Coupa-Tenant": "localhost",
        "Content-Type": "application/json",
        "Authorization": `bearer ${jsonResponse.access_token}`,
      }
    })

    //const { fieldInfo, dataset } = await vmind.dataQuery(message, sourceFieldInfo, sourceDataset);
    const fieldInfo = vmind.getFieldInfo(dataset2);
    const { spec, time } = await vmind.generateChart(message, fieldInfo, dataset2);
    console.log(JSON.stringify(spec))
    setCurrentSpec(spec)
    // Create vchart instance

    // Draw

  }

  if (currentSpec) {
    if (!vchart) {
      const currentVchart = new VChart(currentSpec, { dom: 'chart' });
      currentVchart.renderSync();
      setVChart(currentVchart)
    } else {
      vchart.updateSpecSync(currentSpec)
    }
  }

  return (
    <div className={`flex flex-col items-center p-4 md:p-8 rounded grow overflow-hidden border"`}>
      <h2 className={`text-2xl`}>{emoji} {titleText}</h2>
      <div className="flex flex-col-reverse w-full mb-4 overflow-auto transition-[flex-grow] ease-in-out">
        <div id="chart" style={{width: '600px', height: '400px'}}></div>
      </div>
      <form onSubmit={sendPrompt} className="flex w-full flex-col">
        <div className="flex w-full mt-4">
          <input
            className="grow mr-8 p-4 rounded"
            value={message}
            placeholder={"What would you like to visualize?"}
            onChange={event => setMessage(event.target.value)}
          />
          <button type="submit" className="shrink-0 px-8 py-4 bg-sky-600 rounded w-28">
            <span>Send</span>
          </button>
        </div>
      </form>
      <ToastContainer />
    </div>
  )
}
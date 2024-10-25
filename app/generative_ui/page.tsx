"use client";

import { useEffect, useState } from "react";
import { useActions } from "./utils/client";
import { EndpointsContext } from "@/app/generative_ui/agent";
import {LocalContext} from "@/app/generative_ui/shared"
import { Graph } from "@/app/generative_ui/components/Graph";

type Chart = {
  description: string;
  spec: any;
}

export default function GenerativeUIPage() {
  const actions = useActions<typeof EndpointsContext>();

  const [elements, setElements] = useState<JSX.Element[]>([]);
  const [input, setInput] = useState("");

  const historyState = useState<[role: string, content: string][]>([]);
  const [history, setHistory] = historyState;

  const [charts, setCharts] = useState<Chart[]>([]);

  useEffect(() => {
    fetch("/api/dashboard").then((res) => res.json()).then((res) => setCharts(res.charts));
  })

  async function onSubmit(input: string) {
    console.log(`OnSubmit input: ${input}`);

    const newElements = [...elements];

    // execute the agent with user input and chat history
    const element = await actions.agent({ input, chat_history: history });
    console.log(`agent returned element: ${JSON.stringify(element)}`);

    newElements.push(
      <div className="flex flex-col gap-2 p-3" key={history.length}>
        <div className="bg-gray-700 p-3 rounded-lg self-start max-w-[50vw]">
          {input}
        </div>
        <div className="self-end text-right flex flex-col gap-2 items-end">
          {element.ui}
        </div>
      </div>,
    );

    // consume the value stream to obtain the final string value
    // after which we can append to our chat history state
    (async () => {
      let lastEvent = await element.lastEvent;
      if (typeof lastEvent === "string") {
        setHistory((prev) => [
          ...prev,
          ["user", input],
          ["assistant", lastEvent],
        ]);
      }
    })();

    setElements(newElements);
    setInput("");
  }

  return (
    <div>
      <div className="p-2 md:p-4 rounded bg-[#25252d] w-full max-h-[20%] overflow-hidden">
        <h1 className="text-xl md:text-xl">✨ Chart Generative UI</h1>
      </div>

      <div className="grid grid-flow-row-dense grid-cols-3 w-full h-5/6 gap-4 mt-4 max-h-[80%]">
        <div className="" >
          <div className="flex flex-col gap-4 pb-4 bg-[#25252d]">
            <LocalContext.Provider value={onSubmit}>
              <div className="scroll-smooth flex flex-col gap-2 overflow-hidden overflow-y-auto border border-gray-700 rounded-lg p-4" style={{height: "680px"}}>
                {elements}
              </div>
            </LocalContext.Provider>

            <div className="flex space-x-4">
              <div
                className="cursor-pointer flex-auto w-1/3 border border-gray-700 p-3 rounded-lg bg-[#778899]"
                onClick={() => onSubmit("What are the available fields to generate a chart?")}
              >
                What are the available fields to generate a chart?
              </div>
              <div
                className="cursor-pointer flex-auto w-1/3 border border-gray-700 p-3 rounded-lg bg-[#778899]"
                onClick={() => onSubmit("Generate a chart to see the total amount of each currency")}
              >
                Generate a chart to see the total amount of each currency
              </div>
              <div
                className="cursor-pointer flex-auto w-1/3 border border-gray-700 p-3 rounded-lg bg-[#778899]"
                onClick={() => onSubmit("Show me the amount by payment type of each supplier")}
              >
                Show me the amount by payment type of each supplier
              </div>
            </div>

            <form
              className="grid grid-cols-[1fr,auto] items-center gap-2"
              onSubmit={async (e) => {
                e.stopPropagation();
                e.preventDefault();
                onSubmit(input);
              }}
            >
              <input
                type="text"
                value={input}
                className="bg-white px-3 py-2 border border-gray-600 rounded-md text-black outline-none"
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your request"
              />
              <button
                className="flex p-1 border border-gray-600 rounded-md px-4 py-2 hover:bg-gray-700/50 transition-colors"
                type="submit"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
        <div className="col-span-2 overflow-hidden overflow-y-auto" style={{height: "869px"}}>
          <div className="grid grid-flow-row-dense grid-cols-3 auto-rows-max gap-4 bg-[#25252d]" style={{height: "869px"}}>
            {charts.map((chart, index) => (
              <div key={`chart-card-${index}`} className="bg-white empty:hidden border border-gray-700 p-3 rounded-lg">
                <p className="text-black text-xs place-self-center">{chart.description}</p>
                <Graph
                  height={250}
                  spec={chart.spec}
                  chartId={`chart-graph-${index}`}
                  key={`chart-graph-${index}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

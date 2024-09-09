"use client";

import { useState } from "react";
import type { EndpointsContextV } from "./agent";
import { useActions } from "../utils/client";
import { LocalContext } from "./shared";

export default function GenerativeUIPage() {
  const actions = useActions<typeof EndpointsContextV>();

  const [elements, setElements] = useState<JSX.Element[]>([]);
  const [input, setInput] = useState("");

  const historyState = useState<[role: string, content: string][]>([]);
  const [history, setHistory] = historyState;

  async function onSubmit(input: string) {
    console.log(`OnSubmit input: ${input}`);

    const newElements = [...elements];

    // execute the agent with user input and chat history
    const element = await actions.agent({ input, chat_history: history });
    console.log(`agent returned element: ${JSON.stringify(element)}`);

    newElements.push(
      <div className="flex flex-col gap-2" key={history.length}>
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
      <div className="p-4 md:p-8 rounded bg-[#25252d] w-full max-h-[85%] overflow-hidden">
        <h1 className="text-3xl md:text-4xl mb-4">
          ✨ Chart Generative UI
        </h1>
      </div>

      <div className="flex flex-col gap-4 items-stretch pb-4">
        <LocalContext.Provider value={onSubmit}>
          <div className="flex flex-col gap-2 overflow-hidden overflow-y-auto border border-gray-700 rounded-lg p-4">
            {elements}
          </div>
        </LocalContext.Provider>

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
            className="bg-transparent px-3 py-2 border border-gray-600 rounded-md text-white outline-none"
            onChange={(e) => setInput(e.target.value)}
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
  );
}

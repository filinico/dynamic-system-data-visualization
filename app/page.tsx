import { ChatWindow } from "@/components/ChatWindow";

export default function Home() {
  return (
    <div className="p-4 md:p-8 rounded bg-[#25252d] w-full max-h-[85%] overflow-hidden">
      <h1 className="text-3xl md:text-4xl mb-4">
        Chart generation assistant with generative UI 🦜🔗
      </h1>
      <p>
        This project showcases a chat assistant to generate charts without providing the values.
      </p>
      <p>
        The assistant will analyze what data are required for the request of the user and fetch the data from the
        corresponding external system.
      </p>
      <p>
        The assistant will then generate a chart to satisfy the request of the user and stream the chart in the UI.
      </p>
      <p>
        <a
          href="/generative_ui/visualization"
        >
          Try it out ✨
        </a>
      </p>
    </div>
  );
}

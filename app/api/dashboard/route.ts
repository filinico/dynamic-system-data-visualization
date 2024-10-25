import { NextResponse } from "next/server";
import { getDashboard } from "@/app/generative_ui/ai/chain";

export async function GET() {
  return NextResponse.json(
    {
      charts: getDashboard().map((chart) => ({
        description: chart.description,
        spec: chart.specWithData,
      })),
    },
    { status: 200 },
  );
}
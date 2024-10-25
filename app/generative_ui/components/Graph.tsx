"use client"

import React, { useRef } from 'react';
import { ISpec, VChart } from "@visactor/react-vchart";
//import VChart from "@visactor/vchart";
import { useEffect, useState } from "react";
import { uuid } from "@visactor/vutils";
/*
export function Graph(props: {chartId: string, spec: any}){
  const [vchart, setVChart] = useState<VChart | null>(null);

  const renderChart = (spec: any, chartId: string) => {
    if (!vchart) {
      const currentVchart = new VChart(spec, { dom: chartId });
      currentVchart.renderSync();
      setVChart(currentVchart)
    } else {
      vchart.updateSpecSync(spec)
    }
  }

  useEffect(() => {
    renderChart(props.spec, props.chartId)
  }, [vchart]);

  return (
    <div className="flex gap-2">
      <div id={props.chartId} style={{ width: '600px', height: '400px' }}></div>
    </div>
  )
}*/
export function Graph(props: {chartId: string, spec: ISpec}){
  const chartRef = useRef(null);
  return (
    <div>
      <VChart
        ref={chartRef}
        key={props.chartId}
        spec={props.spec}
        width={800}
        height={600}
      />
    </div>
  )
}
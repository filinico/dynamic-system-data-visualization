"use client"

import React, { useRef } from 'react';
import { ISpec, VChart } from "@visactor/react-vchart";

export function Graph(props: {chartId: string, spec: ISpec, width?: number, height: number}) {
  const chartRef = useRef(null);
  return (
    <div>
      <VChart
        ref={chartRef}
        key={props.chartId}
        spec={props.spec}
        width={props.width}
        height={props.height}
      />
    </div>
  )
}
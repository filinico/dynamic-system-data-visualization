import { EndpointsContextV } from "./agent";
import { ReactNode } from "react";

export default function RootLayout(props: { children: ReactNode }) {
  return <EndpointsContextV>{props.children}</EndpointsContextV>;
}

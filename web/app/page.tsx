"use client";

import dynamic from "next/dynamic";

const ArrivalScene3D = dynamic(
  () => import("@/components/arrival/ArrivalScene3D"),
  { ssr: false },
);

export default function Home() {
  return <ArrivalScene3D />;
}

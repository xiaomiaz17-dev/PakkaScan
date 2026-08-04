"use client";

import dynamic from "next/dynamic";

const ClientDashboard = dynamic(
  () => import("@/components/ClientDashboard"),
  { ssr: false }
);

export default function Page() {
  return <ClientDashboard />;
}
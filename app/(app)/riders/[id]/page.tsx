"use client";

import { use } from "react";
import { RiderProfile } from "@/components/profile/RiderProfile";

export default function RiderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RiderProfile id={id} />;
}

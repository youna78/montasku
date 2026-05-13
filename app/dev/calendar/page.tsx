import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DevCalendarClient } from "./DevCalendarClient";

export default async function DevCalendarPage() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const isLocalHost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (process.env.NODE_ENV !== "development" && !isLocalHost) {
    notFound();
  }

  return <DevCalendarClient />;
}

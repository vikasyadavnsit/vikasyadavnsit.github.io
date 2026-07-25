import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eternal Journey | Vikas Yadav",
  description: "A beautiful, interactive, multi-page proposal theme.",
};

export default function EternalJourneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

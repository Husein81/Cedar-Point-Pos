import { redirect } from "next/navigation";

/**
 * Root page redirects to admin dashboard
 */
export default function Home() {
  redirect("/admin");
}

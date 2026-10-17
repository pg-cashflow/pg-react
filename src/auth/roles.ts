export function homeForRole(role: string | null | undefined, pending: boolean): string {
  if (role === "owner") return "/owner/dashboard";
  if (role === "manager") return "/manager/kitchen";
  if (role === "tenant" && pending) return "/join";
  if (role === "tenant") return "/tenant";
  return "/landing";
}

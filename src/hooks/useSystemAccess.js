import { useSystemAccessContext } from "@/context/SystemAccessContext";

export function useSystemAccess() {
  return useSystemAccessContext();
}

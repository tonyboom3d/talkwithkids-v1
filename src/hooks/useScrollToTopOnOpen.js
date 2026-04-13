import { useEffect } from "react";
import { usePostMessage } from "@/hooks/usePostMessage";

export function useScrollToTopOnOpen(isOpen) {
  const { send } = usePostMessage();

  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    send("SCROLL_TO_TOP");
  }, [isOpen, send]);
}

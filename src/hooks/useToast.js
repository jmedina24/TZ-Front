// src/hooks/useToast.js
import { useCallback, useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });

  const showToast = useCallback((msg, type = "success") => {
    setToast({ show: true, msg, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
  }, []);

  return { toast, showToast };
}

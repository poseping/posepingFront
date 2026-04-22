import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAlertTypes } from "../services/webcamApi";

const COOLDOWN_MS: Record<string, number> = {
  bad: 30_000, // 알림 최소 30초 간격 제한
  warning: 60_000, // 알림 최소 60초 간격 제한
};

const FALLBACK_BODY: Record<string, string> = {
  bad: "자세가 많이 무너졌어요! 허리를 펴주세요.",
  warning: "자세가 흐트러지고 있어요. 자세를 확인해 주세요.",
};

export function usePostureNotification() {
  const { data: alertTypes = [] } = useQuery({
    queryKey: ["alertTypes"],
    queryFn: getAlertTypes,
    staleTime: Infinity,
  });

  const alertMap = Object.fromEntries(
    alertTypes.map((a) => [a.alert_type_id, a]),
  );

  const lastNotifiedAt = useRef<Partial<Record<string, number>>>({});
  const [permission, setPermission] = useState<NotificationPermission>(
    Notification.permission,
  );

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission().then(setPermission);
    }
  }, []);

  function notify(status: "good" | "warning" | "bad", issues: string[]) {
    if (status === "good") return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;

    const now = Date.now();
    const cooldown = COOLDOWN_MS[status] ?? 30_000;
    const last = lastNotifiedAt.current[status] ?? 0;
    if (now - last < cooldown) return;

    const body =
      issues
        .map((id) => alertMap[id]?.description ?? alertMap[id]?.alert_name)
        .filter(Boolean)
        .join(", ") || FALLBACK_BODY[status];

    new Notification("척추PIng", { body, icon: "/favicon.ico" });
    lastNotifiedAt.current[status] = now;
  }

  return { notify, permission };
}

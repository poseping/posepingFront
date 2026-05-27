import { useState, useEffect, useRef } from "react";

export type StretchInterval = 1 | 30 | 60 | 120;

const STORAGE_KEY = "poseping_stretch";

interface PersistedState {
  intervalMinutes: StretchInterval;
  startedAt: number;
  lastCycle: number;
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useStretchReminder() {
  const persisted = useRef(loadPersisted()).current;

  const [isEnabled, setIsEnabled] = useState(() => persisted !== null);
  const [isPaused, setIsPaused] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState<StretchInterval>(
    persisted?.intervalMinutes ?? 60,
  );
  const [timeLeft, setTimeLeft] = useState(0);

  const startedAtRef = useRef<number>(persisted?.startedAt ?? 0);
  const lastCycleRef = useRef<number>(persisted?.lastCycle ?? 0);
  const intervalRef = useRef(intervalMinutes);
  const prevIntervalRef = useRef(intervalMinutes);
  const pauseStartRef = useRef<number>(0);

  useEffect(() => {
    intervalRef.current = intervalMinutes;
  }, [intervalMinutes]);

  useEffect(() => {
    if (!isEnabled) {
      sessionStorage.removeItem(STORAGE_KEY);
      startedAtRef.current = 0;
      lastCycleRef.current = 0;
      pauseStartRef.current = 0;
      setTimeLeft(0);
      return;
    }

    if (isPaused) {
      // 일시정지 시작 시각 기록 — resume 시 startedAt 보정에 사용
      pauseStartRef.current = Date.now();
      return;
    }

    // 일시정지에서 재개 시: 멈춰있던 시간만큼 startedAt을 앞으로 당겨 elapsed에서 제외
    if (pauseStartRef.current > 0) {
      startedAtRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }

    // 인터벌이 변경된 경우 카운트 리셋
    if (prevIntervalRef.current !== intervalMinutes) {
      prevIntervalRef.current = intervalMinutes;
      startedAtRef.current = 0;
      lastCycleRef.current = 0;
    }

    // startedAt 없으면 지금 시각으로 설정 (신규 활성화)
    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now();
    }

    function persist() {
      savePersisted({
        intervalMinutes: intervalRef.current as StretchInterval,
        startedAt: startedAtRef.current,
        lastCycle: lastCycleRef.current,
      });
    }

    persist();

    function getState() {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const total = intervalRef.current * 60;
      const cycle = Math.floor(elapsed / total);
      const remaining = total - (elapsed % total);
      return { cycle, remaining };
    }

    function fireNotification() {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("포즈PING — 스트레칭 시간", {
          body: "자리에 앉은 지 오래됐어요. 잠깐 일어나 스트레칭해보세요!",
          icon: "/favicon.ico",
        });
      }
    }

    setTimeLeft(getState().remaining);

    const tickId = window.setInterval(() => {
      const { cycle, remaining } = getState();
      if (cycle > lastCycleRef.current) {
        lastCycleRef.current = cycle;
        persist();
        fireNotification();
      }
      setTimeLeft(remaining);
    }, 1_000);

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const { cycle, remaining } = getState();
      if (cycle > lastCycleRef.current) {
        lastCycleRef.current = cycle;
        persist();
        fireNotification();
      }
      setTimeLeft(remaining);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(tickId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isEnabled, isPaused, intervalMinutes]);

  function toggle() {
    setIsEnabled((prev) => !prev);
  }

  function disable() {
    setIsEnabled(false);
    setIsPaused(false);
  }

  function pause() {
    setIsPaused(true);
  }

  function resume() {
    setIsPaused(false);
  }

  return { isEnabled, isPaused, intervalMinutes, setIntervalMinutes, timeLeft, toggle, disable, pause, resume };
}

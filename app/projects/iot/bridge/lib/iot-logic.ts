import { db } from "@/lib/firebase";
import { ref, push, set, onValue, off, remove } from "firebase/database";

export interface SensorData {
  temp: number;
  humidity: number;
  pressure: number;
  co2: number;
  motion: number; // 0 | 1
}

export const SENSOR_FIELDS = [
  { id: "temp",     label: "Temperature", unit: "°C",  iconName: "Thermometer" },
  { id: "humidity", label: "Humidity",    unit: "%",   iconName: "Droplets"    },
  { id: "pressure", label: "Pressure",    unit: " hPa",iconName: "Gauge"       },
  { id: "co2",      label: "CO₂",         unit: " ppm",iconName: "Wind"        },
  { id: "motion",   label: "Motion",      unit: "",    iconName: "Activity"    },
] as const;

export const SENSOR_OPS = [
  { id: ">",  label: "is above" },
  { id: "<",  label: "is below" },
  { id: "==", label: "equals"   },
  { id: ">=", label: "at least" },
  { id: "<=", label: "at most"  },
  { id: "!=", label: "is not"   },
] as const;

export type SensorFieldId = typeof SENSOR_FIELDS[number]["id"];
export type SensorOpId    = typeof SENSOR_OPS[number]["id"];

export interface IoTApplet {
  id: string;
  name: string;
  trigger: {
    type: "time" | "sensor" | "webhook";
    value: string; // "08:00", "temp > 30", or webhook ID
    condition?: string; // For webhook filtering, e.g., "key1 > 30"
    timeWindow?: { start: string; end: string; enabled: boolean };
  };
  action: {
    type: "notification" | "light" | "fetch";
    value: string; // message, "on/off/toggle", or URL
    fetchMethod?: "GET" | "POST";
    target?: string;  // for "light": named device, e.g. "Bedroom Light"
    icon?: string;    // for "light": custom icon name
    customResponse?: string; // For webhooks: what to return
  };
  enabled: boolean;
  lastRun?: number;
  // Stored under the applet node so deletion auto-cleans it
  webhookTrigger?: { params: Record<string, string>; timestamp: number };
}

export interface IoTLog {
  id: string;
  appletId: string;
  appletName: string;
  timestamp: number;
  status: "success" | "failure" | "auto-reset" | "skipped";
  message: string;
  actionType?: IoTApplet["action"]["type"];
  fetchResponse?: { status: number; body: string };
}

const APPLET_PATH = "iot_bridge/applets";
const LOG_PATH    = "iot_bridge/logs";

export const saveApplet = async (applet: Omit<IoTApplet, "id"> & { id?: string }) => {
  if (applet.id) {
    await set(ref(db, `${APPLET_PATH}/${applet.id}`), applet);
    return applet.id;
  } else {
    const appletsRef   = ref(db, APPLET_PATH);
    const newAppletRef = push(appletsRef);
    const id           = newAppletRef.key!;
    await set(newAppletRef, { ...applet, id });
    return id;
  }
};

export const deleteApplet = async (id: string) => {
  await remove(ref(db, `${APPLET_PATH}/${id}`));
};

export const subscribeToApplets = (callback: (applets: IoTApplet[]) => void) => {
  const appletsRef = ref(db, APPLET_PATH);
  const listener   = onValue(appletsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data ? (Object.values(data) as IoTApplet[]) : []);
  });
  return () => off(appletsRef, "value", listener);
};

export const logExecution = async (log: Omit<IoTLog, "id">) => {
  const logsRef    = ref(db, LOG_PATH);
  const newLogRef  = push(logsRef);
  const id         = newLogRef.key!;
  await set(newLogRef, { ...log, id });
};

export const subscribeToLogs = (callback: (logs: IoTLog[]) => void) => {
  const logsRef  = ref(db, LOG_PATH);
  const listener = onValue(logsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.values(data) as IoTLog[];
      list.sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    } else {
      callback([]);
    }
  });
  return () => off(logsRef, "value", listener);
};

export const clearLogs = async () => {
  await remove(ref(db, LOG_PATH));
};

// Setting webhookTrigger to null removes the key from Firebase (self-cleaning under applet node)
export const clearWebhookTrigger = async (appletId: string) => {
  await set(ref(db, `${APPLET_PATH}/${appletId}/webhookTrigger`), null);
};

export const injectVariables = (text: string, params?: Record<string, string>, sensorData?: Partial<SensorData>) => {
  let result = text;
  if (sensorData) {
    result = result
      .replace(/{temp}/g,     String(sensorData.temp ?? ""))
      .replace(/{humidity}/g, String(sensorData.humidity ?? ""))
      .replace(/{pressure}/g, String(sensorData.pressure ?? ""))
      .replace(/{co2}/g,      String(sensorData.co2 ?? ""))
      .replace(/{motion}/g,   sensorData.motion === 1 ? "Detected" : "None");
  }
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, String(val));
    });
  }
  return result;
};

export const checkWebhookCondition = (condition: string, params: Record<string, string>): boolean => {
  if (!condition) return true;
  const parts = condition.trim().split(/\s+/);
  if (parts.length < 3) return true;
  const [key, op, val] = parts;
  const paramValue = params[key];
  if (paramValue === undefined) return false;

  const n1 = parseFloat(paramValue);
  const n2 = parseFloat(val);
  const v1 = isNaN(n1) ? paramValue : n1;
  const v2 = isNaN(n2) ? val : n2;

  if (op === ">")  return (v1 as any) > (v2 as any);
  if (op === "<")  return (v1 as any) < (v2 as any);
  if (op === "==") return (v1 as any) == (v2 as any);
  if (op === ">=") return (v1 as any) >= (v2 as any);
  if (op === "<=") return (v1 as any) <= (v2 as any);
  if (op === "!=") return (v1 as any) !== (v2 as any);
  return false;
};

export const isInTimeWindow = (window?: IoTApplet["trigger"]["timeWindow"]): boolean => {
  if (!window || !window.enabled || !window.start || !window.end) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = window.start.split(":").map(Number);
  const [endH, endM] = window.end.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight window (e.g., 22:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
};

// Pure condition check — no side effects, used for hysteresis in page.tsx
export const checkSensorCondition = (applet: IoTApplet, sensorData: SensorData): boolean => {
  if (applet.trigger.type !== "sensor") return false;
  const parts = applet.trigger.value.trim().split(/\s+/);
  if (parts.length < 3) return false;
  const [key, op, val] = parts;
  const sensorValue    = sensorData[key as keyof SensorData];
  if (sensorValue === undefined) return false;
  const n = parseFloat(val);
  if (op === ">")  return sensorValue > n;
  if (op === "<")  return sensorValue < n;
  if (op === "==") return sensorValue === n;
  if (op === ">=") return sensorValue >= n;
  if (op === "<=") return sensorValue <= n;
  if (op === "!=") return sensorValue !== n;
  return false;
};

export const evaluateApplet = async (
  applet: IoTApplet,
  sensorData?: Partial<SensorData>,
  persist: boolean = true
) => {
  if (!applet.enabled) return null;
  if (!isInTimeWindow(applet.trigger.timeWindow)) return null;

  let shouldTrigger = false;

  if (applet.trigger.type === "sensor" && sensorData) {
    shouldTrigger = checkSensorCondition(applet, sensorData as SensorData);
  } else if (applet.trigger.type === "time") {
    const now = new Date();
    const cur = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    shouldTrigger = cur === applet.trigger.value;
  }

  if (shouldTrigger) return await executeAction(applet, persist);
  return null;
};

export const executeAction = async (applet: IoTApplet, persist: boolean = true, params?: Record<string, string>, sensorData?: Partial<SensorData>) => {
  if (applet.lastRun && Date.now() - applet.lastRun < 10000) return null;

  if (persist) {
    await set(ref(db, `${APPLET_PATH}/${applet.id}/lastRun`), Date.now());
  }

  let fetchResponse: { status: number; body: string } | undefined;

  if (applet.action.type === "fetch") {
    const method = applet.action.fetchMethod ?? "POST";
    const url = injectVariables(applet.action.value, params, sensorData);
    try {
      const res  = await fetch(url, {
        method,
        ...(method === "POST"
          ? { body: JSON.stringify({ triggeredBy: "IoT Bridge", params }), headers: { "Content-Type": "application/json" } }
          : {}),
      });
      const text = await res.text().catch(() => "");
      fetchResponse = { status: res.status, body: text.slice(0, 200) };
    } catch (e) {
      fetchResponse = { status: 0, body: String(e).slice(0, 100) };
    }
  }

  const message = fetchResponse
    ? `${applet.action.fetchMethod ?? "POST"} → ${fetchResponse.status} · ${fetchResponse.body.slice(0, 80)}`
    : `Triggered ${applet.action.type}: ${applet.action.value}`;

  const log: Omit<IoTLog, "id"> = {
    appletId:   applet.id,
    appletName: applet.name,
    timestamp:  Date.now(),
    status:     "success",
    message,
    actionType: applet.action.type,
    ...(fetchResponse ? { fetchResponse } : {}),
  };

  if (persist) await logExecution(log);
  return log;
};

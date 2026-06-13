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
  };
  action: {
    type: "notification" | "light" | "fetch";
    value: string; // message, "on/off", or URL
    fetchMethod?: "GET" | "POST";
    target?: string;  // for "light": named device, e.g. "Bedroom Light"
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
  status: "success" | "failure" | "auto-reset";
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
      callback(list.slice(0, 50));
    } else {
      callback([]);
    }
  });
  return () => off(logsRef, "value", listener);
};

export const subscribeToWebhookEvents = (
  callback: (events: Record<string, WebhookEvent>) => void
) => {
  const eventsRef = ref(db, WEBHOOK_EVENTS_PATH);
  const listener  = onValue(eventsRef, (snap) => callback(snap.val() ?? {}));
  return () => off(eventsRef, "value", listener);
};

export const clearWebhookEvent = async (appletId: string) => {
  await remove(ref(db, `${WEBHOOK_EVENTS_PATH}/${appletId}`));
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

export const executeAction = async (applet: IoTApplet, persist: boolean = true) => {
  if (applet.lastRun && Date.now() - applet.lastRun < 10000) return null;

  if (persist) {
    await set(ref(db, `${APPLET_PATH}/${applet.id}/lastRun`), Date.now());
  }

  let fetchResponse: { status: number; body: string } | undefined;

  if (applet.action.type === "fetch") {
    const method = applet.action.fetchMethod ?? "POST";
    try {
      const res  = await fetch(applet.action.value, {
        method,
        ...(method === "POST"
          ? { body: JSON.stringify({ triggeredBy: "IoT Bridge" }), headers: { "Content-Type": "application/json" } }
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

import { db } from "@/lib/firebase";
import { ref, push, set, onValue, off, remove } from "firebase/database";

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
  };
  enabled: boolean;
  lastRun?: number;
}

export interface IoTLog {
  id: string;
  appletId: string;
  appletName: string;
  timestamp: number;
  status: "success" | "failure";
  message: string;
}

const APPLET_PATH = "iot_bridge/applets";
const LOG_PATH = "iot_bridge/logs";

export const saveApplet = async (applet: Omit<IoTApplet, "id"> & { id?: string }) => {
  if (applet.id) {
    const appletRef = ref(db, `${APPLET_PATH}/${applet.id}`);
    await set(appletRef, applet);
    return applet.id;
  } else {
    const appletsRef = ref(db, APPLET_PATH);
    const newAppletRef = push(appletsRef);
    const id = newAppletRef.key!;
    await set(newAppletRef, { ...applet, id });
    return id;
  }
};

export const deleteApplet = async (id: string) => {
  const appletRef = ref(db, `${APPLET_PATH}/${id}`);
  await remove(appletRef);
};

export const subscribeToApplets = (callback: (applets: IoTApplet[]) => void) => {
  const appletsRef = ref(db, APPLET_PATH);
  const listener = onValue(appletsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.values(data) as IoTApplet[];
      callback(list);
    } else {
      callback([]);
    }
  });
  return () => off(appletsRef, "value", listener);
};

export const logExecution = async (log: Omit<IoTLog, "id">) => {
  const logsRef = ref(db, LOG_PATH);
  const newLogRef = push(logsRef);
  const id = newLogRef.key!;
  await set(newLogRef, { ...log, id });
};

export const subscribeToLogs = (callback: (logs: IoTLog[]) => void) => {
  const logsRef = ref(db, LOG_PATH);
  const listener = onValue(logsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.values(data) as IoTLog[];
      // Sort logs by timestamp descending
      list.sort((a, b) => b.timestamp - a.timestamp);
      callback(list.slice(0, 50)); // Keep only last 50
    } else {
      callback([]);
    }
  });
  return () => off(logsRef, "value", listener);
};

// Simulated evaluation logic
export const evaluateApplet = async (applet: IoTApplet, sensorData?: any, persist: boolean = true) => {
    if (!applet.enabled) return;

    let shouldTrigger = false;

    if (applet.trigger.type === "sensor") {
        // e.g., "temp > 30"
        const [key, op, val] = applet.trigger.value.split(" ");
        const sensorValue = sensorData?.[key];
        if (sensorValue !== undefined) {
            const numericVal = parseFloat(val);
            if (op === ">") shouldTrigger = sensorValue > numericVal;
            else if (op === "<") shouldTrigger = sensorValue < numericVal;
            else if (op === "==") shouldTrigger = sensorValue == numericVal;
        }
    } else if (applet.trigger.type === "time") {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        shouldTrigger = currentTime === applet.trigger.value;
    }

    if (shouldTrigger) {
        return await executeAction(applet, persist);
    }
    return null;
};

export const executeAction = async (applet: IoTApplet, persist: boolean = true) => {
    // Prevent double execution if triggered recently (e.g. within last 10 seconds)
    if (applet.lastRun && Date.now() - applet.lastRun < 10000) return null;

    if (persist) {
        // Update last run immediately to debounce
        const appletRef = ref(db, `${APPLET_PATH}/${applet.id}/lastRun`);
        await set(appletRef, Date.now());
    }

    console.log(`Executing action for ${applet.name}: ${applet.action.type} - ${applet.action.value}`);

    if (applet.action.type === "fetch") {
        try {
            await fetch(applet.action.value, { method: 'POST', body: JSON.stringify({ triggeredBy: 'IoT Bridge' }) });
        } catch (e) {
            console.error("Fetch action failed", e);
        }
    }

    const log: Omit<IoTLog, "id"> = {
        appletId: applet.id,
        appletName: applet.name,
        timestamp: Date.now(),
        status: "success",
        message: `Triggered ${applet.action.type}: ${applet.action.value}`
    };

    if (persist) {
        await logExecution(log);
    }

    return log;
};

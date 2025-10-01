import { useEffect, useState } from "react";
import { generateId } from "../utils/helpers";

export interface Flow {
  id: string;
  productId: string;
  productName: string;
  link: string;
  commission: number;
  createdAt: string;
}

const STORAGE_KEY = "ref_flows";

function readFlows(): Flow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFlows(flows: Flow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
  } catch {
    // ignore
  }
}

export const useFlows = () => {
  const [flows, setFlows] = useState<Flow[]>([]);

  useEffect(() => {
    setFlows(readFlows());
  }, []);

  useEffect(() => {
    writeFlows(flows);
  }, [flows]);

  const addFlow = (flow: Omit<Flow, "id" | "createdAt">) => {
    const newFlow: Flow = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...flow,
    };
    setFlows((prev) => [newFlow, ...prev]);
    return newFlow;
  };

  const removeFlow = (id: string) => {
    setFlows((prev) => prev.filter((f) => f.id !== id));
  };

  const clearFlows = () => setFlows([]);

  return { flows, addFlow, removeFlow, clearFlows };
};

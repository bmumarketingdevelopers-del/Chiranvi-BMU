import { useSyncExternalStore } from "react";

/*
  Delivery routes and agents for the Chiranvi Panel (Routes & agents page, and the Deliveries page's
  route names, colours and agent lists), until the database is connected. Saved in this browser.
  - 6 routes from the farm hub, each with its agent; route colours are Chiranvi greens and yellows.
  - 9 agents: one per route, two spare (they take reassigned deliveries), one on leave.
*/

export type DeliveryRoute = {
  id: string; // "R1"
  name: string; // "Route 1"
  area: string;
  agent: string; // full name of the agent on this route
  colour: string;
};

export type DeliveryAgent = {
  name: string;
  phone: string; // 10 digits
  bike: string; // "KA-05-4120"
  isOnLeave?: boolean;
};

export const STARTING_ROUTES: DeliveryRoute[] = [
  { id: "R1", name: "Route 1", area: "RR Nagar", agent: "Ramesh K", colour: "#1f4d2e" },
  { id: "R2", name: "Route 2", area: "Kengeri", agent: "Shivu M", colour: "#5e9a4a" },
  { id: "R3", name: "Route 3", area: "Banashankari", agent: "Manju R", colour: "#a3c98a" },
  { id: "R4", name: "Route 4", area: "Jayanagar", agent: "Prakash S", colour: "#f5bf2c" },
  { id: "R5", name: "Route 5", area: "Uttarahalli", agent: "Ganesh B", colour: "#c9891e" },
  { id: "R6", name: "Route 6", area: "JP Nagar", agent: "Imran A", colour: "#8a6a1c" },
];

// Colours for routes added later (still greens and yellows)
const MORE_ROUTE_COLOURS = ["#3d7a3a", "#e0a91f", "#6f8f2e", "#b3872a", "#2f6b52", "#d9b54a"];

const STARTING_AGENTS: DeliveryAgent[] = [
  { name: "Ramesh K", phone: "9845041201", bike: "KA-05-4120" },
  { name: "Shivu M", phone: "9845041572", bike: "KA-05-4157" },
  { name: "Manju R", phone: "9845041943", bike: "KA-05-4194" },
  { name: "Prakash S", phone: "9845042314", bike: "KA-05-4231" },
  { name: "Ganesh B", phone: "9845042685", bike: "KA-05-4268" },
  { name: "Imran A", phone: "9845043056", bike: "KA-05-4305" },
  { name: "Somu N", phone: "9845043427", bike: "KA-05-4342" },
  { name: "Raju T", phone: "9845043798", bike: "KA-05-4379" },
  { name: "Basava", phone: "9845044169", bike: "KA-05-4416", isOnLeave: true },
];

const ROUTES_KEY = "chiranvi-admin-routes";
const AGENTS_KEY = "chiranvi-admin-agents";

function load<T>(key: string, starting: T[]): T[] {
  if (typeof window === "undefined") return starting;
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return Array.isArray(saved) ? saved : starting;
  } catch {
    return starting;
  }
}

let routes: DeliveryRoute[] | null = null;
let agents: DeliveryAgent[] | null = null;
const listeners = new Set<() => void>();

function getRoutes() {
  if (!routes && typeof window !== "undefined") routes = load(ROUTES_KEY, STARTING_ROUTES);
  return routes ?? STARTING_ROUTES;
}

function getAgents() {
  if (!agents && typeof window !== "undefined") agents = load(AGENTS_KEY, STARTING_AGENTS);
  return agents ?? STARTING_AGENTS;
}

function save(newRoutes: DeliveryRoute[], newAgents: DeliveryAgent[]) {
  routes = newRoutes;
  agents = newAgents;
  try {
    window.localStorage.setItem(ROUTES_KEY, JSON.stringify(newRoutes));
    window.localStorage.setItem(AGENTS_KEY, JSON.stringify(newAgents));
  } catch {
    // Storage blocked: changes last until the page is refreshed.
  }
  listeners.forEach((onChange) => onChange());
}

// Edit routes: new area or agent for each route
export function updateRoutes(changes: { id: string; area: string; agent: string }[]) {
  save(
    getRoutes().map((route) => {
      const change = changes.find((existing) => existing.id === route.id);
      return change ? { ...route, area: change.area, agent: change.agent } : route;
    }),
    getAgents(),
  );
}

export function addRoute(area: string, agent: string) {
  const current = getRoutes();
  const number = Math.max(0, ...current.map((route) => Number(route.id.slice(1)))) + 1;
  const newRoute: DeliveryRoute = {
    id: `R${number}`,
    name: `Route ${number}`,
    area,
    agent,
    colour: MORE_ROUTE_COLOURS[(number - 7 + MORE_ROUTE_COLOURS.length * 10) % MORE_ROUTE_COLOURS.length],
  };
  save([...current, newRoute], getAgents());
  return newRoute;
}

export function addAgent(agent: DeliveryAgent) {
  save(getRoutes(), [...getAgents(), agent]);
}

// Set from the Staff page: an agent on leave is not on duty here either
export function setAgentOnLeave(name: string, isOnLeave: boolean) {
  if (!getAgents().some((agent) => agent.name === name)) return;
  save(
    getRoutes(),
    getAgents().map((agent) => (agent.name === name ? { ...agent, isOnLeave } : agent)),
  );
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useDeliveryRoutes() {
  return useSyncExternalStore(subscribe, getRoutes, () => STARTING_ROUTES);
}

export function useDeliveryAgents() {
  return useSyncExternalStore(subscribe, getAgents, () => STARTING_AGENTS);
}

export type RoomId = "desk" | "meeting" | "gym" | "library" | "break" | "server" | "ceo" | "hallway";

export interface RoomAssignment {
  agentId: string;
  room: RoomId;
  enteredAt: number;
}

export interface RoomOccupancy {
  room: RoomId;
  count: number;
  agentIds: string[];
  lightsOn: boolean;
}

export const ROOM_CAPACITY: Record<RoomId, number> = {
  desk: 12,
  meeting: 8,
  gym: 6,
  library: 6,
  break: 8,
  server: 4,
  ceo: 4,
  hallway: 99,
};

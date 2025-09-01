export interface Coordinates {
  x: number;
  y: number;
}

export interface Member {
  id: string;
  name: string;
  role?: {
    name: string;
    color: string;
  };
}

export interface Base {
  id: string;
  member: Member;
  coords: Coordinates;
}

export interface Marker {
  id: string;
  coords: Coordinates;
  label: string;
  color: string;
}

// Template for creating zones, lives in the sidebar
export interface ZoneTemplate {
  id: string;
  label: string;
  width: number; // in cells
  height: number; // in cells
  borderColor: string;
  bgColor: string;
}

// A zone that has been placed on the map
export interface PlacedZone extends ZoneTemplate {
  coords: Coordinates;
}


export interface GridDimensions {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export enum ItemType {
  MEMBER = 'MEMBER',
  BASE = 'BASE',
  ZONE_TEMPLATE = 'ZONE_TEMPLATE',
  PLACED_ZONE = 'PLACED_ZONE',
}

// Represents the entire state of the map for saving and loading
export interface MapData {
  members: Member[];
  bases: Base[];
  markers: Marker[];
  zoneTemplates: ZoneTemplate[];
  placedZones: PlacedZone[];
  gridDimensions: GridDimensions;
  allianceName: string;
  zoneName: string;
}
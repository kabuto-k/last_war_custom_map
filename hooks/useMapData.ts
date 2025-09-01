// FIX: Import Dispatch and SetStateAction for correct state setter typing.
import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import type { Member, Base, Marker, ZoneTemplate, PlacedZone, GridDimensions, Coordinates } from '../types';

// Generic hook for persisting state to localStorage
// FIX: Correctly type the state setter to allow functional updates.
function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error)
      {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}


const useMapData = () => {
  const [members, setMembers] = usePersistentState<Member[]>('lw-map-members', []);
  const [bases, setBases] = usePersistentState<Base[]>('lw-map-bases', []);
  const [markers, setMarkers] = usePersistentState<Marker[]>('lw-map-markers', []);
  
  // Updated zone states
  const [zoneTemplates, setZoneTemplates] = usePersistentState<ZoneTemplate[]>('lw-map-zone-templates', []);
  const [placedZones, setPlacedZones] = usePersistentState<PlacedZone[]>('lw-map-placed-zones', []);

  const [gridDimensions, setGridDimensions] = usePersistentState<GridDimensions>('lw-map-grid', { minX: 0, maxX: 74, minY: 950, maxY: 999 });
  const [allianceName, setAllianceName] = usePersistentState<string>('lw-map-allianceName', 'ラストウォー');
  const [zoneName, setZoneName] = usePersistentState<string>('lw-map-zoneName', '戦域');


  const addMember = useCallback((name: string) => {
    if (name.trim() === '') return;
    const newMember: Member = { id: `member-${Date.now()}`, name };
    setMembers(prev => [...prev, newMember]);
  }, [setMembers]);

  const removeMember = useCallback((id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    setBases(prev => prev.filter(b => b.member.id !== id));
  }, [setMembers, setBases]);
  
  const updateMemberRole = useCallback((memberId: string, roleName: string, color: string) => {
    const role = roleName.trim() === '' ? undefined : { name: roleName, color };
    
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    setBases(prev => 
      prev.map(b => 
        b.member.id === memberId 
          ? { ...b, member: { ...b.member, role } } 
          : b
      )
    );
  }, [setMembers, setBases]);

  const placeBase = useCallback((member: Member, x: number, y: number) => {
    setBases(prev => {
      const existingBaseIndex = prev.findIndex(b => b.member.id === member.id);
      const newBase: Base = { id: `base-${member.id}`, member, coords: { x, y } };
      
      if (existingBaseIndex > -1) {
        const updatedBases = [...prev];
        updatedBases[existingBaseIndex] = newBase;
        return updatedBases;
      }
      return [...prev, newBase];
    });
  }, [setBases]);
  
  const moveBase = useCallback((id: string, x: number, y: number) => {
    setBases(prev => prev.map(b => b.id === id ? { ...b, coords: { x, y } } : b));
  }, [setBases]);

  const removeBase = useCallback((id: string) => {
    setBases(prev => prev.filter(b => b.id !== id));
  }, [setBases]);

  const addMarker = useCallback((label: string, color: string, x: number, y: number) => {
    if (label.trim() === '') return;
    const newMarker: Marker = {
      id: `marker-${Date.now()}`,
      coords: { x, y },
      label,
      color,
    };
    setMarkers(prev => [...prev, newMarker]);
  }, [setMarkers]);

  const removeMarker = useCallback((id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  }, [setMarkers]);

  const addZoneTemplate = useCallback((template: Omit<ZoneTemplate, 'id'>) => {
    const newTemplate: ZoneTemplate = { ...template, id: `zonetemplate-${Date.now()}` };
    setZoneTemplates(prev => [...prev, newTemplate]);
  }, [setZoneTemplates]);

  const removeZoneTemplate = useCallback((id: string) => {
    setZoneTemplates(prev => prev.filter(zt => zt.id !== id));
  }, [setZoneTemplates]);

  const placeZone = useCallback((template: ZoneTemplate, coords: Coordinates) => {
    const newPlacedZone: PlacedZone = { ...template, id: `placedzone-${Date.now()}`, coords };
    setPlacedZones(prev => [...prev, newPlacedZone]);
  }, [setPlacedZones]);

  const movePlacedZone = useCallback((id: string, coords: Coordinates) => {
    setPlacedZones(prev => prev.map(pz => pz.id === id ? { ...pz, coords } : pz));
  }, [setPlacedZones]);

  const removePlacedZone = useCallback((id: string) => {
    setPlacedZones(prev => prev.filter(pz => pz.id !== id));
  }, [setPlacedZones]);
  
  const clearAll = useCallback(() => {
    if (window.confirm('本当にすべての基地、マーカー、ゾーンを削除しますか？メンバーリストと設定は残ります。')) {
      setBases([]);
      setMarkers([]);
      setPlacedZones([]);
    }
  }, [setBases, setMarkers, setPlacedZones]);

  return {
    members, addMember, removeMember, updateMemberRole,
    bases, placeBase, removeBase, moveBase,
    markers, addMarker, removeMarker,
    zoneTemplates, addZoneTemplate, removeZoneTemplate,
    placedZones, placeZone, removePlacedZone, movePlacedZone,
    gridDimensions, setGridDimensions,
    allianceName, setAllianceName,
    zoneName, setZoneName,
    clearAll
  };
};

export default useMapData;
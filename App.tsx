import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import useMapData from './hooks/useMapData';
import type { Member, Base, ZoneTemplate, Coordinates } from './types';

const App: React.FC = () => {
  const {
    members, addMember, removeMember, updateMemberRole,
    bases, placeBase, removeBase, moveBase,
    markers, addMarker, removeMarker,
    zoneTemplates, addZoneTemplate, removeZoneTemplate,
    placedZones, placeZone, removePlacedZone, movePlacedZone,
    gridDimensions, setGridDimensions,
    allianceName, setAllianceName,
    zoneName, setZoneName,
    clearAll,
    exportData,
    importData
  } = useMapData();

  const [visibleCoords, setVisibleCoords] = useState('');

  const handleDropBase = (baseId: string, x: number, y: number) => {
    moveBase(baseId, x, y);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      <Sidebar
        members={members}
        bases={bases}
        addMember={addMember}
        removeMember={removeMember}
        updateMemberRole={updateMemberRole}
        addMarker={addMarker}
        zoneTemplates={zoneTemplates}
        addZoneTemplate={addZoneTemplate}
        removeZoneTemplate={removeZoneTemplate}
        gridDimensions={gridDimensions}
        setGridDimensions={setGridDimensions}
        allianceName={allianceName}
        setAllianceName={setAllianceName}
        zoneName={zoneName}
        setZoneName={setZoneName}
        clearAll={clearAll}
        exportData={exportData}
        importData={importData}
      />
      <main className="flex-1 flex flex-col bg-gray-800">
        <header className="bg-gray-900/80 backdrop-blur-sm p-3 text-center border-b border-gray-700 shadow-lg z-20">
          <h1 className="text-xl font-bold tracking-wider text-cyan-400">
            {allianceName || '連盟'} {zoneName || '戦域'} 配置図
          </h1>
          <p className="text-xs text-gray-400">
            メンバーやゾーンをリストからマップへドラッグ＆ドロップして配置します。
          </p>
          {visibleCoords && (
            <p className="text-sm text-gray-500 font-mono mt-1">
              表示範囲: {visibleCoords}
            </p>
          )}
        </header>
        <MapView
          bases={bases}
          markers={markers}
          placedZones={placedZones}
          gridDimensions={gridDimensions}
          onDropMember={(member: Member, x: number, y: number) => placeBase(member, x, y)}
          onDropBase={handleDropBase}
          onPlaceZone={(template: ZoneTemplate, coords: Coordinates) => placeZone(template, coords)}
          onMoveZone={(zoneId: string, coords: Coordinates) => movePlacedZone(zoneId, coords)}
          removeBase={removeBase}
          removeMarker={removeMarker}
          removePlacedZone={removePlacedZone}
          onVisibleCoordsChange={setVisibleCoords}
        />
      </main>
    </div>
  );
};

export default App;
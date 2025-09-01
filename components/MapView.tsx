import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Base, Marker, Member, PlacedZone, GridDimensions, ZoneTemplate, Coordinates } from '../types';
import { ItemType } from '../types';

interface MapViewProps {
  bases: Base[];
  markers: Marker[];
  placedZones: PlacedZone[];
  gridDimensions: GridDimensions;
  onDropMember: (member: Member, x: number, y: number) => void;
  onDropBase: (baseId: string, x: number, y: number) => void;
  onPlaceZone: (template: ZoneTemplate, coords: Coordinates) => void;
  onMoveZone: (zoneId: string, coords: Coordinates) => void;
  removeBase: (id: string) => void;
  removeMarker: (id: string) => void;
  removePlacedZone: (id: string) => void;
  onVisibleCoordsChange: (coords: string) => void;
}

const CELL_SIZE_PX = 40;

const MapView: React.FC<MapViewProps> = (props) => {
  const { 
    bases, markers, placedZones, gridDimensions, 
    onDropMember, onDropBase, onPlaceZone, onMoveZone,
    removeBase, removeMarker, removePlacedZone, onVisibleCoordsChange 
  } = props;

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const startDragPos = useRef({ x: 0, y: 0 });

  const { minX, maxX, minY, maxY } = gridDimensions;
  const gridWidth = (maxX - minX + 1);
  const gridHeight = (maxY - minY + 1);

  const updateVisibleCoords = useCallback(() => {
    if (!mapRef.current || !gridContainerRef.current) return;

    const viewport = mapRef.current.getBoundingClientRect();
    const grid = gridContainerRef.current.getBoundingClientRect();

    const visibleLeft = Math.max(viewport.left, grid.left);
    const visibleTop = Math.max(viewport.top, grid.top);
    const visibleRight = Math.min(viewport.right, grid.right);
    const visibleBottom = Math.min(viewport.bottom, grid.bottom);
    
    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
      onVisibleCoordsChange('');
      return;
    }

    const relativeLeft = visibleLeft - grid.left;
    const relativeTop = visibleTop - grid.top;
    const relativeRight = visibleRight - grid.left;
    const relativeBottom = visibleBottom - grid.top;

    const getGameCoords = (relX: number, relY: number) => {
        const colIndex = Math.floor(relX / (CELL_SIZE_PX * scale));
        const rowIndex = Math.floor(relY / (CELL_SIZE_PX * scale));
        return {
            x: minX + colIndex,
            y: maxY - rowIndex,
        };
    };
    
    const topLeft = getGameCoords(relativeLeft, relativeTop);
    const bottomRight = getGameCoords(relativeRight, relativeBottom);

    const clampedTopLeftX = Math.max(minX, Math.min(maxX, topLeft.x));
    const clampedTopLeftY = Math.max(minY, Math.min(maxY, topLeft.y));
    const clampedBottomRightX = Math.max(minX, Math.min(maxX, bottomRight.x));
    const clampedBottomRightY = Math.max(minY, Math.min(maxY, bottomRight.y));

    const coordString = `(X: ${clampedTopLeftX} - ${clampedBottomRightX}, Y: ${clampedBottomRightY} - ${clampedTopLeftY})`;
    onVisibleCoordsChange(coordString);

  }, [scale, position, gridDimensions.minX, gridDimensions.maxX, gridDimensions.minY, gridDimensions.maxY, onVisibleCoordsChange]);

  useEffect(() => {
    updateVisibleCoords();
  }, [updateVisibleCoords]);

  const getCoordsFromDropEvent = useCallback((e: React.DragEvent<HTMLDivElement>): Coordinates | null => {
    const gridContainer = e.currentTarget;
    const rect = gridContainer.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const colIndex = Math.floor(mouseX / (CELL_SIZE_PX * scale));
    const rowIndex = Math.floor(mouseY / (CELL_SIZE_PX * scale));

    const x = minX + colIndex;
    const y = maxY - rowIndex;

    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return { x, y };
    }
    return null;
  }, [scale, minX, maxX, minY, maxY]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newScale = Math.min(Math.max(0.1, scale - e.deltaY * 0.001), 2.5);
    setScale(newScale);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    
    e.preventDefault();
    setIsDraggingMap(true);
    startDragPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    if (mapRef.current) mapRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDraggingMap(false);
    if (mapRef.current) mapRef.current.style.cursor = 'grab';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMap) return;
    setPosition({
      x: e.clientX - startDragPos.current.x,
      y: e.clientY - startDragPos.current.y,
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const coords = getCoordsFromDropEvent(e);
    if (!coords) return;

    const { x, y } = coords;
    
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
        try {
            const data = JSON.parse(jsonData);
            switch(data.type) {
                case ItemType.MEMBER:
                    onDropMember(data.payload, x, y);
                    break;
                case ItemType.BASE:
                    onDropBase(data.payload, x, y);
                    break;
                case ItemType.ZONE_TEMPLATE:
                    onPlaceZone(data.payload, { x, y });
                    break;
                case ItemType.PLACED_ZONE:
                    onMoveZone(data.payload, { x, y });
                    break;
            }
        } catch (error) {
            console.error("Failed to parse drop data", error);
        }
    }
  };
  
  const handleBaseDragStart = (e: React.DragEvent<HTMLDivElement>, baseId: string) => {
      const data = JSON.stringify({ type: ItemType.BASE, payload: baseId });
      e.dataTransfer.setData('application/json', data);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleZoneDragStart = (e: React.DragEvent<HTMLDivElement>, zoneId: string) => {
    const data = JSON.stringify({ type: ItemType.PLACED_ZONE, payload: zoneId });
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.effectAllowed = 'move';
  };

  const renderGrid = () => {
    const cells = [];
    for (let j = 0; j < gridHeight; j++) {
      for (let i = 0; i < gridWidth; i++) {
        const x = minX + i;
        const y = maxY - j;
        cells.push(
          <div
            key={`${x}-${y}`}
            className="border-r border-b border-gray-700/50"
          ></div>
        );
      }
    }
    return cells;
  };
  
  const renderCoordinateLabels = (axis: 'x' | 'y') => {
      const labels = [];
      if (axis === 'x') {
          for (let i = 0; i < gridWidth; i++) {
              labels.push(<div key={i} className="flex-shrink-0 flex items-center justify-center text-xs text-gray-500" style={{width: `${CELL_SIZE_PX}px`}}>{minX + i}</div>);
          }
      } else {
          for (let i = 0; i < gridHeight; i++) {
              labels.push(<div key={i} className="flex-shrink-0 flex items-center justify-center text-xs text-gray-500" style={{height: `${CELL_SIZE_PX}px`}}>{maxY - i}</div>);
          }
      }
      return labels;
  };
  
  const stopPan = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="flex-1 w-full h-full overflow-hidden bg-gray-800 relative select-none cursor-grab" 
      ref={mapRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
    >
      <div 
        id="map-container"
        className="absolute top-0 left-0"
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: '0 0' }}
      >
        <div id="map-content-for-export" className="p-8 bg-gray-800">
            <div className="flex">
                <div style={{width: '2.5rem', height: '1.5rem', flexShrink: 0}}></div>
                <div className="flex">{renderCoordinateLabels('x')}</div>
            </div>
            <div className="flex">
                <div className="flex flex-col" style={{width: '2.5rem'}}>{renderCoordinateLabels('y')}</div>
                <div
                    ref={gridContainerRef}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="relative bg-gray-800 grid"
                    style={{
                        gridTemplateColumns: `repeat(${gridWidth}, ${CELL_SIZE_PX}px)`,
                        gridTemplateRows: `repeat(${gridHeight}, ${CELL_SIZE_PX}px)`,
                        width: `${gridWidth * CELL_SIZE_PX}px`,
                        height: `${gridHeight * CELL_SIZE_PX}px`,
                    }}
                    >
                    {renderGrid()}
                    
                    {placedZones.map(zone => {
                        const left = (zone.coords.x - minX) * CELL_SIZE_PX;
                        const top = (maxY - zone.coords.y) * CELL_SIZE_PX;
                        const width = zone.width * CELL_SIZE_PX;
                        const height = zone.height * CELL_SIZE_PX;
                        return (
                            <div 
                                key={zone.id} 
                                draggable
                                onDragStart={(e) => handleZoneDragStart(e, zone.id)}
                                onMouseDown={stopPan}
                                className="absolute group cursor-move" 
                                style={{ left, top, width, height, pointerEvents: 'auto' }}
                            >
                                <div className="w-full h-full" style={{backgroundColor: zone.bgColor, border: `2px solid ${zone.borderColor}`}}></div>
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-lg text-white" style={{textShadow: '0 0 5px black', pointerEvents: 'none'}}>{zone.label}</span>
                                <button onClick={() => removePlacedZone(zone.id)} className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none" aria-label={`Remove zone ${zone.label}`}>&times;</button>
                            </div>
                        )
                    })}
                    
                    {bases.map(base => {
                        const borderColor = base.member.role?.color || '#06b6d4';
                        return (
                            <div
                                key={base.id}
                                draggable
                                onDragStart={(e) => handleBaseDragStart(e, base.id)}
                                onMouseDown={stopPan}
                                className="absolute flex flex-col items-center justify-center p-1 group cursor-move rounded"
                                style={{
                                    left: `${(base.coords.x - 1 - minX) * CELL_SIZE_PX}px`,
                                    top: `${(maxY - base.coords.y - 1) * CELL_SIZE_PX}px`,
                                    width: `${CELL_SIZE_PX * 3}px`,
                                    height: `${CELL_SIZE_PX * 3}px`,
                                    backgroundColor: 'rgba(0, 20, 30, 0.4)',
                                    border: `2px solid ${borderColor}`,
                                    pointerEvents: 'auto',
                                    zIndex: 10,
                                }}
                            >
                                <div className="text-xs font-bold text-center text-white" style={{textShadow: '1px 1px 2px black'}}>
                                    {base.member.role && (
                                      <div className="font-semibold" style={{color: base.member.role.color}}>
                                        {`[${base.member.role.name}]`}
                                      </div>
                                    )}
                                    {base.member.name}
                                    <div className="font-mono opacity-80">
                                      ({base.coords.x}, {base.coords.y})
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeBase(base.id)} 
                                    className="absolute -top-2.5 -right-2.5 w-5 h-5 flex items-center justify-center bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none z-10" 
                                    aria-label={`Remove base for ${base.member.name}`}
                                >
                                    &times;
                                </button>
                            </div>
                        )
                    })}

                    {markers.map(marker => (
                        <div
                            key={marker.id}
                            className="absolute flex flex-col items-center justify-center p-1 group"
                            style={{
                                left: `${(marker.coords.x - minX) * CELL_SIZE_PX}px`,
                                top: `${(maxY - marker.coords.y) * CELL_SIZE_PX}px`,
                                width: `${CELL_SIZE_PX}px`,
                                height: `${CELL_SIZE_PX}px`,
                                zIndex: 20,
                            }}
                        >
                            <div className="w-7 h-7 flex items-center justify-center shadow-lg rounded-full" style={{backgroundColor: marker.color, border: '2px solid white'}}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-xs text-center text-white bg-black/50 rounded px-1 mt-1 truncate max-w-full">
                                {marker.label}
                            </span>
                            <button onClick={() => removeMarker(marker.id)} className="absolute top-0 right-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg">&times;</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 bg-gray-900/50 p-2 rounded-lg text-xs pointer-events-none">
          <p>Zoom: {Math.round(scale * 100)}%</p>
          <p className="text-gray-400">Scroll to zoom, Drag background to pan</p>
      </div>
    </div>
  );
};

export default MapView;
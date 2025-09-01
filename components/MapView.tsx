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
const HEADER_SIZE_PX = 30;

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
  const startDragPos = useRef({ x: 0, y: 0 });
  
  // Refs for touch controls
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef<number>(1);

  const { minX, maxX, minY, maxY } = gridDimensions;
  const gridWidth = (maxX - minX + 1);
  const gridHeight = (maxY - minY + 1);

  const updateVisibleCoords = useCallback(() => {
    if (!mapRef.current) return;

    const viewport = mapRef.current;
    const viewportRect = viewport.getBoundingClientRect();

    const getGameCoords = (viewX: number, viewY: number) => {
        const canvasTopLeft = { x: viewportRect.left + position.x, y: viewportRect.top + position.y };

        const canvasRelativeX = (viewX - canvasTopLeft.x) / scale;
        const canvasRelativeY = (viewY - canvasTopLeft.y) / scale;
        
        const gridRelativeX = canvasRelativeX - HEADER_SIZE_PX;
        const gridRelativeY = canvasRelativeY - HEADER_SIZE_PX;
        
        const colIndex = Math.floor(gridRelativeX / CELL_SIZE_PX);
        const rowIndex = Math.floor(gridRelativeY / CELL_SIZE_PX);

        return {
            x: minX + colIndex,
            y: maxY - rowIndex,
        };
    };
    
    const topLeft = getGameCoords(viewportRect.left, viewportRect.top);
    const bottomRight = getGameCoords(viewportRect.right, viewportRect.bottom);
    
    const clampedTopLeftX = Math.max(minX, Math.min(maxX, topLeft.x));
    const clampedTopLeftY = Math.max(minY, Math.min(maxY, topLeft.y));
    const clampedBottomRightX = Math.max(minX, Math.min(maxX, bottomRight.x));
    const clampedBottomRightY = Math.max(minY, Math.min(maxY, bottomRight.y));
    
    if (clampedTopLeftX > clampedBottomRightX || clampedTopLeftY < clampedBottomRightY) {
         onVisibleCoordsChange('範囲外');
         return;
    }

    const coordString = `(X: ${clampedTopLeftX} - ${clampedBottomRightX}, Y: ${clampedBottomRightY} - ${clampedTopLeftY})`;
    onVisibleCoordsChange(coordString);

  }, [scale, position, gridDimensions, onVisibleCoordsChange, minX, maxX, minY, maxY]);


  useEffect(() => {
    updateVisibleCoords();
  }, [updateVisibleCoords]);

  const getCoordsFromDropEvent = useCallback((e: React.DragEvent<HTMLDivElement>): Coordinates | null => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridRelativeX = mouseX - (HEADER_SIZE_PX * scale);
    const gridRelativeY = mouseY - (HEADER_SIZE_PX * scale);
    
    if (gridRelativeX < 0 || gridRelativeY < 0) return null;

    const colIndex = Math.floor(gridRelativeX / (CELL_SIZE_PX * scale));
    const rowIndex = Math.floor(gridRelativeY / (CELL_SIZE_PX * scale));

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

    const target = e.target as HTMLElement;
    if (target.closest('[draggable="true"]')) return;
    
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

  const getTouchDistance = (touches: React.TouchList) => {
    // FIX: Access TouchList items by index as it is not a true array and cannot be destructured.
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[draggable="true"]') || target.closest('button')) return;
    e.preventDefault();
    
    if (e.touches.length === 2) {
      setIsDraggingMap(false);
      pinchStartDistance.current = getTouchDistance(e.touches);
      pinchStartScale.current = scale;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDraggingMap(true);
      startDragPos.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      if (mapRef.current) mapRef.current.style.cursor = 'grabbing';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchStartDistance.current !== null) {
      const newDist = getTouchDistance(e.touches);
      const scaleMultiplier = newDist / pinchStartDistance.current;
      const newScale = Math.min(Math.max(0.1, pinchStartScale.current * scaleMultiplier), 2.5);
      setScale(newScale);
    } else if (e.touches.length === 1 && isDraggingMap) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - startDragPos.current.x,
        y: touch.clientY - startDragPos.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingMap(false);
    pinchStartDistance.current = null;
    if (mapRef.current) mapRef.current.style.cursor = 'grab';
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
      const count = axis === 'x' ? gridWidth : gridHeight;
      for (let i = 0; i < count; i++) {
        const value = axis === 'x' ? minX + i : maxY - i;
        labels.push(
            <div 
              key={i} 
              className="flex-shrink-0 flex items-center justify-center text-xs text-gray-400" 
              style={{
                width: axis === 'x' ? `${CELL_SIZE_PX}px` : '100%',
                height: axis === 'y' ? `${CELL_SIZE_PX}px` : '100%',
              }}
            >
                {value}
            </div>
        );
      }
      return labels;
  };

  return (
    <div 
      className="flex-1 w-full h-full overflow-hidden bg-gray-800 relative select-none cursor-grab touch-none" 
      ref={mapRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        id="map-canvas-for-export"
        className="relative"
        style={{
          width: `${(gridWidth * CELL_SIZE_PX) + HEADER_SIZE_PX}px`,
          height: `${(gridHeight * CELL_SIZE_PX) + HEADER_SIZE_PX}px`,
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="absolute top-0 left-0 w-[30px] h-[30px] bg-gray-900 z-20"></div>
        <div className="absolute top-0 left-[30px] flex bg-gray-900/80 backdrop-blur-sm z-10" style={{ width: `${gridWidth * CELL_SIZE_PX}px`, height: `${HEADER_SIZE_PX}px` }}>
          {renderCoordinateLabels('x')}
        </div>
        <div className="absolute top-[30px] left-0 flex flex-col bg-gray-900/80 backdrop-blur-sm z-10" style={{ width: `${HEADER_SIZE_PX}px`, height: `${gridHeight * CELL_SIZE_PX}px` }}>
          {renderCoordinateLabels('y')}
        </div>

        <div
            className="absolute bg-gray-800 grid"
            style={{
                top: `${HEADER_SIZE_PX}px`,
                left: `${HEADER_SIZE_PX}px`,
                gridTemplateColumns: `repeat(${gridWidth}, ${CELL_SIZE_PX}px)`,
                gridTemplateRows: `repeat(${gridHeight}, ${CELL_SIZE_PX}px)`,
                width: `${gridWidth * CELL_SIZE_PX}px`,
                height: `${gridHeight * CELL_SIZE_PX}px`,
            }}
        >
          {renderGrid()}
          {placedZones.map(zone => (
              <div 
                  key={zone.id} 
                  draggable
                  onDragStart={(e) => handleZoneDragStart(e, zone.id)}
                  className="absolute group cursor-move" 
                  style={{ 
                      left: (zone.coords.x - minX) * CELL_SIZE_PX, 
                      top: (maxY - zone.coords.y) * CELL_SIZE_PX, 
                      width: zone.width * CELL_SIZE_PX, 
                      height: zone.height * CELL_SIZE_PX,
                      zIndex: 5
                  }}
              >
                  <div className="w-full h-full" style={{backgroundColor: zone.bgColor, border: `2px solid ${zone.borderColor}`}}></div>
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-lg text-white" style={{textShadow: '0 0 5px black', pointerEvents: 'none'}}>{zone.label}</span>
                  <button onClick={() => removePlacedZone(zone.id)} className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none" aria-label={`Remove zone ${zone.label}`}>&times;</button>
              </div>
          ))}
          {bases.map(base => {
              const borderColor = base.member.role?.color || '#06b6d4';
              return (
                  <div
                      key={base.id}
                      draggable
                      onDragStart={(e) => handleBaseDragStart(e, base.id)}
                      className="absolute flex flex-col items-center justify-center p-1 group cursor-move rounded"
                      style={{
                          left: `${(base.coords.x - 1 - minX) * CELL_SIZE_PX}px`,
                          top: `${(maxY - base.coords.y - 1) * CELL_SIZE_PX}px`,
                          width: `${CELL_SIZE_PX * 3}px`,
                          height: `${CELL_SIZE_PX * 3}px`,
                          backgroundColor: 'rgba(0, 20, 30, 0.4)',
                          border: `2px solid ${borderColor}`,
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
                      <button onClick={() => removeBase(base.id)} className="absolute -top-2.5 -right-2.5 w-5 h-5 flex items-center justify-center bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none z-10" aria-label={`Remove base for ${base.member.name}`}>&times;</button>
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
                  <span className="text-xs text-center text-white bg-black/50 rounded px-1 mt-1 truncate max-w-full">{marker.label}</span>
                  <button onClick={() => removeMarker(marker.id)} className="absolute top-0 right-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-lg">&times;</button>
              </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm p-2 rounded-lg text-xs pointer-events-none z-20">
          <p>Zoom: {Math.round(scale * 100)}%</p>
          <p className="text-gray-400">Scroll/Pinch to zoom, Drag to pan</p>
      </div>
    </div>
  );
};

export default MapView;

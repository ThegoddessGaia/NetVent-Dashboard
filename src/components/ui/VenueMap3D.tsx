import { useState, useMemo } from 'react';
import { generateMockVenueZones, type VenueZone3D } from '../../lib/mockData';
import { Users, Layers, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface VenueMap3DProps {
  eventId?: string;
}

export default function VenueMap3D({ eventId: _eventId }: VenueMap3DProps) {
  const zones = useMemo(() => generateMockVenueZones(), []);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedZone, setSelectedZone] = useState<VenueZone3D | null>(null);
  const [viewAngle, setViewAngle] = useState(30);
  const [zoom, setZoom] = useState(1);

  const floorZones = zones.filter(z => z.floor === selectedFloor);
  const floors = [...new Set(zones.map(z => z.floor))].sort();
  const totalOccupancy = zones.reduce((sum, z) => sum + z.currentOccupancy, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);

  const getOccupancyColor = (zone: VenueZone3D) => {
    const ratio = zone.currentOccupancy / zone.capacity;
    if (ratio > 0.9) return '#ef4444';
    if (ratio > 0.7) return '#f59e0b';
    return zone.color;
  };

  const getOccupancyPercent = (zone: VenueZone3D) => {
    return Math.round((zone.currentOccupancy / zone.capacity) * 100);
  };

  return (
    <div className="venue-map-3d">
      {/* Controls */}
      <div className="vm3d-controls">
        <div className="vm3d-floor-selector">
          {floors.map((floor) => (
            <button
              key={floor}
              className={`vm3d-floor-btn ${selectedFloor === floor ? 'active' : ''}`}
              onClick={() => setSelectedFloor(floor)}
            >
              <Layers size={14} />
              Floor {floor}
            </button>
          ))}
        </div>

        <div className="vm3d-view-controls">
          <button 
            className="vm3d-ctrl-btn" 
            onClick={() => setViewAngle(v => Math.max(0, v - 10))}
            title="Flatten view"
          >
            <RotateCcw size={14} />
          </button>
          <span className="vm3d-angle-label">{viewAngle}°</span>
          <button 
            className="vm3d-ctrl-btn" 
            onClick={() => setViewAngle(v => Math.min(60, v + 10))}
            title="Increase perspective"
          >
            <Maximize2 size={14} />
          </button>
          <div className="vm3d-divider" />
          <button 
            className="vm3d-ctrl-btn" 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            className="vm3d-ctrl-btn" 
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div className="vm3d-occupancy-total">
          <Users size={14} />
          <span>{totalOccupancy.toLocaleString()} / {totalCapacity.toLocaleString()}</span>
          <span className="vm3d-percent">({Math.round((totalOccupancy / totalCapacity) * 100)}%)</span>
        </div>
      </div>

      {/* 3D Map Area */}
      <div className="vm3d-canvas" style={{ perspective: '800px' }}>
        <div 
          className="vm3d-stage"
          style={{ 
            transform: `rotateX(${viewAngle}deg) scale(${zoom})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Grid lines */}
          <div className="vm3d-grid">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={`h-${i}`} className="vm3d-grid-line vm3d-grid-h" style={{ top: `${i * 10}%` }} />
            ))}
            {Array.from({ length: 11 }, (_, i) => (
              <div key={`v-${i}`} className="vm3d-grid-line vm3d-grid-v" style={{ left: `${i * 10}%` }} />
            ))}
          </div>

          {/* Zone blocks */}
          {floorZones.map((zone) => {
            const occupancyPercent = getOccupancyPercent(zone);
            const isSelected = selectedZone?.id === zone.id;
            const fillColor = getOccupancyColor(zone);
            
            return (
              <div
                key={zone.id}
                className={`vm3d-zone ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  '--zone-color': fillColor,
                  '--zone-height': `${Math.max(8, occupancyPercent * 0.6)}px`,
                } as React.CSSProperties}
                onClick={() => setSelectedZone(isSelected ? null : zone)}
              >
                <div className="vm3d-zone-top" style={{ backgroundColor: fillColor }}>
                  <span className="vm3d-zone-name">{zone.name}</span>
                  <span className="vm3d-zone-count">
                    <Users size={10} />
                    {zone.currentOccupancy}
                  </span>
                </div>
                <div className="vm3d-zone-front" style={{ backgroundColor: fillColor, height: 'var(--zone-height)' }} />
                <div className="vm3d-zone-right" style={{ backgroundColor: fillColor, height: 'var(--zone-height)' }} />
                
                {/* Occupancy bar inside zone */}
                <div className="vm3d-zone-bar">
                  <div 
                    className="vm3d-zone-bar-fill" 
                    style={{ width: `${occupancyPercent}%`, backgroundColor: fillColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Zone Details */}
      {selectedZone && (
        <div className="vm3d-detail-panel">
          <div className="vm3d-detail-header">
            <h4>{selectedZone.name}</h4>
            <span className={`vm3d-zone-type type-${selectedZone.type}`}>{selectedZone.type}</span>
          </div>
          <div className="vm3d-detail-stats">
            <div className="vm3d-detail-stat">
              <span className="label">Occupancy</span>
              <span className="value">{selectedZone.currentOccupancy} / {selectedZone.capacity}</span>
            </div>
            <div className="vm3d-detail-stat">
              <span className="label">Utilization</span>
              <span className="value">{getOccupancyPercent(selectedZone)}%</span>
            </div>
            <div className="vm3d-detail-stat">
              <span className="label">Floor</span>
              <span className="value">{selectedZone.floor}</span>
            </div>
            <div className="vm3d-detail-stat">
              <span className="label">Status</span>
              <span className={`value ${getOccupancyPercent(selectedZone) > 90 ? 'danger' : getOccupancyPercent(selectedZone) > 70 ? 'warning' : 'ok'}`}>
                {getOccupancyPercent(selectedZone) > 90 ? 'Near Capacity' : getOccupancyPercent(selectedZone) > 70 ? 'Busy' : 'Normal'}
              </span>
            </div>
          </div>
          <div className="vm3d-detail-bar">
            <div 
              className="vm3d-detail-bar-fill" 
              style={{ 
                width: `${getOccupancyPercent(selectedZone)}%`,
                backgroundColor: getOccupancyColor(selectedZone) 
              }} 
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="vm3d-legend">
        <div className="vm3d-legend-item">
          <span className="vm3d-legend-dot" style={{ backgroundColor: '#10b981' }} />
          <span>Normal (&lt;70%)</span>
        </div>
        <div className="vm3d-legend-item">
          <span className="vm3d-legend-dot" style={{ backgroundColor: '#f59e0b' }} />
          <span>Busy (70-90%)</span>
        </div>
        <div className="vm3d-legend-item">
          <span className="vm3d-legend-dot" style={{ backgroundColor: '#ef4444' }} />
          <span>Near Capacity (&gt;90%)</span>
        </div>
      </div>
    </div>
  );
}

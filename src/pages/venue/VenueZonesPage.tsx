import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { supabase } from '../../lib/supabase';
import {
  ChevronDown,
  Search,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

type AreaShape = {
  id: string;
  area: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type AreaLiveStats = {
  totalAssigned: number;
  currentlyInside: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeShapes = (raw: unknown): AreaShape[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any) => ({
      id: typeof item?.id === 'string' ? item.id : `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      area: typeof item?.area === 'string' ? item.area : 'Unassigned',
      x: typeof item?.x === 'number' ? clamp(item.x, 0, 100) : 40,
      y: typeof item?.y === 'number' ? clamp(item.y, 0, 100) : 40,
      width: typeof item?.width === 'number' ? clamp(item.width, 4, 60) : 16,
      height: typeof item?.height === 'number' ? clamp(item.height, 4, 60) : 10,
    }))
    .filter((shape) => shape.area);
};

export default function VenueZonesPage() {
  const { user } = useAuthStore();
  const { events, fetchEvents, updateEvent } = useEventStore();

  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [venueAreas, setVenueAreas] = useState<string[]>([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [areaShapes, setAreaShapes] = useState<AreaShape[]>([]);
  const [selectedAreaForPlacement, setSelectedAreaForPlacement] = useState<string>('');
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const [mapImageUrlInput, setMapImageUrlInput] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [registrationsSnapshot, setRegistrationsSnapshot] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      void fetchEvents(user.id);
    }
  }, [user?.id, fetchEvents]);

  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0].id);
    }
  }, [events, selectedEvent]);

  const selectedEventRecord = useMemo(
    () => events.find((event) => event.id === selectedEvent) || null,
    [events, selectedEvent]
  );

  useEffect(() => {
    if (!selectedEventRecord) {
      setVenueAreas([]);
      setAreaShapes([]);
      setSelectedAreaForPlacement('');
      return;
    }

    const areas = (selectedEventRecord.venue_areas || []).filter(Boolean);
    setVenueAreas(areas);

    const normalizedShapes = normalizeShapes((selectedEventRecord as any).venue_area_shapes);
    setAreaShapes(normalizedShapes);

    if (areas.length > 0) {
      setSelectedAreaForPlacement((current) => current || areas[0]);
    } else {
      setSelectedAreaForPlacement('');
    }

    setMapImageUrlInput((selectedEventRecord as any).venue_map_url || '');

    setSelectedShapeId(null);
    setSaveMessage(null);
  }, [selectedEventRecord]);

  useEffect(() => {
    const loadRegistrations = async () => {
      if (!selectedEvent) {
        setRegistrationsSnapshot([]);
        return;
      }

      const { data } = await supabase
        .from('registrations')
        .select('assigned_zone, checked_in_at, checked_out_at, status')
        .eq('event_id', selectedEvent)
        .eq('status', 'registered');

      setRegistrationsSnapshot(data || []);
    };

    void loadRegistrations();
  }, [selectedEvent]);

  const mapImageUrl = mapImageUrlInput || null;

  const filteredAreas = venueAreas.filter((area) =>
    area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const areaStats = useMemo(() => {
    const stats: Record<string, AreaLiveStats> = {};

    for (const area of venueAreas) {
      stats[area] = { totalAssigned: 0, currentlyInside: 0 };
    }

    registrationsSnapshot.forEach((registration) => {
      const area = registration.assigned_zone as string | null;
      if (!area || !stats[area]) return;

      stats[area].totalAssigned += 1;

      const isInside = !!registration.checked_in_at && !registration.checked_out_at;
      if (isInside) {
        stats[area].currentlyInside += 1;
      }
    });

    return stats;
  }, [registrationsSnapshot, venueAreas]);

  const addArea = () => {
    const normalized = newAreaName.trim();
    if (!normalized) return;

    const alreadyExists = venueAreas.some((area) => area.toLowerCase() === normalized.toLowerCase());
    if (alreadyExists) {
      setSaveMessage('Area already exists.');
      return;
    }

    const next = [...venueAreas, normalized];
    setVenueAreas(next);
    setNewAreaName('');
    if (!selectedAreaForPlacement) setSelectedAreaForPlacement(normalized);
    setSaveMessage(null);
  };

  const removeArea = (areaName: string) => {
    const nextAreas = venueAreas.filter((area) => area !== areaName);
    setVenueAreas(nextAreas);
    setAreaShapes((prev) => prev.filter((shape) => shape.area !== areaName));

    if (selectedAreaForPlacement === areaName) {
      setSelectedAreaForPlacement(nextAreas[0] || '');
    }

    if (selectedShapeId) {
      const stillExists = areaShapes.some((shape) => shape.id === selectedShapeId && shape.area !== areaName);
      if (!stillExists) setSelectedShapeId(null);
    }
  };

  const handleMapClickToAddShape = (e: MouseEvent<HTMLDivElement>) => {
    // Strict validation: area must be selected AND exist in venueAreas list
    if (!selectedAreaForPlacement || !venueAreas.includes(selectedAreaForPlacement)) {
      setSaveMessage('❌ Please define and select a venue area first in Step 2.');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = clamp(((e.clientX - rect.left) / rect.width) * 100, 4, 96);
    const yPercent = clamp(((e.clientY - rect.top) / rect.height) * 100, 4, 96);

    // Check if a shape already exists for this area
    const existingShape = areaShapes.find((shape) => shape.area === selectedAreaForPlacement);

    if (existingShape) {
      // Move existing shape instead of creating duplicate
      setAreaShapes((prev) =>
        prev.map((shape) =>
          shape.id === existingShape.id
            ? { ...shape, x: xPercent, y: yPercent }
            : shape
        )
      );
      setSelectedShapeId(existingShape.id);
      setSaveMessage(`✓ Moved "${selectedAreaForPlacement}" marker to new position.`);
    } else {
      // Create new shape if none exists for this area
      const newShape: AreaShape = {
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        area: selectedAreaForPlacement,
        x: xPercent,
        y: yPercent,
        width: 16,
        height: 10,
      };
      setAreaShapes((prev) => [...prev, newShape]);
      setSelectedShapeId(newShape.id);
      setSaveMessage(`✓ Placed "${selectedAreaForPlacement}" on map.`);
    }
  };

  const selectedShape = areaShapes.find((shape) => shape.id === selectedShapeId) || null;

  const updateSelectedShape = (updates: Partial<AreaShape>) => {
    if (!selectedShapeId) return;

    setAreaShapes((prev) =>
      prev.map((shape) => {
        if (shape.id !== selectedShapeId) return shape;
        return {
          ...shape,
          ...updates,
          x: clamp(updates.x ?? shape.x, 0, 100),
          y: clamp(updates.y ?? shape.y, 0, 100),
          width: clamp(updates.width ?? shape.width, 4, 60),
          height: clamp(updates.height ?? shape.height, 4, 60),
        };
      })
    );
  };

  const removeSelectedShape = () => {
    if (!selectedShapeId) return;
    setAreaShapes((prev) => prev.filter((shape) => shape.id !== selectedShapeId));
    setSelectedShapeId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEvent || !user?.id) return;

    setUploadingImage(true);
    setSaveMessage(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${selectedEvent}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('venue-maps')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('venue-maps')
        .getPublicUrl(data.path);

      setMapImageUrlInput(urlData.publicUrl);
      setSaveMessage('Image uploaded. Remember to save your venue setup.');

    } catch (error: any) {
      console.error('Upload failed:', error);
      setSaveMessage('Failed to upload image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const saveVenueSetup = async () => {
    if (!selectedEvent) return;

    setIsSaving(true);
    setSaveMessage(null);

    const success = await updateEvent(selectedEvent, {
      venue_map_url: mapImageUrlInput,
      venue_areas: venueAreas,
      venue_area_shapes: areaShapes as any,
    } as any);

    setIsSaving(false);

    if (success) {
      setSaveMessage('Venue setup saved.');
      if (user?.id) {
        void fetchEvents(user.id);
      }
    } else {
      setSaveMessage('Failed to save venue setup.');
    }
  };

  return (
    <div className="venue-page">
      <div className="page-header">
        <div className="page-header-content">
          <h2>Venue & Areas</h2>
          <p>Real event venue map, area list, and image-based area shape assignment.</p>
        </div>
        <div className="event-selector">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            title="Select event"
          >
            <option value="">Select Event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
          <ChevronDown size={16} />
        </div>
      </div>

      {!selectedEventRecord ? (
        <div className="empty-state">
          <p>Select an event to manage venue map and areas.</p>
        </div>
      ) : (
        <div className="venue-dashboard-container">
          {/* STEP 1: Upload Venue Map */}
          <div className="venue-setup-section">
            <div className="venue-setup-step">
              <div className="step-indicator">1</div>
              <div className="step-content">
                <h5>Upload Venue Map</h5>
                <p className="step-description">Upload or provide the URL of your venue floor plan</p>
              </div>
            </div>

            <div className="map-upload-container">
              <div className="map-upload-methods">
                <div className="upload-method">
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>
                    Upload Image File
                  </label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    style={{ width: '100%' }}
                  />
                  {uploadingImage && <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--primary)' }}>⏳ Uploading image...</p>}
                </div>

                <div className="upload-method" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>
                    Or Paste Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/map.jpg"
                    value={mapImageUrlInput}
                    onChange={(e) => setMapImageUrlInput(e.target.value)}
                    disabled={uploadingImage}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border-default)', borderRadius: '6px', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Define Venue Areas */}
          <div className="venue-setup-section">
            <div className="venue-setup-step">
              <div className="step-indicator">2</div>
              <div className="step-content">
                <h5>Define Venue Areas</h5>
                <p className="step-description">Create or manage zones in your venue</p>
              </div>
            </div>

            <div className="areas-management-container">
              <div className="area-input-section">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search areas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="venue-area-add-row">
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="Add new area (e.g., Main Hall, VIP Lounge)"
                    onKeyPress={(e) => e.key === 'Enter' && addArea()}
                  />
                  <button type="button" className="btn btn-primary" onClick={addArea}>
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>

              <div className="venue-area-list">
                {filteredAreas.map((area) => {
                  const stats = areaStats[area] || { totalAssigned: 0, currentlyInside: 0 };
                  const isSelectedForPlacement = selectedAreaForPlacement === area;
                  const isPlacedOnMap = areaShapes.some((shape) => shape.area === area);
                  return (
                    <div key={area} className={`venue-area-item ${isSelectedForPlacement ? 'selected' : ''}`}>
                      <button
                        type="button"
                        className="venue-area-select"
                        onClick={() => setSelectedAreaForPlacement(area)}
                      >
                        <span className="venue-area-title">
                          {area}
                          {isPlacedOnMap && <span style={{ marginLeft: '0.5rem', color: '#10b981', fontSize: '0.75rem' }}>✓ Placed</span>}
                        </span>
                        <span className="venue-area-stats">
                          👥 {stats.totalAssigned} assigned · 📍 {stats.currentlyInside} inside
                        </span>
                      </button>
                      <button
                        type="button"
                        className="venue-area-remove"
                        onClick={() => removeArea(area)}
                        title="Remove area"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
                {filteredAreas.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {searchQuery ? 'No areas match your search' : 'No venue areas yet. Add one above.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: Map Areas on Floor Plan - Only show when BOTH map AND areas are defined */}
          {mapImageUrl && venueAreas.length > 0 && (
            <div className="venue-setup-section">
              <div className="venue-setup-step">
                <div className="step-indicator">3</div>
                <div className="step-content">
                  <h5>Map Areas on Floor Plan</h5>
                  <p className="step-description">Click an area below, then click on the map to place it</p>
                </div>
              </div>

              <div className="simple-mapping-workflow">
                {/* Buttons and Map in Same Row */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', width: '100%' }}>
                  {/* Areas to Place */}
                  <div className="areas-to-place">
                    <h6 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      📍 Click an area to place:
                    </h6>
                    <div className="place-area-buttons">
                      {venueAreas.map((area) => {
                        const isPlaced = areaShapes.some((shape) => shape.area === area);
                        const isSelected = selectedAreaForPlacement === area;
                        return (
                          <button
                            key={area}
                            type="button"
                            className={`place-area-btn ${isSelected ? 'active' : ''} ${isPlaced ? 'placed' : ''}`}
                            onClick={() => setSelectedAreaForPlacement(area)}
                            disabled={isPlaced}
                          >
                            {isPlaced ? '✓' : '+'} {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Map and Instruction */}
                  <div className="map-and-instruction">
                  {selectedAreaForPlacement && !areaShapes.some((s) => s.area === selectedAreaForPlacement) ? (
                    <div className="placement-instruction">
                      👇 Click on the map to place <strong>{selectedAreaForPlacement}</strong>
                    </div>
                  ) : null}
                  
                  <div className="venue-live-map simple-map" onClick={handleMapClickToAddShape}>
                    <img src={mapImageUrl} alt="Event venue map" className="venue-live-map-image" />
                    <div className="venue-live-overlay">
                      {areaShapes.map((shape) => (
                        <button
                          type="button"
                          key={shape.id}
                          className={`venue-shape ${selectedShapeId === shape.id ? 'active' : ''}`}
                          style={{
                            left: `${shape.x}%`,
                            top: `${shape.y}%`,
                            width: `${shape.width}%`,
                            height: `${shape.height}%`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShapeId(shape.id);
                            setSelectedAreaForPlacement(shape.area);
                          }}
                          title={`${shape.area} area - click to edit`}
                        >
                          <span>{shape.area}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                </div>

                {/* Edit Controls */}
                {selectedShape && (
                  <div className="shape-edit-controls-inline">
                    <h6 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ✏️ Adjust "{selectedShape.area}"
                    </h6>

                    <div className="inline-controls-grid">
                      <div className="control-group">
                        <label htmlFor="shape-x-dashboard">
                          Horizontal: <strong>{Math.round(selectedShape.x)}%</strong>
                        </label>
                        <input
                          id="shape-x-dashboard"
                          type="range"
                          min={0}
                          max={100}
                          value={selectedShape.x}
                          onChange={(e) => updateSelectedShape({ x: Number(e.target.value) })}
                        />
                      </div>

                      <div className="control-group">
                        <label htmlFor="shape-y-dashboard">
                          Vertical: <strong>{Math.round(selectedShape.y)}%</strong>
                        </label>
                        <input
                          id="shape-y-dashboard"
                          type="range"
                          min={0}
                          max={100}
                          value={selectedShape.y}
                          onChange={(e) => updateSelectedShape({ y: Number(e.target.value) })}
                        />
                      </div>

                      <div className="control-group">
                        <label htmlFor="shape-width-dashboard">
                          Width: <strong>{Math.round(selectedShape.width)}%</strong>
                        </label>
                        <input
                          id="shape-width-dashboard"
                          type="range"
                          min={4}
                          max={60}
                          value={selectedShape.width}
                          onChange={(e) => updateSelectedShape({ width: Number(e.target.value) })}
                        />
                      </div>

                      <div className="control-group">
                        <label htmlFor="shape-height-dashboard">
                          Height: <strong>{Math.round(selectedShape.height)}%</strong>
                        </label>
                        <input
                          id="shape-height-dashboard"
                          type="range"
                          min={4}
                          max={60}
                          value={selectedShape.height}
                          onChange={(e) => updateSelectedShape({ height: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={removeSelectedShape}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save Section */}
          <div className="venue-save-section">
            <button type="button" className="btn btn-primary" onClick={saveVenueSetup} disabled={isSaving || !selectedEvent}>
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </button>
            {saveMessage && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: saveMessage.includes('Failed') ? '#dc2626' : '#16a34a' }}>
                {saveMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

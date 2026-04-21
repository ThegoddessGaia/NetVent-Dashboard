import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Crosshair, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom venue marker icon
const venueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  venueName: string;
  venueAddress: string;
  onLocationChange: (data: {
    latitude: number;
    longitude: number;
    venue_name: string;
    venue_address: string;
  }) => void;
  onRadiusChange: (radius: number) => void;
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  radiusMeters,
  venueName,
  venueAddress,
  onLocationChange,
  onRadiusChange,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Default center (can be set to a default location like Istanbul)
  const defaultCenter: [number, number] = [41.0082, 28.9784]; // Istanbul
  const center: [number, number] = latitude && longitude ? [latitude, longitude] : defaultCenter;
  const hasLocation = latitude !== 0 && longitude !== 0;

  // Debounced search function
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setSearchResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  // Handle search result selection
  const handleResultSelect = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.name || result.display_name.split(',')[0];
    const address = result.display_name;

    onLocationChange({
      latitude: lat,
      longitude: lng,
      venue_name: name,
      venue_address: address,
    });

    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  // Handle map click to select location
  const handleMapClick = async (lat: number, lng: number) => {
    try {
      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      
      const name = data.name || data.address?.amenity || data.address?.building || 'Selected Location';
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      onLocationChange({
        latitude: lat,
        longitude: lng,
        venue_name: name,
        venue_address: address,
      });
    } catch (error) {
      console.error('Reverse geocode error:', error);
      onLocationChange({
        latitude: lat,
        longitude: lng,
        venue_name: 'Selected Location',
        venue_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        await handleMapClick(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enable location services.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="location-picker">
      <div className="location-picker-search">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search for a venue or address..."
            className="location-search-input"
          />
          {isSearching && <Loader2 size={18} className="spinner search-spinner" />}
        </div>
        
        {showResults && searchResults.length > 0 && (
          <div className="search-results-dropdown">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                className="search-result-item"
                onClick={() => handleResultSelect(result)}
              >
                <MapPin size={16} />
                <div className="result-content">
                  <span className="result-name">{result.name || result.display_name.split(',')[0]}</span>
                  <span className="result-address">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="location-picker-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={getCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 size={16} className="spinner" />
          ) : (
            <Crosshair size={16} />
          )}
          Use My Location
        </button>
      </div>

      <div className="map-container-wrapper">
        <MapContainer
          center={center}
          zoom={hasLocation ? 15 : 12}
          className="location-map"
          style={{ height: '350px', width: '100%', borderRadius: '8px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <RecenterMap lat={latitude} lng={longitude} />
          
          {hasLocation && (
            <>
              <Marker position={[latitude, longitude]} icon={venueIcon} />
              <Circle
                center={[latitude, longitude]}
                radius={radiusMeters}
                pathOptions={{
                  color: '#4654A1',
                  fillColor: '#4654A1',
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              />
            </>
          )}
        </MapContainer>
        
        <p className="map-hint">Click on the map to select a location, or search above</p>
      </div>

      {hasLocation && (
        <div className="selected-location-info">
          <div className="location-details">
            <div className="location-detail-row">
              <label>Venue Name:</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => onLocationChange({
                  latitude,
                  longitude,
                  venue_name: e.target.value,
                  venue_address: venueAddress,
                })}
                placeholder="Enter venue name"
                className="location-input"
              />
            </div>
            <div className="location-detail-row">
              <label>Address:</label>
              <input
                type="text"
                value={venueAddress}
                onChange={(e) => onLocationChange({
                  latitude,
                  longitude,
                  venue_name: venueName,
                  venue_address: e.target.value,
                })}
                placeholder="Enter address"
                className="location-input"
              />
            </div>
            <div className="location-coordinates">
              <span>Lat: {latitude.toFixed(6)}</span>
              <span>Lng: {longitude.toFixed(6)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="radius-control">
        <label htmlFor="radius_meters">
          Geofence Radius: <span className="radius-value">{radiusMeters}m</span>
        </label>
        <input
          type="range"
          id="radius_meters"
          value={radiusMeters}
          onChange={(e) => onRadiusChange(parseInt(e.target.value))}
          min="50"
          max="500"
          step="10"
        />
        <div className="radius-labels">
          <span>50m</span>
          <span>500m</span>
        </div>
      </div>
    </div>
  );
}

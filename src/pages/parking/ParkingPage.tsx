import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import {
  ChevronDown,
  Car,
  CircleParking,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ParkingZone {
  id: string;
  name: string;
  type: 'general' | 'vip' | 'staff' | 'accessible';
  occupied: number;
  capacity: number;
  status: 'available' | 'filling' | 'full';
}

export default function ParkingPage() {
  const { user } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      fetchEvents(user.id);
    }
  }, [user?.id, fetchEvents]);

  // Parking zones
  const parkingZones: ParkingZone[] = useMemo(() => [
    { id: '1', name: 'Lot A - General', type: 'general', occupied: 245, capacity: 300, status: 'filling' },
    { id: '2', name: 'Lot B - General', type: 'general', occupied: 180, capacity: 250, status: 'available' },
    { id: '3', name: 'VIP Parking', type: 'vip', occupied: 48, capacity: 50, status: 'full' },
    { id: '4', name: 'Staff Parking', type: 'staff', occupied: 35, capacity: 60, status: 'available' },
    { id: '5', name: 'Accessible Parking', type: 'accessible', occupied: 12, capacity: 20, status: 'available' },
    { id: '6', name: 'Lot C - Overflow', type: 'general', occupied: 0, capacity: 200, status: 'available' },
  ], []);

  // Stats
  const stats = useMemo(() => {
    const totalCapacity = parkingZones.reduce((sum, z) => sum + z.capacity, 0);
    const totalOccupied = parkingZones.reduce((sum, z) => sum + z.occupied, 0);
    return {
      totalSpaces: totalCapacity,
      occupied: totalOccupied,
      available: totalCapacity - totalOccupied,
      occupancyRate: Math.round((totalOccupied / totalCapacity) * 100),
      peakHour: '10:00 AM - 11:00 AM',
      avgDuration: '4.5 hours',
    };
  }, [parkingZones]);

  // Hourly occupancy chart data
  const hourlyData = useMemo(() => {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
    return hours.map((time, i) => ({
      time,
      occupancy: Math.floor(200 + Math.random() * 300 + Math.sin(i * 0.5) * 150),
    }));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'full': return '#EF4444';
      case 'filling': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const getOccupancyPercentage = (zone: ParkingZone) => {
    return Math.round((zone.occupied / zone.capacity) * 100);
  };

  return (
    <div className="parking-page">
      <div className="page-header">
        <div className="page-header-content">
          <h2>Parking Management</h2>
          <p>Monitor parking availability and traffic flow</p>
        </div>
        <div className="event-selector">
          <select 
            value={selectedEvent} 
            onChange={(e) => setSelectedEvent(e.target.value)}
            title="Select event"
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
          <ChevronDown size={16} />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="parking-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <CircleParking size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalSpaces.toLocaleString()}</span>
            <span className="stat-label">Total Spaces</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon occupied">
            <Car size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.occupied.toLocaleString()}</span>
            <span className="stat-label">Occupied</span>
            <span className="stat-trend positive">
              <TrendingUp size={14} />
              {stats.occupancyRate}% occupancy
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon available">
            <CircleParking size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.available.toLocaleString()}</span>
            <span className="stat-label">Available</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon time">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.avgDuration}</span>
            <span className="stat-label">Avg. Duration</span>
          </div>
        </div>
      </div>

      <div className="parking-layout">
        {/* Parking Zones */}
        <div className="zones-section">
          <div className="section-card">
            <h3>Parking Zones</h3>
            <div className="parking-zones-list">
              {parkingZones.map(zone => (
                <div key={zone.id} className={`parking-zone-card ${zone.status}`}>
                  <div className="zone-header">
                    <div className="zone-info">
                      <span className="zone-name">{zone.name}</span>
                      <span className={`zone-type ${zone.type}`}>{zone.type}</span>
                    </div>
                    <span className={`zone-status ${zone.status}`}>
                      {zone.status === 'full' && <AlertTriangle size={14} />}
                      {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                    </span>
                  </div>
                  <div className="zone-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${getOccupancyPercentage(zone)}%`,
                          backgroundColor: getStatusColor(zone.status)
                        }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      <span>{zone.occupied} / {zone.capacity}</span>
                      <span>{getOccupancyPercentage(zone)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts & Visualization */}
        <div className="charts-section">
          <div className="section-card">
            <h3>Hourly Occupancy</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="occupancy" fill="#4B3F91" radius={[4, 4, 0, 0]} name="Vehicles" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="section-card">
            <h3>Parking Map</h3>
            <div className="parking-map">
              <svg viewBox="0 0 400 300" className="parking-map-svg">
                {/* Background */}
                <rect x="0" y="0" width="400" height="300" fill="#f8f9fb" />
                
                {/* Roads */}
                <rect x="180" y="0" width="40" height="300" fill="#e5e7eb" />
                <rect x="0" y="130" width="400" height="40" fill="#e5e7eb" />
                
                {/* Lot A */}
                <rect x="20" y="20" width="140" height="100" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" rx="4" />
                <text x="90" y="60" textAnchor="middle" fill="#92400E" fontSize="12" fontWeight="600">Lot A</text>
                <text x="90" y="80" textAnchor="middle" fill="#92400E" fontSize="10">82% Full</text>
                
                {/* Lot B */}
                <rect x="240" y="20" width="140" height="100" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" rx="4" />
                <text x="310" y="60" textAnchor="middle" fill="#065F46" fontSize="12" fontWeight="600">Lot B</text>
                <text x="310" y="80" textAnchor="middle" fill="#065F46" fontSize="10">72% Full</text>
                
                {/* VIP */}
                <rect x="20" y="180" width="100" height="80" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" rx="4" />
                <text x="70" y="215" textAnchor="middle" fill="#991B1B" fontSize="12" fontWeight="600">VIP</text>
                <text x="70" y="235" textAnchor="middle" fill="#991B1B" fontSize="10">FULL</text>
                
                {/* Staff */}
                <rect x="130" y="180" width="80" height="80" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" rx="4" />
                <text x="170" y="215" textAnchor="middle" fill="#065F46" fontSize="11" fontWeight="600">Staff</text>
                <text x="170" y="235" textAnchor="middle" fill="#065F46" fontSize="10">58%</text>
                
                {/* Lot C */}
                <rect x="240" y="180" width="140" height="100" fill="#D1FAE5" stroke="#10B981" strokeWidth="2" rx="4" />
                <text x="310" y="220" textAnchor="middle" fill="#065F46" fontSize="12" fontWeight="600">Lot C</text>
                <text x="310" y="240" textAnchor="middle" fill="#065F46" fontSize="10">Available</text>
                
                {/* Entry/Exit */}
                <polygon points="200,280 190,300 210,300" fill="#10B981" />
                <polygon points="200,20 190,0 210,0" fill="#EF4444" />
              </svg>
            </div>
            <div className="map-legend">
              <span className="legend-item"><span className="dot available"></span> Available</span>
              <span className="legend-item"><span className="dot filling"></span> Filling</span>
              <span className="legend-item"><span className="dot full"></span> Full</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

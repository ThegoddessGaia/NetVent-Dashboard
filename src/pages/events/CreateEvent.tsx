import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { ArrowLeft, Upload, Calendar, Clock, Tag, Loader2, Plus, Trash2, MapPin, Users, Linkedin, Twitter, Globe, User, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import LocationPicker from '../../components/ui/LocationPicker';
import { getTargetAudienceOptions } from '../../lib/mockData';

const interestOptions = [
  'Technology', 'Business', 'Marketing', 'Design', 'Finance',
  'Healthcare', 'Education', 'Entertainment', 'Sports', 'Networking',
  'Startup', 'AI/ML', 'Web3', 'Sustainability', 'Career Development'
];

const defaultEventHighlights = [
  'World-class speakers and thought leaders',
  'Networking with 5000+ professionals',
  'Hands-on workshops and demos',
  'Exclusive attendee swag and resources',
];

// Sanitize filename - remove special characters
const sanitizeFilename = (filename: string): string => {
  // Get extension
  const ext = filename.split('.').pop() || '';
  // Remove extension, sanitize, and re-add extension
  const name = filename.replace(/\.[^/.]+$/, '');
  // Replace accented characters with their base versions
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Replace any non-alphanumeric characters (except dash and underscore) with underscore
  const sanitized = normalized.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitized}.${ext}`;
};

const availableZones = [
  'Main Stage', 'Exhibition Hall A', 'Exhibition Hall B', 'Workshop Room 1',
  'Workshop Room 2', 'VIP Lounge', 'Main Entrance', 'Food Court',
  'Sponsor Booths', 'Networking Area', 'Speaker Green Room', 'Press Room',
  'Backstage', 'All Zones'
];

// Local interface for agenda items form
interface LocalAgendaItem {
  id?: string;
  title: string;
  description: string;
  location_name: string;
  floor: string;
  x_position: number;
  y_position: number;
  start_time: string;
  end_time: string;
}

const toDateTimeInputValue = (dateValue: string | null | undefined) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const isWithinRange = (value: string, min: string, max: string) => {
  const valueDate = new Date(value);
  const minDate = new Date(min);
  const maxDate = new Date(max);
  if (Number.isNaN(valueDate.getTime()) || Number.isNaN(minDate.getTime()) || Number.isNaN(maxDate.getTime())) {
    return false;
  }
  return valueDate >= minDate && valueDate <= maxDate;
};

// Local interface for speakers form
interface LocalSpeaker {
  id?: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  twitter_url: string;
  website_url: string;
}

type AreaShape = {
  id: string;
  area: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeShapes = (raw: unknown): AreaShape[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any) => ({
      id: typeof item?.id === 'string' ? item.id : `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      area: typeof item?.area === 'string' ? item.area : '',
      x: typeof item?.x === 'number' ? clamp(item.x, 0, 100) : 40,
      y: typeof item?.y === 'number' ? clamp(item.y, 0, 100) : 40,
      width: typeof item?.width === 'number' ? clamp(item.width, 4, 60) : 16,
      height: typeof item?.height === 'number' ? clamp(item.height, 4, 60) : 10,
    }))
    .filter((shape) => shape.area);
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  const { user } = useAuthStore();
  const { createEvent, updateEvent, fetchEvent, currentEvent, isLoading } = useEventStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue_name: '',
    venue_address: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    start_date: '',
    end_date: '',
    interests: [] as string[],
    target_audience: [] as string[],
    event_highlights: [] as string[],
    venue_areas: [] as string[],
  });
  const [highlightInput, setHighlightInput] = useState('');
  const [venueAreaInput, setVenueAreaInput] = useState('');
  const [venueAreaShapes, setVenueAreaShapes] = useState<AreaShape[]>([]);
  const [selectedAreaForPlacement, setSelectedAreaForPlacement] = useState('');
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [venueMapFile, setVenueMapFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [venueMapPreview, setVenueMapPreview] = useState<string | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [existingBanner, setExistingBanner] = useState<string | null>(null);
  const [existingVenueMap, setExistingVenueMap] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  // Agenda management
  const [agendaItems, setAgendaItems] = useState<LocalAgendaItem[]>([]);
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [newAgendaItem, setNewAgendaItem] = useState<LocalAgendaItem>({
    title: '',
    description: '',
    location_name: '',
    floor: '',
    x_position: 50,
    y_position: 50,
    start_time: '',
    end_time: '',
  });

  // Speakers management
  const [speakers, setSpeakers] = useState<LocalSpeaker[]>([]);
  const [showSpeakerForm, setShowSpeakerForm] = useState(false);
  const [speakerPhotoFile, setSpeakerPhotoFile] = useState<File | null>(null);
  const [speakerPhotoPreview, setSpeakerPhotoPreview] = useState<string | null>(null);
  const [newSpeaker, setNewSpeaker] = useState<LocalSpeaker>({
    name: '',
    title: '',
    company: '',
    bio: '',
    photo_url: '',
    linkedin_url: '',
    twitter_url: '',
    website_url: '',
  });

  // Fetch event data when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setInitialLoading(true);
      fetchEvent(id).then(() => {
        setInitialLoading(false);
      });
      // Fetch existing agenda items
      fetchExistingAgendaItems(id);
      // Fetch existing speakers
      fetchExistingSpeakers(id);
    }
  }, [id, isEditMode, fetchEvent]);

  const fetchExistingAgendaItems = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true });
      
      if (!error && data) {
        // Convert to LocalAgendaItem format
        const localItems: LocalAgendaItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title || '',
          description: item.description || '',
          location_name: item.location_name || '',
          floor: String(item.floor || ''),
          x_position: item.x_position || 50,
          y_position: item.y_position || 50,
          start_time: toDateTimeInputValue(item.start_time),
          end_time: toDateTimeInputValue(item.end_time),
        }));
        setAgendaItems(localItems);
      }
    } catch (err) {
      console.error('Failed to fetch agenda items:', err);
    }
  };

  const fetchExistingSpeakers = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        const localSpeakers: LocalSpeaker[] = data.map((speaker: any) => ({
          id: speaker.id,
          name: speaker.name || '',
          title: speaker.title || '',
          company: speaker.company || '',
          bio: speaker.bio || '',
          photo_url: speaker.photo_url || '',
          linkedin_url: speaker.linkedin_url || '',
          twitter_url: speaker.twitter_url || '',
          website_url: speaker.website_url || '',
        }));
        setSpeakers(localSpeakers);
      }
    } catch (err) {
      console.error('Failed to fetch speakers:', err);
    }
  };

  // Populate form with event data when editing
  useEffect(() => {
    if (isEditMode && currentEvent && currentEvent.id === id) {
      // Format dates for datetime-local input
      const formatDateForInput = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };

      setFormData({
        title: currentEvent.title || '',
        description: currentEvent.description || '',
        venue_name: currentEvent.venue_name || '',
        venue_address: currentEvent.venue_address || '',
        latitude: currentEvent.latitude || 0,
        longitude: currentEvent.longitude || 0,
        radius_meters: currentEvent.radius_meters || 100,
        start_date: currentEvent.start_date ? formatDateForInput(currentEvent.start_date) : '',
        end_date: currentEvent.end_date ? formatDateForInput(currentEvent.end_date) : '',
        interests: currentEvent.interests || [],
        target_audience: currentEvent.target_audience || [],
        event_highlights: (currentEvent as any).event_highlights?.length
          ? (currentEvent as any).event_highlights
          : defaultEventHighlights,
        venue_areas: currentEvent.venue_areas || [],
      });

      const loadedAreas = currentEvent.venue_areas || [];
      const loadedShapes = normalizeShapes((currentEvent as any).venue_area_shapes)
        .filter((shape) => loadedAreas.includes(shape.area));

      setVenueAreaShapes(loadedShapes);
      setSelectedAreaForPlacement(loadedAreas[0] || '');
      setSelectedShapeId(null);

      // Set existing images
      if (currentEvent.logo_url) {
        setExistingLogo(currentEvent.logo_url);
        setLogoPreview(currentEvent.logo_url);
      }
      if (currentEvent.banner_url) {
        setExistingBanner(currentEvent.banner_url);
        setBannerPreview(currentEvent.banner_url);
      }
      if (currentEvent.venue_map_url) {
        setExistingVenueMap(currentEvent.venue_map_url);
        setVenueMapPreview(currentEvent.venue_map_url);
      }
    }
  }, [currentEvent, isEditMode, id]);

  useEffect(() => {
    if (!isEditMode && !selectedAreaForPlacement && formData.venue_areas.length > 0) {
      setSelectedAreaForPlacement(formData.venue_areas[0]);
    }

    if (selectedAreaForPlacement && !formData.venue_areas.includes(selectedAreaForPlacement)) {
      setSelectedAreaForPlacement(formData.venue_areas[0] || '');
    }
  }, [formData.venue_areas, selectedAreaForPlacement, isEditMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const addEventHighlight = () => {
    const value = highlightInput.trim();
    if (!value) return;

    const exists = formData.event_highlights.some((highlight) => highlight.toLowerCase() === value.toLowerCase());
    if (exists) {
      toast.error('This highlight already exists');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      event_highlights: [...prev.event_highlights, value],
    }));
    setHighlightInput('');
  };

  const removeEventHighlight = (highlightToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      event_highlights: prev.event_highlights.filter((highlight) => highlight !== highlightToRemove),
    }));
  };

  const handleVenueAreaToggle = (area: string) => {
    setFormData(prev => {
      const exists = prev.venue_areas.includes(area);
      const nextAreas = exists
        ? prev.venue_areas.filter(a => a !== area)
        : [...prev.venue_areas, area];

      if (exists) {
        setVenueAreaShapes((prevShapes) => prevShapes.filter((shape) => shape.area !== area));
        setSelectedShapeId((current) => {
          if (!current) return current;
          const stillExists = venueAreaShapes.some((shape) => shape.id === current && shape.area !== area);
          return stillExists ? current : null;
        });
        if (selectedAreaForPlacement === area) {
          setSelectedAreaForPlacement(nextAreas[0] || '');
        }
      } else if (!selectedAreaForPlacement) {
        setSelectedAreaForPlacement(area);
      }

      return {
        ...prev,
        venue_areas: nextAreas,
      };
    });
  };

  const addCustomVenueArea = () => {
    const normalized = venueAreaInput.trim();
    if (!normalized) return;

    const alreadyExists = formData.venue_areas.some((area) => area.toLowerCase() === normalized.toLowerCase());
    if (alreadyExists) {
      toast.error('This venue area already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      venue_areas: [...prev.venue_areas, normalized],
    }));
    if (!selectedAreaForPlacement) {
      setSelectedAreaForPlacement(normalized);
    }
    setVenueAreaInput('');
  };

  const handleVenueMapClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!selectedAreaForPlacement) {
      toast.error('Select or add a venue area first');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = clamp(((e.clientX - rect.left) / rect.width) * 100, 4, 96);
    const yPercent = clamp(((e.clientY - rect.top) / rect.height) * 100, 4, 96);

    // Check if a shape already exists for this area
    const existingShape = venueAreaShapes.find((shape) => shape.area === selectedAreaForPlacement);

    if (existingShape) {
      // Move existing shape instead of creating duplicate
      setVenueAreaShapes((prev) =>
        prev.map((shape) =>
          shape.id === existingShape.id
            ? { ...shape, x: xPercent, y: yPercent }
            : shape
        )
      );
      setSelectedShapeId(existingShape.id);
      toast.success(`Moved "${selectedAreaForPlacement}" marker to new position.`);
    } else {
      // Create new shape if none exists for this area
      const shape: AreaShape = {
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        area: selectedAreaForPlacement,
        x: xPercent,
        y: yPercent,
        width: 16,
        height: 10,
      };
      setVenueAreaShapes((prev) => [...prev, shape]);
      setSelectedShapeId(shape.id);
      toast.success(`Placed "${selectedAreaForPlacement}" on map.`);
    }
  };

  const selectedShape = useMemo(
    () => venueAreaShapes.find((shape) => shape.id === selectedShapeId) || null,
    [venueAreaShapes, selectedShapeId]
  );

  const updateSelectedShape = (updates: Partial<AreaShape>) => {
    if (!selectedShapeId) return;

    setVenueAreaShapes((prev) =>
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
    setVenueAreaShapes((prev) => prev.filter((shape) => shape.id !== selectedShapeId));
    setSelectedShapeId(null);
  };

  // Agenda management functions
  const addAgendaItem = () => {
    if (!newAgendaItem.title || !newAgendaItem.start_time || !newAgendaItem.end_time || !newAgendaItem.floor) {
      toast.error('Please fill title, floor, start date and time, and end date and time');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      toast.error('Please set the event start and end date first');
      return;
    }

    const floorValue = Number.parseInt(newAgendaItem.floor, 10);
    if (Number.isNaN(floorValue)) {
      toast.error('Agenda item floor must be a valid number');
      return;
    }

    const startDate = new Date(newAgendaItem.start_time);
    const endDate = new Date(newAgendaItem.end_time);
    const eventStartDate = new Date(formData.start_date);
    const eventEndDate = new Date(formData.end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast.error('Please enter valid agenda date and time values');
      return;
    }

    if (startDate < eventStartDate || startDate > eventEndDate) {
      toast.error('Agenda item start date and time must be inside the event window');
      return;
    }

    if (endDate < eventStartDate || endDate > eventEndDate) {
      toast.error('Agenda item end date and time must be inside the event window');
      return;
    }

    if (endDate <= startDate) {
      toast.error('Agenda item end date and time must be after the start date and time');
      return;
    }
    
    setAgendaItems(prev => [...prev, { ...newAgendaItem, id: `temp-${Date.now()}` }]);
    setNewAgendaItem({
      title: '',
      description: '',
      location_name: '',
      floor: '',
      x_position: 50,
      y_position: 50,
      start_time: '',
      end_time: '',
    });
    setShowAgendaForm(false);
    toast.success('Agenda item added');
  };

  const removeAgendaItem = async (itemId: string) => {
    const index = agendaItems.findIndex(item => item.id === itemId);
    if (index === -1) return;
    
    const item = agendaItems[index];
    // If it has a real ID (not temp), delete from database
    if (item.id && !item.id.toString().startsWith('temp-')) {
      try {
        await supabase.from('agenda_items').delete().eq('id', item.id);
      } catch (err) {
        console.error('Failed to delete agenda item:', err);
      }
    }
    setAgendaItems(prev => prev.filter((_, i) => i !== index));
    toast.success('Agenda item removed');
  };

  const saveAgendaItems = async (eventId: string) => {
    // Save new agenda items (ones with temp IDs)
    const newItems = agendaItems.filter(item => item.id?.toString().startsWith('temp-'));
    const eventStartDate = formData.start_date || currentEvent?.start_date || '';
    const eventEndDate = formData.end_date || currentEvent?.end_date || '';
    
    for (const item of newItems) {
      const floorValue = Number.parseInt(item.floor, 10);
      const startTime = item.start_time ? new Date(item.start_time) : null;
      const endTime = item.end_time ? new Date(item.end_time) : null;

      if (!startTime || !endTime || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || Number.isNaN(floorValue)) {
        toast.error(`Invalid agenda time for ${item.title}`);
        continue;
      }

      if (!eventStartDate || !eventEndDate || !isWithinRange(item.start_time, eventStartDate, eventEndDate) || !isWithinRange(item.end_time, eventStartDate, eventEndDate)) {
        toast.error(`Agenda item ${item.title} must be inside the event date range`);
        continue;
      }

      if (endTime <= startTime) {
        toast.error(`Agenda item ${item.title} end date and time must be after the start date and time`);
        continue;
      }

      const insertData = {
        event_id: eventId,
        title: item.title || '',
        description: item.description || null,
        location_name: item.location_name || 'TBD',
        floor: floorValue,
        x_position: item.x_position || null,
        y_position: item.y_position || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };
      
      const { error } = await supabase.from('agenda_items').insert(insertData as any);
      
      if (error) {
        console.error('Failed to save agenda item:', error);
        toast.error(`Failed to save agenda: ${error.message}`);
      }
    }
  };

  // Speaker management functions
  const handleSpeakerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSpeakerPhotoFile(file);
      setSpeakerPhotoPreview(URL.createObjectURL(file));
    }
  };

  const addSpeaker = async () => {
    if (!newSpeaker.name) {
      toast.error('Please enter speaker name');
      return;
    }
    
    let photo_url = '';
    
    // Upload speaker photo if provided
    if (speakerPhotoFile && user) {
      const sanitizedName = sanitizeFilename(speakerPhotoFile.name);
      const photoPath = `${user.id}/speakers/${Date.now()}-${sanitizedName}`;
      const uploadedUrl = await uploadFile(speakerPhotoFile, photoPath);
      if (uploadedUrl) {
        photo_url = uploadedUrl;
      }
    }
    
    setSpeakers(prev => [...prev, { 
      ...newSpeaker, 
      photo_url: photo_url || newSpeaker.photo_url,
      id: `temp-${Date.now()}` 
    }]);
    
    setNewSpeaker({
      name: '',
      title: '',
      company: '',
      bio: '',
      photo_url: '',
      linkedin_url: '',
      twitter_url: '',
      website_url: '',
    });
    setSpeakerPhotoFile(null);
    setSpeakerPhotoPreview(null);
    setShowSpeakerForm(false);
    toast.success('Speaker added');
  };

  const removeSpeaker = async (speakerId: string) => {
    const index = speakers.findIndex(s => s.id === speakerId);
    if (index === -1) return;
    
    const speaker = speakers[index];
    // If it has a real ID (not temp), delete from database
    if (speaker.id && !speaker.id.toString().startsWith('temp-')) {
      try {
        await supabase.from('speakers').delete().eq('id', speaker.id);
      } catch (err) {
        console.error('Failed to delete speaker:', err);
      }
    }
    setSpeakers(prev => prev.filter((_, i) => i !== index));
    toast.success('Speaker removed');
  };

  const saveSpeakers = async (eventId: string) => {
    // Save new speakers (ones with temp IDs)
    const newSpeakerItems = speakers.filter(s => s.id?.toString().startsWith('temp-'));
    
    for (const speaker of newSpeakerItems) {
      const insertData = {
        event_id: eventId,
        name: speaker.name,
        title: speaker.title || null,
        company: speaker.company || null,
        bio: speaker.bio || null,
        photo_url: speaker.photo_url || null,
        linkedin_url: speaker.linkedin_url || null,
        twitter_url: speaker.twitter_url || null,
        website_url: speaker.website_url || null,
      };
      
      const { error } = await supabase.from('speakers').insert(insertData as any);
      
      if (error) {
        console.error('Failed to save speaker:', error);
        toast.error(`Failed to save speaker: ${error.message}`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'venue') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setExistingLogo(null);
      } else if (type === 'banner') {
        setBannerFile(file);
        setBannerPreview(URL.createObjectURL(file));
        setExistingBanner(null);
      } else {
        setVenueMapFile(file);
        setVenueMapPreview(URL.createObjectURL(file));
        setExistingVenueMap(null);
      }
    }
  };

  const removeImage = (type: 'logo' | 'banner' | 'venue') => {
    if (type === 'logo') {
      setLogoFile(null);
      setLogoPreview(null);
      setExistingLogo(null);
    } else if (type === 'banner') {
      setBannerFile(null);
      setBannerPreview(null);
      setExistingBanner(null);
    } else {
      setVenueMapFile(null);
      setVenueMapPreview(null);
      setExistingVenueMap(null);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage
      .from('events')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage
      .from('events')
      .getPublicUrl(path);
    
    console.log('Uploaded file URL:', data.publicUrl);
    return data.publicUrl;
  };

  const uploadVenueMapFile = async (file: File, eventId: string): Promise<string | null> => {
    const sanitizedName = sanitizeFilename(file.name);
    const mapPath = `${eventId}/${Date.now()}-venue-map-${sanitizedName}`;

    const { error } = await supabase.storage
      .from('venue-maps')
      .upload(mapPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Venue map upload error:', error);
      toast.error(`Venue map upload failed: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage
      .from('venue-maps')
      .getPublicUrl(mapPath);

    return data.publicUrl;
  };

  const getMinDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validation
    if (!formData.venue_name || !formData.venue_address) {
      toast.error('Please select a venue location on the map');
      return;
    }

    // Validate start date is in the future
    const now = new Date();
    const startDate = formData.start_date ? new Date(formData.start_date) : null;
    if (!startDate || startDate <= now) {
      toast.error('Event start date must be in the future');
      return;
    }

    // Validate end date is after start date
    const endDate = formData.end_date ? new Date(formData.end_date) : null;
    if (!endDate || endDate <= startDate) {
      toast.error('Event end date must be after the start date');
      return;
    }

    setUploading(true);
    
    try {
      let logo_url = existingLogo;
      let banner_url = existingBanner;
      let venue_map_url = existingVenueMap;

      if (logoFile) {
        const sanitizedName = sanitizeFilename(logoFile.name);
        const logoPath = `${user.id}/${Date.now()}-logo-${sanitizedName}`;
        logo_url = await uploadFile(logoFile, logoPath);
      }

      if (bannerFile) {
        const sanitizedName = sanitizeFilename(bannerFile.name);
        const bannerPath = `${user.id}/${Date.now()}-banner-${sanitizedName}`;
        banner_url = await uploadFile(bannerFile, bannerPath);
      }

      const eventData = {
        ...formData,
        event_highlights: formData.event_highlights.length
          ? formData.event_highlights
          : (isEditMode ? defaultEventHighlights : []),
        logo_url,
        banner_url,
        organizer_id: user.id,
        venue_map_url,
        venue_area_shapes: venueAreaShapes,
        venue_3d_map_url: null,
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
      };

      if (isEditMode && id) {
        if (venueMapFile) {
          const uploadedVenueMap = await uploadVenueMapFile(venueMapFile, id);
          venue_map_url = uploadedVenueMap || venue_map_url;
          eventData.venue_map_url = venue_map_url;
        }

        // Update existing event
        const success = await updateEvent(id, eventData);
        
        if (success) {
          // Save agenda items and speakers
          await saveAgendaItems(id);
          await saveSpeakers(id);
          toast.success('Event updated successfully!');
          navigate(`/dashboard/events/${id}`);
        } else {
          toast.error('Failed to update event');
        }
      } else {
        // Create new event
        const event = await createEvent(eventData);
        
        if (event) {
          if (venueMapFile) {
            const uploadedVenueMap = await uploadVenueMapFile(venueMapFile, event.id);
            if (uploadedVenueMap) {
              await updateEvent(event.id, { venue_map_url: uploadedVenueMap });
            }
          }

          // Save agenda items and speakers
          await saveAgendaItems(event.id);
          await saveSpeakers(event.id);
          toast.success('Event created successfully!');
          navigate(`/dashboard/events/${event.id}`);
        } else {
          toast.error('Failed to create event');
        }
      }
    } catch (error) {
      console.error('Save event error:', error);
      toast.error(isEditMode ? 'Failed to update event' : 'Failed to create event');
    } finally {
      setUploading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="loading-placeholder">
        <Loader2 className="spinner" size={32} />
        <span>Loading event data...</span>
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="page-header-content">
          <h2>{isEditMode ? 'Edit Event' : 'Create New Event'}</h2>
          {isEditMode && currentEvent && (
            <p>Editing: {currentEvent.title}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="event-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter event title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your event..."
              rows={5}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date & Time *</label>
              <div className="input-with-icon">
                <Calendar size={18} />
                <input
                  type="datetime-local"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  min={getMinDateTime()}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="end_date">End Date & Time *</label>
              <div className="input-with-icon">
                <Clock size={18} />
                <input
                  type="datetime-local"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={formData.start_date || getMinDateTime()}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Branding</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Event Logo</label>
              <div className="file-upload">
                {logoPreview ? (
                  <div className="file-preview">
                    <img src={logoPreview} alt="Logo preview" />
                    <button type="button" onClick={() => removeImage('logo')}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="file-upload-area">
                    <Upload size={24} />
                    <span>Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'logo')}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Banner Image</label>
              <div className="file-upload file-upload-wide">
                {bannerPreview ? (
                  <div className="file-preview file-preview-wide">
                    <img src={bannerPreview} alt="Banner preview" />
                    <button type="button" onClick={() => removeImage('banner')}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="file-upload-area file-upload-area-wide">
                    <Upload size={24} />
                    <span>Upload Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'banner')}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Location & Geofencing</h3>
          <p className="form-section-hint">Search for a venue or click on the map to set your event location</p>
          
          <LocationPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            radiusMeters={formData.radius_meters}
            venueName={formData.venue_name}
            venueAddress={formData.venue_address}
            onLocationChange={(data) => {
              setFormData(prev => ({
                ...prev,
                latitude: data.latitude,
                longitude: data.longitude,
                venue_name: data.venue_name,
                venue_address: data.venue_address,
              }));
            }}
            onRadiusChange={(radius) => {
              setFormData(prev => ({ ...prev, radius_meters: radius }));
            }}
          />

          <div className="venue-setup-card">
            <div className="venue-setup-header">
              <h4>
                <MapPin size={18} />
                Venue Setup - Step by Step
              </h4>
              <p>Configure your venue layout for attendee navigation and zone management</p>
            </div>

            {/* STEP 1: Upload Venue Map */}
            <div className="venue-setup-section">
              <div className="venue-setup-step">
                <div className="step-indicator">1</div>
                <div className="step-content">
                  <h5>Upload Your Venue Map</h5>
                  <p className="step-description">Upload a floor plan or map image of your venue</p>
                </div>
              </div>
              
              <div className="file-upload file-upload-wide" style={{ marginTop: '1rem' }}>
                {venueMapPreview ? (
                  <div className="file-preview file-preview-wide venue-map-preview-wide">
                    <img src={venueMapPreview} alt="Venue map preview" />
                    <div className="file-preview-actions">
                      <button type="button" onClick={() => removeImage('venue')} className="btn btn-sm btn-danger">
                        Replace Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="file-upload-area file-upload-area-wide venue-map-upload-area">
                    <Upload size={32} />
                    <span className="upload-text">Click to upload venue map</span>
                    <span className="upload-hint">PNG, JPG or GIF (max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'venue')}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* STEP 2: Define Venue Areas */}
            <div className="venue-setup-section">
              <div className="venue-setup-step">
                <div className="step-indicator">2</div>
                <div className="step-content">
                  <h5>Define Venue Areas</h5>
                  <p className="step-description">Select or create zones in your venue (e.g., Main Hall, VIP Lounge, etc.)</p>
                </div>
              </div>

              <div className="venue-areas-configuration">
                <div className="suggested-areas">
                  <label className="areas-label">Suggested Zones:</label>
                  <div className="tags-grid">
                    {availableZones.map((zone) => (
                      <button
                        key={zone}
                        type="button"
                        className={`tag-btn ${formData.venue_areas.includes(zone) ? 'active' : ''}`}
                        onClick={() => handleVenueAreaToggle(zone)}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="custom-areas" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                  <label className="areas-label">Add Custom Zone:</label>
                  <div className="venue-areas-add-row">
                    <input
                      type="text"
                      value={venueAreaInput}
                      onChange={(e) => setVenueAreaInput(e.target.value)}
                      placeholder="e.g., Hall C, VIP Section, Registration Desk"
                      onKeyPress={(e) => e.key === 'Enter' && addCustomVenueArea()}
                    />
                    <button type="button" className="btn btn-primary" onClick={addCustomVenueArea}>
                      + Add
                    </button>
                  </div>
                </div>

                {formData.venue_areas.length > 0 && (
                  <div className="selected-areas-display" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <label className="areas-label">Selected Zones ({formData.venue_areas.length}):</label>
                    <div className="audience-tags">
                      {formData.venue_areas.map((area) => {
                        const isPlacedOnMap = venueAreaShapes.some((shape) => shape.area === area);
                        return (
                          <span key={area} className="audience-tag" style={{ position: 'relative' }}>
                            {area}
                            {isPlacedOnMap && <span style={{ marginLeft: '0.4rem', color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>✓</span>}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  venue_areas: prev.venue_areas.filter(a => a !== area),
                                }));
                                setVenueAreaShapes(prev => prev.filter((shape) => shape.area !== area));
                                if (selectedAreaForPlacement === area) {
                                  const next = formData.venue_areas.filter(a => a !== area);
                                  setSelectedAreaForPlacement(next[0] || '');
                                }
                                if (selectedShapeId) {
                                  const stillExists = venueAreaShapes.some((shape) => shape.id === selectedShapeId && shape.area !== area);
                                  if (!stillExists) setSelectedShapeId(null);
                                }
                              }}
                              className="audience-tag-remove"
                          >
                            ✕
                          </button>
                        </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: Map Areas on Floor Plan - Only show when BOTH map AND areas are defined */}
            {formData.venue_areas.length > 0 && venueMapPreview && (
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
                        {formData.venue_areas.map((area) => {
                          const isPlaced = venueAreaShapes.some((shape) => shape.area === area);
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
                    {selectedAreaForPlacement && !venueAreaShapes.some((s) => s.area === selectedAreaForPlacement) ? (
                      <div className="placement-instruction">
                        👇 Click on the map to place <strong>{selectedAreaForPlacement}</strong>
                      </div>
                    ) : null}
                    
                    <div className="venue-live-map simple-map" onClick={handleVenueMapClick}>
                      <img src={venueMapPreview} alt="Venue map editor" className="venue-live-map-image" />
                      <div className="venue-live-overlay">
                        {venueAreaShapes.map((shape) => (
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
                          <label htmlFor="shape-x-create">
                            Horizontal: <strong>{Math.round(selectedShape.x)}%</strong>
                          </label>
                          <input
                            id="shape-x-create"
                            type="range"
                            min={0}
                            max={100}
                            value={selectedShape.x}
                            onChange={(e) => updateSelectedShape({ x: Number(e.target.value) })}
                          />
                        </div>

                        <div className="control-group">
                          <label htmlFor="shape-y-create">
                            Vertical: <strong>{Math.round(selectedShape.y)}%</strong>
                          </label>
                          <input
                            id="shape-y-create"
                            type="range"
                            min={0}
                            max={100}
                            value={selectedShape.y}
                            onChange={(e) => updateSelectedShape({ y: Number(e.target.value) })}
                          />
                        </div>

                        <div className="control-group">
                          <label htmlFor="shape-width-create">
                            Width: <strong>{Math.round(selectedShape.width)}%</strong>
                          </label>
                          <input
                            id="shape-width-create"
                            type="range"
                            min={4}
                            max={60}
                            value={selectedShape.width}
                            onChange={(e) => updateSelectedShape({ width: Number(e.target.value) })}
                          />
                        </div>

                        <div className="control-group">
                          <label htmlFor="shape-height-create">
                            Height: <strong>{Math.round(selectedShape.height)}%</strong>
                          </label>
                          <input
                            id="shape-height-create"
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

            {/* Empty State */}
            {formData.venue_areas.length === 0 && !venueMapPreview && (
              <div className="venue-setup-empty">
                <p>📍 Start by uploading a venue map and defining your zones above</p>
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3>Categories & Tags</h3>
          
          <div className="form-group">
            <label>
              <Tag size={18} />
              Event Interests
            </label>
            <div className="tags-grid">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`tag-btn ${formData.interests.includes(interest) ? 'active' : ''}`}
                  onClick={() => handleInterestToggle(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Target Audience Section */}
        <div className="form-section">
          <h3>
            <Target size={20} />
            Target Audience
          </h3>
          <p className="form-section-hint">Define who this event is designed for. AI will use this to suggest matching attendees.</p>
          
          <div className="form-group">
            <label>
              <Users size={18} />
              Audience Segments
            </label>
            <div className="tags-grid">
              {getTargetAudienceOptions().map((audience) => (
                <button
                  key={audience}
                  type="button"
                  className={`tag-btn ${formData.target_audience.includes(audience) ? 'active' : ''}`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      target_audience: prev.target_audience.includes(audience)
                        ? prev.target_audience.filter(a => a !== audience)
                        : [...prev.target_audience, audience]
                    }));
                  }}
                >
                  {audience}
                </button>
              ))}
            </div>
          </div>

          {formData.target_audience.length > 0 && (
            <div className="selected-audience-preview">
              <span className="audience-label">Selected audience:</span>
              <div className="audience-tags">
                {formData.target_audience.map(a => (
                  <span key={a} className="audience-tag">
                    {a}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, target_audience: prev.target_audience.filter(t => t !== a) }))}
                      className="audience-tag-remove"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Event Highlights Section */}
        <div className="form-section">
          <h3>
            <Tag size={20} />
            Event Highlights
          </h3>
          <p className="form-section-hint">Add short highlights that describe what attendees can expect from this event.</p>

          <div className="venue-areas-add-row">
            <input
              type="text"
              value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)}
              placeholder="Add a highlight (e.g. 30+ speakers, Startup showcase, Live demos)"
            />
            <button type="button" className="btn btn-outline" onClick={addEventHighlight}>
              Add Highlight
            </button>
          </div>

          {formData.event_highlights.length > 0 && (
            <div className="selected-audience-preview">
              <span className="audience-label">Saved highlights:</span>
              <div className="audience-tags">
                {formData.event_highlights.map((highlight) => (
                  <span key={highlight} className="audience-tag">
                    {highlight}
                    <button
                      type="button"
                      onClick={() => removeEventHighlight(highlight)}
                      className="audience-tag-remove"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Agenda Management Section */}
        <div className="form-section">
          <h3>
            <Clock size={20} />
            Agenda Items
          </h3>
          <p className="form-section-hint">Add sessions, talks, and activities for your event</p>
          
          {/* Existing Agenda Items */}
          {agendaItems.length > 0 && (
            <div className="agenda-list">
              {agendaItems.map((item) => (
                <div key={item.id} className="agenda-item-card">
                  <div className="agenda-item-header">
                    <div className="agenda-item-time">
                      <Clock size={14} />
                      {item.start_time ? new Date(item.start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-'} - {item.end_time ? new Date(item.end_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </div>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => item.id && removeAgendaItem(item.id)}
                      title="Remove agenda item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="agenda-item-title">{item.title}</div>
                  {item.location_name && (
                    <div className="agenda-item-location">
                      <MapPin size={14} />
                      {item.location_name}
                      {item.floor && ` - Floor ${item.floor}`}
                    </div>
                  )}
                  {item.description && (
                    <div className="agenda-item-description">{item.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Add New Agenda Item Form */}
          {showAgendaForm ? (
            <div className="agenda-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={newAgendaItem.title}
                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Session title"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={newAgendaItem.start_time}
                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, start_time: e.target.value }))}
                    min={formData.start_date || getMinDateTime()}
                    max={formData.end_date || undefined}
                    title="Start date and time"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={newAgendaItem.end_time}
                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, end_time: e.target.value }))}
                    min={newAgendaItem.start_time || formData.start_date || getMinDateTime()}
                    max={formData.end_date || undefined}
                    title="End date and time"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Location Name</label>
                  <input
                    type="text"
                    value={newAgendaItem.location_name}
                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, location_name: e.target.value }))}
                    placeholder="Room name, hall, etc."
                  />
                </div>
                <div className="form-group">
                  <label>Floor *</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={newAgendaItem.floor}
                    onChange={(e) => setNewAgendaItem(prev => ({ ...prev, floor: e.target.value }))}
                    placeholder="e.g., 1"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newAgendaItem.description}
                  onChange={(e) => setNewAgendaItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Session description (optional)"
                  rows={2}
                />
              </div>
              
              <div className="agenda-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAgendaForm(false);
                    setNewAgendaItem({
                      title: '',
                      description: '',
                      location_name: '',
                      floor: '',
                      x_position: 50,
                      y_position: 50,
                      start_time: '',
                      end_time: '',
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addAgendaItem}
                  disabled={!newAgendaItem.title || !newAgendaItem.start_time || !newAgendaItem.end_time}
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline add-agenda-btn"
              onClick={() => setShowAgendaForm(true)}
            >
              <Plus size={18} />
              Add Agenda Item
            </button>
          )}
        </div>

        {/* Speakers Management Section */}
        <div className="form-section">
          <h3>
            <Users size={20} />
            Event Speakers
          </h3>
          <p className="form-section-hint">Add speakers, panelists, and presenters for your event</p>
          
          {/* Existing Speakers */}
          {speakers.length > 0 && (
            <div className="speakers-list">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="speaker-card">
                  <div className="speaker-card-header">
                    <div className="speaker-avatar">
                      {speaker.photo_url ? (
                        <img src={speaker.photo_url} alt={speaker.name} />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => speaker.id && removeSpeaker(speaker.id)}
                      title="Remove speaker"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="speaker-info">
                    <div className="speaker-name">{speaker.name}</div>
                    {(speaker.title || speaker.company) && (
                      <div className="speaker-title">
                        {speaker.title}{speaker.title && speaker.company ? ' at ' : ''}{speaker.company}
                      </div>
                    )}
                    {speaker.bio && (
                      <div className="speaker-bio">{speaker.bio}</div>
                    )}
                    <div className="speaker-links">
                      {speaker.linkedin_url && (
                        <a href={speaker.linkedin_url} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                          <Linkedin size={16} />
                        </a>
                      )}
                      {speaker.twitter_url && (
                        <a href={speaker.twitter_url} target="_blank" rel="noopener noreferrer" title="Twitter">
                          <Twitter size={16} />
                        </a>
                      )}
                      {speaker.website_url && (
                        <a href={speaker.website_url} target="_blank" rel="noopener noreferrer" title="Website">
                          <Globe size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Add New Speaker Form */}
          {showSpeakerForm ? (
            <div className="speaker-form">
              <div className="form-row">
                <div className="form-group speaker-photo-upload">
                  <label>Speaker Photo</label>
                  <div className="speaker-photo-container">
                    {speakerPhotoPreview ? (
                      <div className="speaker-photo-preview">
                        <img src={speakerPhotoPreview} alt="Speaker preview" />
                        <button 
                          type="button" 
                          onClick={() => {
                            setSpeakerPhotoFile(null);
                            setSpeakerPhotoPreview(null);
                          }}
                          className="remove-photo-btn"
                          title="Remove photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="speaker-photo-upload-area">
                        <Upload size={20} />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSpeakerPhotoChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="form-group speaker-name-field">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={newSpeaker.name}
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Speaker name"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Job Title</label>
                  <input
                    type="text"
                    value={newSpeaker.title}
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., CEO, CTO, Developer"
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={newSpeaker.company}
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={newSpeaker.bio}
                  onChange={(e) => setNewSpeaker(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Brief speaker biography (optional)"
                  rows={3}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Linkedin size={14} />
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={newSpeaker.linkedin_url}
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="form-group">
                  <label>
                    <Twitter size={14} />
                    Twitter URL
                  </label>
                  <input
                    type="url"
                    value={newSpeaker.twitter_url}
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, twitter_url: e.target.value }))}
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="form-group">
                  <label>
                    <Globe size={14} />
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={newSpeaker.website_url}
                    onChange={(e) => setNewSpeaker(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div className="speaker-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowSpeakerForm(false);
                    setNewSpeaker({
                      name: '',
                      title: '',
                      company: '',
                      bio: '',
                      photo_url: '',
                      linkedin_url: '',
                      twitter_url: '',
                      website_url: '',
                    });
                    setSpeakerPhotoFile(null);
                    setSpeakerPhotoPreview(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addSpeaker}
                  disabled={!newSpeaker.name}
                >
                  <Plus size={18} />
                  Add Speaker
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline add-speaker-btn"
              onClick={() => setShowSpeakerForm(true)}
            >
              <Plus size={18} />
              Add Speaker
            </button>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isLoading || uploading}>
            {(isLoading || uploading) ? (
              <>
                <Loader2 className="spinner" size={18} />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update Event' : 'Create Event'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

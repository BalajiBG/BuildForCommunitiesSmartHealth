'use client';

import React, { useMemo } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface CentreLocation {
  id: string;
  name: string;
  location: { lat: number; lng: number };
}

interface DistrictMapProps {
  centres: CentreLocation[];
}

/** Default centre of India (approximate geographic centre) */
const DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 };
const DEFAULT_ZOOM = 5;

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

/**
 * DistrictMap displays a Google Maps view with markers for each Health Centre.
 * Gracefully handles missing API key by showing a placeholder message.
 */
export default function DistrictMap({ centres }: DistrictMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // If no API key is configured, show a placeholder
  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg"
        style={{ width: '100%', height: '400px' }}
        role="region"
        aria-label="District map placeholder"
      >
        <p className="text-gray-500 text-sm text-center px-4">
          Map unavailable. Please configure the{' '}
          <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{' '}
          environment variable to enable the map.
        </p>
      </div>
    );
  }

  return <DistrictMapInner centres={centres} apiKey={apiKey} />;
}

function DistrictMapInner({
  centres,
  apiKey,
}: DistrictMapProps & { apiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  // Compute the map center based on centre locations
  const mapCenter = useMemo(() => {
    if (centres.length === 0) return DEFAULT_CENTER;

    const sumLat = centres.reduce((sum, c) => sum + c.location.lat, 0);
    const sumLng = centres.reduce((sum, c) => sum + c.location.lng, 0);

    return {
      lat: sumLat / centres.length,
      lng: sumLng / centres.length,
    };
  }, [centres]);

  const zoom = useMemo(() => {
    return centres.length === 0 ? DEFAULT_ZOOM : 10;
  }, [centres.length]);

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg"
        style={{ width: '100%', height: '400px' }}
        role="alert"
      >
        <p className="text-red-600 text-sm text-center px-4">
          Failed to load Google Maps. Please check your API key configuration.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg animate-pulse"
        style={{ width: '100%', height: '400px' }}
        role="status"
        aria-label="Loading map"
      >
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={zoom}
    >
      {centres.map((centre) => (
        <Marker
          key={centre.id}
          position={centre.location}
          title={centre.name}
        />
      ))}
    </GoogleMap>
  );
}

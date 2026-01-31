import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EUDRFeatureCollection } from '../types/eudr.types';
import { useEffect } from 'react';

// Fix for default marker icon in Leaflet + React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BatchMapProps {
    geolocation: EUDRFeatureCollection;
}

// Component to recenter map when geolocation changes
function MapRecenter({ geolocation }: BatchMapProps) {
    const map = useMap();

    useEffect(() => {
        if (!geolocation.features?.length) return;

        const bounds = L.featureGroup(
            geolocation.features.map(f => {
                if (f.geometry.type === 'Point') {
                    return L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]]);
                } else if (f.geometry.type === 'Polygon') {
                    return L.polygon(f.geometry.coordinates[0].map(c => [c[1], c[0]] as [number, number]));
                }
                return L.layerGroup([]);
            })
        ).getBounds();

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [geolocation, map]);

    return null;
}

export default function BatchMap({ geolocation }: BatchMapProps) {
    const features = geolocation.features || [];

    if (features.length === 0) {
        return (
            <div className="w-full h-full bg-white/5 flex items-center justify-center rounded-2xl border border-white/10">
                <p className="text-gray-400">No geolocation data available</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 z-0">
            <MapContainer
                center={[0, 0]}
                zoom={2}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {features.map((feature, i) => {
                    const { geometry, properties } = feature;

                    if (geometry.type === 'Point') {
                        return (
                            <Marker
                                key={i}
                                position={[geometry.coordinates[1], geometry.coordinates[0]]}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-bold">Plot ID: {properties?.plot_id || 'N/A'}</p>
                                        <p>Area: {properties?.area_ha || 'N/A'} ha</p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    } else if (geometry.type === 'Polygon') {
                        // Leaflet expects [lat, lng]
                        const positions = geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number]);
                        return (
                            <Polygon
                                key={i}
                                positions={positions}
                                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3 }}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-bold">Plot ID: {properties?.plot_id || 'N/A'}</p>
                                        <p>Area: {properties?.area_ha || 'N/A'} ha</p>
                                    </div>
                                </Popup>
                            </Polygon>
                        );
                    }
                    return null;
                })}

                <MapRecenter geolocation={geolocation} />
            </MapContainer>
        </div>
    );
}

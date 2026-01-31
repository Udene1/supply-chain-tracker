import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Upload,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle,
    FileJson
} from 'lucide-react';
import type { EUDRFeatureCollection, EUDRFeature, PlotProperties } from '../types/eudr.types';
import { EUDR_CONSTANTS } from '../types/eudr.types';

interface GeolocationInputProps {
    value: EUDRFeatureCollection | null;
    onChange: (value: EUDRFeatureCollection) => void;
    errors?: string[];
}

interface ManualPlot {
    id: string;
    type: 'Point' | 'Polygon';
    lat: string;
    lng: string;
    plot_id: string;
    farm_id: string;
    area_ha: string;
}

export default function GeolocationInput({ value, onChange, errors = [] }: GeolocationInputProps) {
    const [inputMethod, setInputMethod] = useState<'file' | 'manual'>('file');
    const [manualPlots, setManualPlots] = useState<ManualPlot[]>([{
        id: crypto.randomUUID(),
        type: 'Point',
        lat: '',
        lng: '',
        plot_id: '',
        farm_id: '',
        area_ha: ''
    }]);
    const [fileError, setFileError] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    // Handle file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size
        if (file.size > EUDR_CONSTANTS.MAX_GEOJSON_SIZE_BYTES) {
            setFileError(`File too large. Maximum size is ${EUDR_CONSTANTS.MAX_GEOJSON_SIZE_BYTES / 1024 / 1024}MB`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);

                // Validate basic GeoJSON structure
                if (!json.type) {
                    setFileError('Invalid GeoJSON: missing "type" field');
                    return;
                }

                // Normalize to FeatureCollection
                let featureCollection: EUDRFeatureCollection;
                if (json.type === 'FeatureCollection') {
                    featureCollection = json;
                } else if (json.type === 'Feature') {
                    featureCollection = {
                        type: 'FeatureCollection',
                        features: [json]
                    };
                } else if (json.type === 'Point' || json.type === 'Polygon') {
                    featureCollection = {
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            geometry: json,
                            properties: {}
                        }]
                    };
                } else {
                    setFileError(`Unsupported geometry type: ${json.type}`);
                    return;
                }

                setFileError(null);
                setUploadedFileName(file.name);
                onChange(featureCollection);
            } catch (err) {
                setFileError('Failed to parse GeoJSON file');
            }
        };
        reader.readAsText(file);
    }, [onChange]);

    // Handle manual plot changes
    const updateManualPlot = (id: string, field: keyof ManualPlot, value: string) => {
        setManualPlots(prev => prev.map(plot =>
            plot.id === id ? { ...plot, [field]: value } : plot
        ));
    };

    const addManualPlot = () => {
        setManualPlots(prev => [...prev, {
            id: crypto.randomUUID(),
            type: 'Point',
            lat: '',
            lng: '',
            plot_id: '',
            farm_id: '',
            area_ha: ''
        }]);
    };

    const removeManualPlot = (id: string) => {
        if (manualPlots.length > 1) {
            setManualPlots(prev => prev.filter(p => p.id !== id));
        }
    };

    // Convert manual plots to GeoJSON
    const buildGeoJSONFromManual = useCallback(() => {
        const features: EUDRFeature[] = manualPlots
            .filter(p => p.lat && p.lng)
            .map(plot => ({
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [parseFloat(plot.lng), parseFloat(plot.lat)]
                },
                properties: {
                    plot_id: plot.plot_id || undefined,
                    farm_id: plot.farm_id || undefined,
                    area_ha: plot.area_ha ? parseFloat(plot.area_ha) : undefined
                } as PlotProperties
            }));

        if (features.length > 0) {
            onChange({
                type: 'FeatureCollection',
                features
            });
        }
    }, [manualPlots, onChange]);

    // Calculate total area from value
    const totalArea = value?.features?.reduce((sum, f) => {
        return sum + (f.properties?.area_ha || 0);
    }, 0) || 0;

    return (
        <div className="space-y-4">
            {/* Input Method Toggle */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setInputMethod('file')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${inputMethod === 'file'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <FileJson className="inline w-4 h-4 mr-2" />
                    Upload GeoJSON
                </button>
                <button
                    type="button"
                    onClick={() => setInputMethod('manual')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${inputMethod === 'manual'
                        ? 'bg-primary-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <MapPin className="inline w-4 h-4 mr-2" />
                    Manual Entry
                </button>
            </div>

            <AnimatePresence mode="wait">
                {inputMethod === 'file' ? (
                    <motion.div
                        key="file"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {/* File Upload */}
                        <label className="block w-full">
                            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${fileError
                                ? 'border-red-500/50 bg-red-500/5'
                                : uploadedFileName
                                    ? 'border-green-500/50 bg-green-500/5'
                                    : 'border-white/20 hover:border-primary-500/50 hover:bg-primary-500/5'
                                }`}>
                                <input
                                    type="file"
                                    accept=".json,.geojson"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                {uploadedFileName ? (
                                    <>
                                        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                                        <p className="text-green-400 font-medium">{uploadedFileName}</p>
                                        <p className="text-gray-400 text-sm mt-1">
                                            {value?.features?.length || 0} plot(s) loaded
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-400">
                                            Drop GeoJSON file here or click to browse
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Supports .json, .geojson (max 5MB)
                                        </p>
                                    </>
                                )}
                            </div>
                        </label>

                        {fileError && (
                            <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {fileError}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="manual"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Manual Plot Entries */}
                        {manualPlots.map((plot, index) => (
                            <div key={plot.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-300">
                                        Plot {index + 1}
                                    </span>
                                    {manualPlots.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeManualPlot(plot.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">
                                            Latitude (≥6 decimals)
                                        </label>
                                        <input
                                            type="text"
                                            value={plot.lat}
                                            onChange={(e) => updateManualPlot(plot.id, 'lat', e.target.value)}
                                            onBlur={buildGeoJSONFromManual}
                                            placeholder="e.g., 6.524379"
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">
                                            Longitude (≥6 decimals)
                                        </label>
                                        <input
                                            type="text"
                                            value={plot.lng}
                                            onChange={(e) => updateManualPlot(plot.id, 'lng', e.target.value)}
                                            onBlur={buildGeoJSONFromManual}
                                            placeholder="e.g., 3.379206"
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Plot ID</label>
                                        <input
                                            type="text"
                                            value={plot.plot_id}
                                            onChange={(e) => updateManualPlot(plot.id, 'plot_id', e.target.value)}
                                            onBlur={buildGeoJSONFromManual}
                                            placeholder="PLOT-001"
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Farm ID</label>
                                        <input
                                            type="text"
                                            value={plot.farm_id}
                                            onChange={(e) => updateManualPlot(plot.id, 'farm_id', e.target.value)}
                                            onBlur={buildGeoJSONFromManual}
                                            placeholder="FARM-001"
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Area (ha)</label>
                                        <input
                                            type="text"
                                            value={plot.area_ha}
                                            onChange={(e) => updateManualPlot(plot.id, 'area_ha', e.target.value)}
                                            onBlur={buildGeoJSONFromManual}
                                            placeholder="2.5"
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>

                                {plot.area_ha && parseFloat(plot.area_ha) >= EUDR_CONSTANTS.LARGE_PLOT_THRESHOLD_HA && (
                                    <div className="flex items-center gap-2 text-yellow-400 text-xs bg-yellow-500/10 p-2 rounded-lg">
                                        <AlertCircle className="w-4 h-4" />
                                        Plot ≥4 ha requires Polygon geometry. Upload GeoJSON for polygons.
                                    </div>
                                )}
                                {plot.area_ha && parseFloat(plot.area_ha) > EUDR_CONSTANTS.HIGH_AREA_WARNING_THRESHOLD_HA && (
                                    <div className="flex items-center gap-2 text-orange-400 text-xs bg-orange-500/10 p-2 rounded-lg">
                                        <AlertCircle className="w-4 h-4" />
                                        Warning: Large area detected ({plot.area_ha} ha). Please verify this is correct.
                                    </div>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addManualPlot}
                            className="w-full py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:border-primary-500/50 hover:text-primary-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Another Plot
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Summary */}
            {value && value.features && value.features.length > 0 && (
                <div className="space-y-2">
                    <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-green-400">
                                <CheckCircle className="inline w-4 h-4 mr-2" />
                                {value.features.length} plot(s) configured
                            </span>
                            {totalArea > 0 && (
                                <span className="text-gray-400">
                                    Total area: {totalArea.toFixed(2)} ha
                                </span>
                            )}
                        </div>
                    </div>
                    {totalArea > EUDR_CONSTANTS.HIGH_AREA_WARNING_THRESHOLD_HA && (
                        <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-2 text-orange-400 text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Warning: Large total area ({totalArea.toFixed(2)} ha). Double-check coordinate accuracy.</span>
                        </div>
                    )}
                </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
                <div className="space-y-1">
                    {errors.map((error, i) => (
                        <div key={i} className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

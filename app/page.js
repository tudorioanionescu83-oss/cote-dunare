'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus, Thermometer, Wind, Droplets, MapPin } from 'lucide-react';

export default function Home() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [viewMode, setViewMode] = useState('level');

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchMeasurements(selectedStation.id);
      fetchWeather(selectedStation.id);
    }
  }, [selectedStation, dateRange]);

  async function fetchStations() {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .order('id');

      if (error) throw error;

      // Fetch latest measurement for each station
      const stationsWithData = await Promise.all(
        data.map(async (station) => {
          const { data: latest } = await supabase
            .from('measurements')
            .select('*')
            .eq('station_id', station.id)
            .order('measurement_date', { ascending: false })
            .order('measurement_time', { ascending: false })
            .limit(1)
            .single();

          return {
            ...station,
            latest_measurement: latest || null
          };
        })
      );

      setStations(stationsWithData);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMeasurements(stationId) {
    try {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('station_id', stationId)
        .order('measurement_date', { ascending: true })
        .order('measurement_time', { ascending: true })
        .limit(parseInt(dateRange));

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error fetching measurements:', error);
    }
  }

  async function fetchWeather(stationId) {
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('station_id', stationId)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setWeather(data || null);
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  }

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const getTrendText = (trend) => {
    if (trend === 'up') return 'Creștere';
    if (trend === 'down') return 'Scădere';
    return 'Stabil';
  };

  const getStationImage = (name) => {
    const imageMap = {
      'Galați': 'https://images.unsplash.com/photo-1605126419000-1f42a7c8f384?w=800&h=400&fit=crop',
      'Brăila': 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&h=400&fit=crop',
      'Tulcea': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=400&fit=crop',
      'default': 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=800&h=400&fit=crop'
    };
    return imageMap[name] || imageMap['default'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  if (selectedStation) {
    const station = selectedStation;
    const latest = station.latest_measurement;

    return (
      <div className="min-h-screen bg-gray-50">
        <style jsx global>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        `}</style>

        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <button 
              onClick={() => setSelectedStation(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Înapoi la hartă
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Station Header Image */}
          <div className="relative h-64 rounded-xl overflow-hidden mb-8">
            <img 
              src={getStationImage(station.name)} 
              alt={station.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="text-sm opacity-90">Stație Hidrometrică</span>
              </div>
              <h1 className="text-4xl font-bold">{station.name}</h1>
              {latest && (
                <p className="text-sm opacity-90 mt-1">
                  Ultima actualizare: {latest.measurement_date} {latest.measurement_time}
                </p>
              )}
            </div>
          </div>

          {/* Current Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Nivel Actual</span>
                {latest && getTrendIcon(latest.trend)}
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {latest ? `${latest.water_level} cm` : 'N/A'}
              </div>
              {latest && (
                <div className="text-sm text-gray-500 mt-1">{getTrendText(latest.trend)}</div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">Temperatură Apă</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {latest?.water_temp ? `${latest.water_temp}°C` : 'N/A'}
              </div>
              <div className="text-sm text-gray-500 mt-1">Măsurată la suprafață</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="w-5 h-5 text-cyan-500" />
                <span className="text-sm text-gray-600">Vânt</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {weather?.wind_speed ? `${weather.wind_speed} km/h` : 'N/A'}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {weather?.wind_direction || 'N/A'}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-600">Umiditate</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {weather?.humidity ? `${weather.humidity}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-500 mt-1">Relativ ridicată</div>
            </div>
          </div>

          {/* Chart */}
          {measurements.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Date Istorice</h2>
                  <p className="text-sm text-gray-600">Evoluția nivelului și temperaturii apei</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('level')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        viewMode === 'level' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Nivel
                    </button>
                    <button
                      onClick={() => setViewMode('temp')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        viewMode === 'temp' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Temperatură
                    </button>
                  </div>

                  <select 
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="7">Ultimele 7 zile</option>
                    <option value="14">Ultimele 14 zile</option>
                    <option value="30">Ultimele 30 zile</option>
                    <option value="60">Ultimele 60 zile</option>
                    <option value="90">Ultimele 90 zile</option>
                  </select>
                </div>
              </div>

              <div className="h-80 flex items-center justify-center text-gray-500">
                Grafic în construcție - Date disponibile: {measurements.length} înregistrări
              </div>
            </div>
          )}

          {/* Station Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Informații Stație</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cod stație:</span>
                  <span className="font-medium">{station.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Coordonate:</span>
                  <span className="font-medium">{station.latitude}°N, {station.longitude}°E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sector:</span>
                  <span className="font-medium">{station.river_sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cotă de atenție:</span>
                  <span className="font-medium text-orange-600">{station.alert_level} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cotă de inundație:</span>
                  <span className="font-medium text-red-600">{station.flood_level} cm</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Condiții Meteo Actuale</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperatură aer:</span>
                  <span className="font-medium">{weather?.air_temp ? `${weather.air_temp}°C` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Presiune atmosferică:</span>
                  <span className="font-medium">{weather?.pressure ? `${weather.pressure} hPa` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vizibilitate:</span>
                  <span className="font-medium">{weather?.visibility ? `${weather.visibility} km` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Precipitații (24h):</span>
                  <span className="font-medium">{weather?.precipitation ? `${weather.precipitation} mm` : '0 mm'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prognoza:</span>
                  <span className="font-medium">{weather?.forecast || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cotele Dunării - Platformă Interactivă</h1>
          <p className="text-gray-600">Date în timp real de la toate stațiile hidrometrice AFDJ</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Map */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Hartă Interactivă</h2>
          
          <div className="relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-8 h-96 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" style={{opacity: 0.3}}>
              <path
                d="M 50 200 Q 150 180, 250 190 T 450 200 Q 550 210, 650 200 T 850 180"
                stroke="#3b82f6"
                strokeWidth="20"
                fill="none"
                strokeLinecap="round"
              />
            </svg>

            {stations.map((station, idx) => {
              const x = 50 + (idx * 70);
              const y = 180 + (Math.sin(idx * 0.5) * 30);
              const latest = station.latest_measurement;
              
              return (
                <div
                  key={station.id}
                  className="absolute cursor-pointer group"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => setSelectedStation(station)}
                >
                  <div className="relative">
                    <div className={`w-4 h-4 rounded-full border-4 border-white shadow-lg transition-all group-hover:scale-150 ${
                      latest?.trend === 'up' ? 'bg-green-500' :
                      latest?.trend === 'down' ? 'bg-red-500' : 
                      'bg-gray-500'
                    }`}></div>
                    
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                        <div className="font-bold mb-1">{station.name}</div>
                        {latest && (
                          <>
                            <div className="flex items-center gap-2">
                              <span>{latest.water_level} cm</span>
                              {getTrendIcon(latest.trend)}
                            </div>
                            {latest.water_temp && (
                              <div className="text-gray-300 mt-1">{latest.water_temp}°C</div>
                            )}
                          </>
                        )}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs font-medium text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {station.name}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Nivel în creștere</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-gray-600">Nivel stabil</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Nivel în scădere</span>
            </div>
          </div>
        </div>

        {/* Stations List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Toate Stațiile Hidrometrice</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map(station => {
              const latest = station.latest_measurement;
              
              return (
                <div
                  key={station.id}
                  onClick={() => setSelectedStation(station)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">
                      {station.name}
                    </h3>
                    {latest && getTrendIcon(latest.trend)}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nivel:</span>
                      <span className="font-medium">
                        {latest ? `${latest.water_level} cm` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temperatură:</span>
                      <span className="font-medium">
                        {latest?.water_temp ? `${latest.water_temp}°C` : 'N/A'}
                      </span>
                    </div>
                    {latest && (
                      <div className="text-xs text-gray-500 mt-2">
                        Actualizat: {latest.measurement_date}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## **FIȘIER 6: `.gitignore`**

**Name:** `.gitignore`
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

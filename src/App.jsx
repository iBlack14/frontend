import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Play, Pause, RefreshCw, Trash2 } from 'lucide-react';

const API_URL = (window.APP_CONFIG && window.APP_CONFIG.VITE_API_URL) || import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = (window.APP_CONFIG && window.APP_CONFIG.VITE_WS_URL) || import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export default function GoogleMapsScraper() {
    const [rubro, setRubro] = useState('minería');
    const [departamento, setDepartamento] = useState('Lima');
    const [pais, setPais] = useState('Perú');
    const [cantidad, setCantidad] = useState('100');
    const [headless, setHeadless] = useState(true);
    const [expandedSearch, setExpandedSearch] = useState(true);

    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentCount, setCurrentCount] = useState(0);
    const [results, setResults] = useState([]);
    const [logs, setLogs] = useState([]);

    const wsRef = useRef(null);
    const logsEndRef = useRef(null);

    // Departamentos de Perú
    const departamentos = [
        "Lima", "Arequipa", "Cusco", "Trujillo", "Chiclayo", "Piura", "Iquitos",
        "Huancayo", "Tacna", "Ica", "Juliaca", "Pucallpa", "Cajamarca", "Ayacucho",
        "Huánuco", "Chimbote", "Tarapoto", "Tumbes", "Puno", "Sullana"
    ];

    const paises = ["Perú", "Chile", "Argentina", "Colombia", "México"];

    // WebSocket connection
    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const connectWebSocket = () => {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('WebSocket conectado');
            addLog('WebSocket conectado', 'success');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            addLog('Error de conexión WebSocket', 'error');
        };

        ws.onclose = () => {
            console.log('WebSocket desconectado');
            // Reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };

        wsRef.current = ws;
    };

    const handleWebSocketMessage = (message) => {
        const { type, data } = message;

        switch (type) {
            case 'log':
                addLog(data.message, data.type || 'info');
                break;
            case 'progress':
                setProgress(data.percentage);
                setCurrentCount(data.current);
                break;
            case 'result':
                setResults(prev => [...prev, { ...data.data, id: data.index }]);
                break;
            case 'error':
                addLog(data.message, 'error');
                setIsRunning(false);
                setIsPaused(false);
                break;
            default:
                break;
        }
    };

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, message, type }]);
    };

    const startScraping = async () => {
        if (isPaused) {
            // Resume
            try {
                const response = await fetch(`${API_URL}/scraper/resume`, {
                    method: 'POST'
                });
                if (response.ok) {
                    setIsPaused(false);
                    setIsRunning(true);
                }
            } catch (error) {
                addLog('Error al reanudar: ' + error.message, 'error');
            }
            return;
        }

        // Start new scraping
        setIsRunning(true);
        setProgress(0);
        setCurrentCount(0);
        setResults([]);
        setLogs([]);

        try {
            const response = await fetch(`${API_URL}/scraper/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rubro,
                    departamento,
                    pais,
                    cantidad: parseInt(cantidad),
                    headless,
                    expanded_search: expandedSearch
                })
            });

            if (response.ok) {
                const data = await response.json();
                addLog(data.message, 'success');
            } else {
                const error = await response.json();
                addLog('Error: ' + error.detail, 'error');
                setIsRunning(false);
            }
        } catch (error) {
            addLog('Error al iniciar: ' + error.message, 'error');
            setIsRunning(false);
        }
    };

    const pauseScraping = async () => {
        try {
            const response = await fetch(`${API_URL}/scraper/pause`, {
                method: 'POST'
            });
            if (response.ok) {
                setIsPaused(true);
                setIsRunning(false);
            }
        } catch (error) {
            addLog('Error al pausar: ' + error.message, 'error');
        }
    };

    const stopScraping = async () => {
        try {
            const response = await fetch(`${API_URL}/scraper/stop`, {
                method: 'POST'
            });
            if (response.ok) {
                setIsRunning(false);
                setIsPaused(false);
            }
        } catch (error) {
            addLog('Error al detener: ' + error.message, 'error');
        }
    };

    const resetScraping = () => {
        stopScraping();
        setProgress(0);
        setCurrentCount(0);
        setResults([]);
        setLogs([]);
    };

    const exportToExcel = async () => {
        try {
            const response = await fetch(`${API_URL}/scraper/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rubro,
                    departamento,
                    pais,
                    cantidad: parseInt(cantidad)
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${rubro}-${departamento}-${new Date().toISOString().slice(0, 10)}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                addLog('Excel exportado exitosamente', 'success');
            } else {
                addLog('Error al exportar Excel', 'error');
            }
        } catch (error) {
            addLog('Error: ' + error.message, 'error');
        }
    };

    const getLogColor = (type) => {
        switch (type) {
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'info': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <Search className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-800">Google Maps Scraper</h1>
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">ULTRA</span>
                        </div>
                    </div>
                    <p className="text-gray-600 ml-14">Extracción limpia con búsqueda inteligente y exportación ordenada a Excel.</p>
                </div>

                {/* Configuration Panel */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuración de Búsqueda</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rubro</label>
                            <input
                                type="text"
                                value={rubro}
                                onChange={(e) => setRubro(e.target.value)}
                                disabled={isRunning}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                placeholder="Ej: minería, restaurante, hotel"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad por búsqueda</label>
                            <input
                                type="number"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                disabled={isRunning}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                placeholder="100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
                            <select
                                value={departamento}
                                onChange={(e) => setDepartamento(e.target.value)}
                                disabled={isRunning}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            >
                                {departamentos.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
                            <select
                                value={pais}
                                onChange={(e) => setPais(e.target.value)}
                                disabled={isRunning}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                            >
                                {paises.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={headless}
                                onChange={(e) => setHeadless(e.target.checked)}
                                disabled={isRunning}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span>Modo rápido (navegador oculto)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={expandedSearch}
                                onChange={(e) => setExpandedSearch(e.target.checked)}
                                disabled={isRunning}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span>Búsqueda inteligente (sinónimos y términos relacionados)</span>
                        </label>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex gap-3">
                        {!isRunning && !isPaused && (
                            <button
                                onClick={startScraping}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                            >
                                <Play className="w-5 h-5" />
                                Iniciar Extracción
                            </button>
                        )}

                        {isRunning && (
                            <button
                                onClick={pauseScraping}
                                className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition font-semibold"
                            >
                                <Pause className="w-5 h-5" />
                                Pausar
                            </button>
                        )}

                        {isPaused && (
                            <button
                                onClick={startScraping}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                            >
                                <Play className="w-5 h-5" />
                                Continuar
                            </button>
                        )}

                        <button
                            onClick={resetScraping}
                            className="flex items-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Reiniciar
                        </button>

                        {results.length > 0 && (
                            <button
                                onClick={exportToExcel}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold ml-auto"
                            >
                                <Download className="w-5 h-5" />
                                Exportar a Excel
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                {(isRunning || isPaused || progress > 0) && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Progreso de extracción</span>
                            <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                            {currentCount} de {cantidad} registros extraídos
                        </div>
                    </div>
                )}

                {/* Logs */}
                {logs.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Actividad</h2>
                        <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm">
                            {logs.map((log, index) => (
                                <div key={index} className={`mb-1 ${getLogColor(log.type)}`}>
                                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                )}

                {/* Results Table */}
                {results.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">Resultados de Extracción ({results.length})</h2>
                            <button
                                onClick={() => setResults([])}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpiar
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dirección</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reviews</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {results.map((result) => (
                                        <tr key={result.id} className="hover:bg-blue-50 transition">
                                            <td className="px-4 py-3 text-sm text-gray-700">{result.id}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{result.nombre}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{result.direccion}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{result.telefono}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {result.rating && (
                                                    <span className="inline-flex items-center gap-1 text-yellow-600 font-semibold">
                                                        ★ {result.rating}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{result.reviews}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {result.estado && (
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${result.estado.toLowerCase().includes('abierto')
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {result.estado}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

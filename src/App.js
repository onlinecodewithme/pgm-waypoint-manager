import React, { useState, useCallback } from 'react';
import MapViewer from './components/MapViewer';
import WaypointPanel from './components/WaypointPanel';
import './App.css';

function App() {
  const [waypoints, setWaypoints] = useState([]);

  const handleWaypointAdd = useCallback((waypoint) => {
    setWaypoints(prev => [...prev, waypoint]);
  }, []);

  const handleWaypointRemove = useCallback((waypointId) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== waypointId));
  }, []);

  const handleWaypointUpdate = useCallback((updatedWaypoint) => {
    setWaypoints(prev => 
      prev.map(wp => wp.id === updatedWaypoint.id ? updatedWaypoint : wp)
    );
  }, []);

  const handleLoadWaypoints = useCallback((loadedWaypoints) => {
    setWaypoints(loadedWaypoints);
  }, []);

  return (
    <div className="App">
      <div className="app-header">
        <h1>Occupancy Map Waypoint Manager</h1>
        <p>ROS2 Compatible Waypoint Management System</p>
      </div>
      
      <div className="app-content">
        <div className="map-container">
          <MapViewer
            waypoints={waypoints}
            onWaypointAdd={handleWaypointAdd}
            onWaypointRemove={handleWaypointRemove}
            onWaypointUpdate={handleWaypointUpdate}
          />
        </div>
        
        <WaypointPanel
          waypoints={waypoints}
          onWaypointUpdate={handleWaypointUpdate}
          onWaypointRemove={handleWaypointRemove}
          onLoadWaypoints={handleLoadWaypoints}
        />
      </div>
    </div>
  );
}

export default App;

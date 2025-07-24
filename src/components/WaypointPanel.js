import React, { useState } from 'react';
import './WaypointPanel.css';

const WaypointPanel = ({ waypoints, onWaypointUpdate, onWaypointRemove, onSaveWaypoints, onLoadWaypoints }) => {
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('#ff0000');

  const handleWaypointSelect = (waypoint) => {
    setSelectedWaypoint(waypoint);
    setEditingName(waypoint.name);
    setEditingColor(waypoint.color);
  };

  const handleUpdateWaypoint = () => {
    if (selectedWaypoint) {
      const updatedWaypoint = {
        ...selectedWaypoint,
        name: editingName,
        color: editingColor
      };
      onWaypointUpdate(updatedWaypoint);
      setSelectedWaypoint(updatedWaypoint);
    }
  };

  const handleExportWaypoints = () => {
    const waypointData = {
      waypoints: waypoints,
      metadata: {
        created: new Date().toISOString(),
        count: waypoints.length,
        format: 'xavier-waypoint-manager-v1.0'
      }
    };

    const dataStr = JSON.stringify(waypointData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `waypoints_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportWaypoints = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.waypoints && Array.isArray(data.waypoints)) {
            onLoadWaypoints(data.waypoints);
          } else {
            alert('Invalid waypoint file format');
          }
        } catch (error) {
          alert('Error reading waypoint file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const formatCoordinate = (value) => {
    return value.toFixed(3);
  };

  return (
    <div className="waypoint-panel">
      <div className="panel-header">
        <h2>Waypoint Manager</h2>
        <div className="panel-actions">
          <button onClick={handleExportWaypoints} className="export-btn">
            Export Waypoints
          </button>
          <label className="import-btn">
            Import Waypoints
            <input
              type="file"
              accept=".json"
              onChange={handleImportWaypoints}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="waypoint-list">
        <h3>Waypoints ({waypoints.length})</h3>
        {waypoints.length === 0 ? (
          <p className="no-waypoints">No waypoints added yet. Click on the map to add waypoints.</p>
        ) : (
          <div className="waypoint-items">
            {waypoints.map((waypoint, index) => (
              <div
                key={waypoint.id}
                className={`waypoint-item ${selectedWaypoint?.id === waypoint.id ? 'selected' : ''}`}
                onClick={() => handleWaypointSelect(waypoint)}
              >
                <div className="waypoint-header">
                  <div
                    className="waypoint-color"
                    style={{ backgroundColor: waypoint.color }}
                  ></div>
                  <span className="waypoint-name">{waypoint.name}</span>
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWaypointRemove(waypoint.id);
                      if (selectedWaypoint?.id === waypoint.id) {
                        setSelectedWaypoint(null);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="waypoint-coords">
                  X: {formatCoordinate(waypoint.x)}m, Y: {formatCoordinate(waypoint.y)}m
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedWaypoint && (
        <div className="waypoint-editor">
          <h3>Edit Waypoint</h3>
          <div className="editor-field">
            <label>Name:</label>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Waypoint name"
            />
          </div>
          <div className="editor-field">
            <label>Color:</label>
            <input
              type="color"
              value={editingColor}
              onChange={(e) => setEditingColor(e.target.value)}
            />
          </div>
          <div className="editor-field">
            <label>Position:</label>
            <div className="position-display">
              X: {formatCoordinate(selectedWaypoint.x)}m<br />
              Y: {formatCoordinate(selectedWaypoint.y)}m
            </div>
          </div>
          <div className="editor-actions">
            <button onClick={handleUpdateWaypoint} className="update-btn">
              Update Waypoint
            </button>
          </div>
        </div>
      )}

      <div className="instructions">
        <h3>Instructions</h3>
        <ul>
          <li>Click on the map to add a new waypoint</li>
          <li>Click and drag waypoints to move them</li>
          <li>Right-click on a waypoint to remove it</li>
          <li>Select a waypoint from the list to edit its properties</li>
          <li>Use Export/Import to save and load waypoint configurations</li>
        </ul>
      </div>
    </div>
  );
};

export default WaypointPanel;

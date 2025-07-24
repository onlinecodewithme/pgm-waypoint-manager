import React, { useRef, useEffect, useState, useCallback } from 'react';
import './MapViewer.css';

const MapViewer = ({ mapData, waypoints, onWaypointAdd, onWaypointRemove, onWaypointUpdate }) => {
  const canvasRef = useRef(null);
  const [mapImage, setMapImage] = useState(null);
  const [mapMetadata, setMapMetadata] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWaypoint, setDraggedWaypoint] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Load map metadata from YAML
  useEffect(() => {
    const loadMapMetadata = async () => {
      try {
        const response = await fetch('/sample-map.yaml');
        const yamlText = await response.text();
        
        // Simple YAML parser for our specific format
        const metadata = {};
        yamlText.split('\n').forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            if (key === 'resolution' || key === 'occupied_thresh' || key === 'free_thresh') {
              metadata[key] = parseFloat(value);
            } else if (key === 'origin') {
              // Parse origin array [x, y, theta]
              const originStr = value.replace(/[[\]]/g, '');
              metadata[key] = originStr.split(',').map(v => parseFloat(v.trim()));
            } else if (key === 'negate') {
              metadata[key] = parseInt(value);
            } else {
              metadata[key] = value;
            }
          }
        });
        
        setMapMetadata(metadata);
      } catch (error) {
        console.error('Error loading map metadata:', error);
      }
    };

    loadMapMetadata();
  }, []);

  // Load and convert PGM to displayable format
  useEffect(() => {
    const loadMapImage = async () => {
      try {
        // For now, we'll create a canvas representation of the PGM data
        // In a real application, you might want to convert PGM to PNG server-side
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // Create a simple representation (you would load actual PGM data here)
        const imageData = ctx.createImageData(400, 300);
        
        // Simulate occupancy grid colors
        for (let i = 0; i < imageData.data.length; i += 4) {
          const pixelIndex = i / 4;
          const x = pixelIndex % 400;
          const y = Math.floor(pixelIndex / 400);
          
          // Simple pattern to simulate the occupancy grid
          let value = 255; // Free space (white)
          
          // Walls (black)
          if (y < 5 || y > 295 || x < 5 || x > 395) value = 0;
          if ((x >= 75 && x <= 80 && y >= 50 && y <= 150) ||
              (y >= 75 && y <= 80 && x >= 75 && x <= 150) ||
              (x >= 200 && x <= 205 && y >= 25 && y <= 125) ||
              (x >= 100 && x <= 140 && y >= 180 && y <= 220) ||
              (x >= 250 && x <= 280 && y >= 250 && y <= 280)) {
            value = 0;
          }
          
          // Unknown areas (gray)
          if ((x >= 30 && x <= 60 && y >= 30 && y <= 60) ||
              (x >= 300 && x <= 330 && y >= 200 && y <= 230) ||
              (x >= 180 && x <= 210 && y >= 120 && y <= 150)) {
            value = 128;
          }
          
          imageData.data[i] = value;     // Red
          imageData.data[i + 1] = value; // Green
          imageData.data[i + 2] = value; // Blue
          imageData.data[i + 3] = 255;   // Alpha
        }
        
        ctx.putImageData(imageData, 0, 0);
        setMapImage(canvas);
      } catch (error) {
        console.error('Error loading map image:', error);
      }
    };

    loadMapImage();
  }, []);

  // Convert pixel coordinates to world coordinates
  const pixelToWorld = useCallback((pixelX, pixelY) => {
    if (!mapMetadata) return { x: 0, y: 0 };
    
    const worldX = mapMetadata.origin[0] + (pixelX * mapMetadata.resolution);
    const worldY = mapMetadata.origin[1] + ((300 - pixelY) * mapMetadata.resolution); // Flip Y axis
    
    return { x: worldX, y: worldY };
  }, [mapMetadata]);

  // Convert world coordinates to pixel coordinates
  const worldToPixel = useCallback((worldX, worldY) => {
    if (!mapMetadata) return { x: 0, y: 0 };
    
    const pixelX = (worldX - mapMetadata.origin[0]) / mapMetadata.resolution;
    const pixelY = 300 - ((worldY - mapMetadata.origin[1]) / mapMetadata.resolution); // Flip Y axis
    
    return { x: pixelX, y: pixelY };
  }, [mapMetadata]);

  // Draw the map and waypoints
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapImage) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw map
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(offset.x, offset.y);
    ctx.drawImage(mapImage, 0, 0);

    // Draw waypoints
    waypoints.forEach((waypoint, index) => {
      const pixel = worldToPixel(waypoint.x, waypoint.y);
      
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = waypoint.color || '#ff0000';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw waypoint label
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(waypoint.name || `WP${index + 1}`, pixel.x + 12, pixel.y - 8);
    });

    ctx.restore();
  }, [mapImage, waypoints, scale, offset, worldToPixel]);

  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle canvas click for adding waypoints
  const handleCanvasClick = useCallback((event) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale - offset.x;
    const y = (event.clientY - rect.top) / scale - offset.y;

    // Check if clicking on existing waypoint
    const clickedWaypoint = waypoints.find(waypoint => {
      const pixel = worldToPixel(waypoint.x, waypoint.y);
      const distance = Math.sqrt((pixel.x - x) ** 2 + (pixel.y - y) ** 2);
      return distance <= 10;
    });

    if (clickedWaypoint) {
      // Right click to remove waypoint
      if (event.button === 2) {
        onWaypointRemove(clickedWaypoint.id);
      }
    } else {
      // Add new waypoint
      const worldCoords = pixelToWorld(x, y);
      const newWaypoint = {
        id: Date.now(),
        name: `Waypoint ${waypoints.length + 1}`,
        x: worldCoords.x,
        y: worldCoords.y,
        color: '#ff0000'
      };
      onWaypointAdd(newWaypoint);
    }
  }, [isDragging, scale, offset, waypoints, worldToPixel, pixelToWorld, onWaypointAdd, onWaypointRemove]);

  // Handle mouse down for dragging waypoints
  const handleMouseDown = useCallback((event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale - offset.x;
    const y = (event.clientY - rect.top) / scale - offset.y;

    const clickedWaypoint = waypoints.find(waypoint => {
      const pixel = worldToPixel(waypoint.x, waypoint.y);
      const distance = Math.sqrt((pixel.x - x) ** 2 + (pixel.y - y) ** 2);
      return distance <= 10;
    });

    if (clickedWaypoint) {
      setIsDragging(true);
      setDraggedWaypoint(clickedWaypoint);
    }
  }, [scale, offset, waypoints, worldToPixel]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((event) => {
    if (!isDragging || !draggedWaypoint) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale - offset.x;
    const y = (event.clientY - rect.top) / scale - offset.y;

    const worldCoords = pixelToWorld(x, y);
    const updatedWaypoint = {
      ...draggedWaypoint,
      x: worldCoords.x,
      y: worldCoords.y
    };

    onWaypointUpdate(updatedWaypoint);
  }, [isDragging, draggedWaypoint, scale, offset, pixelToWorld, onWaypointUpdate]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedWaypoint(null);
  }, []);

  return (
    <div className="map-viewer">
      <div className="map-controls">
        <button onClick={() => setScale(scale * 1.2)}>Zoom In</button>
        <button onClick={() => setScale(scale / 1.2)}>Zoom Out</button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>Reset View</button>
        <span>Scale: {scale.toFixed(2)}x</span>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ border: '1px solid #ccc', cursor: isDragging ? 'grabbing' : 'crosshair' }}
      />
      
      <div className="map-info">
        {mapMetadata && (
          <div>
            <p>Resolution: {mapMetadata.resolution}m/pixel</p>
            <p>Origin: [{mapMetadata.origin?.join(', ')}]</p>
            <p>Waypoints: {waypoints.length}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapViewer;

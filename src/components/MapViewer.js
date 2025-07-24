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
        const lines = yamlText.split('\n');
        let i = 0;
        
        while (i < lines.length) {
          const line = lines[i].trim();
          if (!line || line.startsWith('#')) {
            i++;
            continue;
          }
          
          const [key, value] = line.split(':').map(s => s.trim());
          
          if (key && value !== undefined) {
            if (key === 'resolution' || key === 'occupied_thresh' || key === 'free_thresh') {
              metadata[key] = parseFloat(value);
            } else if (key === 'negate') {
              metadata[key] = parseInt(value);
            } else if (key === 'origin') {
              // Handle YAML array format for origin
              if (value === '') {
                // Multi-line array format
                const originArray = [];
                i++;
                while (i < lines.length && lines[i].startsWith('-')) {
                  const arrayValue = lines[i].trim().substring(1).trim();
                  originArray.push(parseFloat(arrayValue));
                  i++;
                }
                metadata[key] = originArray;
                i--; // Adjust for the outer loop increment
              } else {
                // Single line array format [x, y, theta]
                const originStr = value.replace(/[[\]]/g, '');
                metadata[key] = originStr.split(',').map(v => parseFloat(v.trim()));
              }
            } else {
              metadata[key] = value;
            }
          }
          i++;
        }
        
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
        // Load the actual PGM file
        try {
          const response = await fetch('/sample-map.pgm');
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Parse PGM header
          let headerEnd = 0;
          let headerStr = '';
          for (let i = 0; i < uint8Array.length; i++) {
            headerStr += String.fromCharCode(uint8Array[i]);
            if (headerStr.includes('\n255\n')) {
              headerEnd = i + 1;
              break;
            }
          }
          
          // Extract image data
          const imageData = uint8Array.slice(headerEnd);
          
          // Create canvas with the actual map dimensions
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          
          // Create ImageData from PGM data
          const canvasImageData = ctx.createImageData(800, 600);
          
          for (let i = 0; i < imageData.length; i++) {
            const pixelValue = imageData[i];
            const canvasIndex = i * 4;
            
            canvasImageData.data[canvasIndex] = pixelValue;     // Red
            canvasImageData.data[canvasIndex + 1] = pixelValue; // Green
            canvasImageData.data[canvasIndex + 2] = pixelValue; // Blue
            canvasImageData.data[canvasIndex + 3] = 255;        // Alpha
          }
          
          ctx.putImageData(canvasImageData, 0, 0);
          setMapImage(canvas);
        } catch (error) {
          console.error('Error loading PGM file, using fallback:', error);
          
          // Fallback to simple representation
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          
          const imageData = ctx.createImageData(800, 600);
          
          // Simple fallback pattern
          for (let i = 0; i < imageData.data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = pixelIndex % 800;
            const y = Math.floor(pixelIndex / 800);
            
            let value = 255; // Free space (white)
            
            // Basic walls
            if (y < 8 || y > 592 || x < 8 || x > 792) value = 0;
            
            imageData.data[i] = value;
            imageData.data[i + 1] = value;
            imageData.data[i + 2] = value;
            imageData.data[i + 3] = 255;
          }
          
          ctx.putImageData(imageData, 0, 0);
          setMapImage(canvas);
        }
      } catch (error) {
        console.error('Error loading map image:', error);
      }
    };

    loadMapImage();
  }, []);

  // Convert pixel coordinates to world coordinates
  const pixelToWorld = useCallback((pixelX, pixelY) => {
    if (!mapMetadata || !mapMetadata.origin || !mapMetadata.resolution) {
      return { x: 0, y: 0 };
    }
    
    const worldX = mapMetadata.origin[0] + (pixelX * mapMetadata.resolution);
    const worldY = mapMetadata.origin[1] + ((600 - pixelY) * mapMetadata.resolution); // Flip Y axis
    
    return { x: worldX, y: worldY };
  }, [mapMetadata]);

  // Convert world coordinates to pixel coordinates
  const worldToPixel = useCallback((worldX, worldY) => {
    if (!mapMetadata || !mapMetadata.origin || !mapMetadata.resolution) {
      return { x: 0, y: 0 };
    }
    
    const pixelX = (worldX - mapMetadata.origin[0]) / mapMetadata.resolution;
    const pixelY = 600 - ((worldY - mapMetadata.origin[1]) / mapMetadata.resolution); // Flip Y axis
    
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

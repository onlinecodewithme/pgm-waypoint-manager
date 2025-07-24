#!/usr/bin/env python3
"""
Waypoint Manager Backend
Flask API for managing waypoints and interfacing with ROS2
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import yaml

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configuration
WAYPOINTS_FILE = 'waypoints.json'
MAP_METADATA_FILE = '../public/sample-map.yaml'

class WaypointManager:
    def __init__(self):
        self.waypoints = self.load_waypoints()
        self.map_metadata = self.load_map_metadata()
    
    def load_waypoints(self):
        """Load waypoints from JSON file"""
        if os.path.exists(WAYPOINTS_FILE):
            try:
                with open(WAYPOINTS_FILE, 'r') as f:
                    data = json.load(f)
                    return data.get('waypoints', [])
            except Exception as e:
                print(f"Error loading waypoints: {e}")
                return []
        return []
    
    def save_waypoints(self, waypoints):
        """Save waypoints to JSON file"""
        try:
            data = {
                'waypoints': waypoints,
                'metadata': {
                    'updated': datetime.now().isoformat(),
                    'count': len(waypoints),
                    'format': 'xavier-waypoint-manager-v1.0'
                }
            }
            with open(WAYPOINTS_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            self.waypoints = waypoints
            return True
        except Exception as e:
            print(f"Error saving waypoints: {e}")
            return False
    
    def load_map_metadata(self):
        """Load map metadata from YAML file"""
        try:
            with open(MAP_METADATA_FILE, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading map metadata: {e}")
            return None
    
    def add_waypoint(self, waypoint):
        """Add a new waypoint"""
        waypoint['id'] = int(datetime.now().timestamp() * 1000)  # Unique ID
        waypoint['created'] = datetime.now().isoformat()
        self.waypoints.append(waypoint)
        self.save_waypoints(self.waypoints)
        return waypoint
    
    def update_waypoint(self, waypoint_id, updated_data):
        """Update an existing waypoint"""
        for i, wp in enumerate(self.waypoints):
            if wp['id'] == waypoint_id:
                self.waypoints[i].update(updated_data)
                self.waypoints[i]['updated'] = datetime.now().isoformat()
                self.save_waypoints(self.waypoints)
                return self.waypoints[i]
        return None
    
    def remove_waypoint(self, waypoint_id):
        """Remove a waypoint"""
        self.waypoints = [wp for wp in self.waypoints if wp['id'] != waypoint_id]
        self.save_waypoints(self.waypoints)
        return True
    
    def get_waypoints(self):
        """Get all waypoints"""
        return self.waypoints
    
    def clear_waypoints(self):
        """Clear all waypoints"""
        self.waypoints = []
        self.save_waypoints(self.waypoints)
        return True

# Initialize waypoint manager
waypoint_manager = WaypointManager()

@app.route('/api/waypoints', methods=['GET'])
def get_waypoints():
    """Get all waypoints"""
    return jsonify({
        'success': True,
        'waypoints': waypoint_manager.get_waypoints(),
        'count': len(waypoint_manager.waypoints)
    })

@app.route('/api/waypoints', methods=['POST'])
def add_waypoint():
    """Add a new waypoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        required_fields = ['name', 'x', 'y']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        waypoint = waypoint_manager.add_waypoint(data)
        return jsonify({
            'success': True,
            'waypoint': waypoint,
            'message': 'Waypoint added successfully'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/waypoints/<int:waypoint_id>', methods=['PUT'])
def update_waypoint(waypoint_id):
    """Update an existing waypoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        waypoint = waypoint_manager.update_waypoint(waypoint_id, data)
        if waypoint:
            return jsonify({
                'success': True,
                'waypoint': waypoint,
                'message': 'Waypoint updated successfully'
            })
        else:
            return jsonify({'success': False, 'error': 'Waypoint not found'}), 404
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/waypoints/<int:waypoint_id>', methods=['DELETE'])
def remove_waypoint(waypoint_id):
    """Remove a waypoint"""
    try:
        waypoint_manager.remove_waypoint(waypoint_id)
        return jsonify({
            'success': True,
            'message': 'Waypoint removed successfully'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/waypoints/clear', methods=['DELETE'])
def clear_waypoints():
    """Clear all waypoints"""
    try:
        waypoint_manager.clear_waypoints()
        return jsonify({
            'success': True,
            'message': 'All waypoints cleared successfully'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/map/metadata', methods=['GET'])
def get_map_metadata():
    """Get map metadata"""
    return jsonify({
        'success': True,
        'metadata': waypoint_manager.map_metadata
    })

@app.route('/api/waypoints/export', methods=['GET'])
def export_waypoints():
    """Export waypoints in ROS2 compatible format"""
    try:
        waypoints = waypoint_manager.get_waypoints()
        
        # Convert to ROS2 navigation format
        ros2_waypoints = []
        for wp in waypoints:
            ros2_waypoint = {
                'header': {
                    'frame_id': 'map',
                    'stamp': {'sec': 0, 'nanosec': 0}
                },
                'pose': {
                    'position': {
                        'x': float(wp['x']),
                        'y': float(wp['y']),
                        'z': 0.0
                    },
                    'orientation': {
                        'x': 0.0,
                        'y': 0.0,
                        'z': 0.0,
                        'w': 1.0
                    }
                },
                'name': wp['name'],
                'id': wp['id']
            }
            ros2_waypoints.append(ros2_waypoint)
        
        export_data = {
            'waypoints': ros2_waypoints,
            'metadata': {
                'format': 'ros2_navigation_waypoints',
                'frame_id': 'map',
                'exported': datetime.now().isoformat(),
                'count': len(ros2_waypoints)
            }
        }
        
        return jsonify({
            'success': True,
            'data': export_data
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'waypoint_count': len(waypoint_manager.waypoints)
    })

if __name__ == '__main__':
    print("Starting Xavier Waypoint Manager Backend...")
    print(f"Waypoints file: {WAYPOINTS_FILE}")
    print(f"Map metadata file: {MAP_METADATA_FILE}")
    print(f"Loaded {len(waypoint_manager.waypoints)} waypoints")
    
    app.run(debug=True, host='0.0.0.0', port=5000)

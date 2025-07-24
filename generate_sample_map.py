#!/usr/bin/env python3
import numpy as np
from PIL import Image

def create_sample_occupancy_map():
    # Create a 400x300 occupancy grid (20m x 15m at 0.05m resolution)
    width, height = 400, 300
    
    # Initialize with free space (255 = free, 0 = occupied, 128 = unknown)
    occupancy_grid = np.full((height, width), 255, dtype=np.uint8)
    
    # Add walls (outer boundaries)
    occupancy_grid[0:5, :] = 0  # Top wall
    occupancy_grid[-5:, :] = 0  # Bottom wall
    occupancy_grid[:, 0:5] = 0  # Left wall
    occupancy_grid[:, -5:] = 0  # Right wall
    
    # Add interior walls and obstacles
    # Vertical wall
    occupancy_grid[50:150, 75:80] = 0
    
    # Horizontal wall
    occupancy_grid[75:80, 75:150] = 0
    
    # Room divider
    occupancy_grid[25:125, 200:205] = 0
    
    # Some furniture/obstacles
    occupancy_grid[180:220, 100:140] = 0  # Table
    occupancy_grid[250:280, 250:280] = 0  # Chair
    
    # Add some unknown areas
    occupancy_grid[30:60, 30:60] = 128
    occupancy_grid[200:230, 300:330] = 128
    occupancy_grid[120:150, 180:210] = 128
    
    # Create PIL Image and save as PGM
    img = Image.fromarray(occupancy_grid, mode='L')
    img.save('xavier-waypoint-manager/public/sample-map.pgm')
    print("Sample occupancy map created: sample-map.pgm")
    print(f"Map dimensions: {width}x{height}")
    print("Values: 0=occupied, 128=unknown, 255=free")

if __name__ == "__main__":
    create_sample_occupancy_map()

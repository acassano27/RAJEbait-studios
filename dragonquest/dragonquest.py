"""
ARCADE 3.x ADVENTURE GAME SKELETON
====================================

HOW ARCADE LOOPS WORK:
Unlike top-to-bottom Python scripts, Arcade games run a continuous loop:
  1. on_setup() runs ONCE at startup
  2. on_update() runs ~60 times per second (delta_time ≈ 0.0167)
  3. on_draw() runs ~60 times per second
  4. Event handlers (on_key_press, etc.) trigger when you press keys

The game state (player position, items, dragons) persists between frames.
We modify it in on_update() and draw it in on_draw().

GAME GOAL:
- Explore 3 student dungeons from a central hub
- Collect one chalice piece from each dungeon
- Find the secret sword (hidden somewhere!)
- Win by collecting all 3 chalice pieces
- Avoid dragons without the sword — touching = death & reset
- Kill dragons by touching them WITH the sword

MOVEMENT: Arrow keys move one grid cell at a time
EDGE TRANSITION: Walk off the edge of the screen to change rooms
"""

import arcade
from collections import deque

# ============================================================================
# GAME CONSTANTS
# ============================================================================

SCREEN_WIDTH = 960
SCREEN_HEIGHT = 720
CELL_SIZE = 48

# Room grid dimensions (width x height in cells)
ROOM_WIDTH = 20
ROOM_HEIGHT = 15

# Tile types
FLOOR = 0
WALL = 1
DOOR = 2

# Colors
COLOR_WALL = arcade.color.DARK_GRAY
COLOR_FLOOR = arcade.color.LIGHT_GRAY
COLOR_PLAYER = arcade.color.YELLOW
COLOR_SWORD = arcade.color.GOLDEN_POPPY
COLOR_CHALICE = arcade.color.GLITTER
COLOR_DRAGON = arcade.color.YELLOW_GREEN
COLOR_TEXT = arcade.color.WHITE

# ============================================================================
# ROOM DEFINITIONS (Module-level data)
# ============================================================================

def create_hub_room():
    """Central hub with 3 doors leading to student dungeons."""
    # 0 = floor, 1 = wall, 2 = door/exit
    room = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
    return {
        "name": "HUB",
        "room": room,
        "dragons": {
            "hub_dragon": (12, 12)
        },  # No dragons in hub
        "items": {},    # No items in hub
        "spawn_row": 12,
        "spawn_col": 10,
        "colors": {
            "wall": arcade.color.DARK_SLATE_BLUE,
            "floor": arcade.color.SLATE_BLUE,
            "door": arcade.color.LIGHT_BLUE
        }
    }

# ===== TODO: DUNGEON 1 - STUDENT NAME =====
# Design your dungeon! Replace the room array with your own layout.
# Tip: Use 0=floor, 1=wall, 2=door/exit. Make it 20 wide x 15 tall.
def create_dungeon_1():
    """Example dungeon 1: The Goblin Grotto."""
    room = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
    return {
        "name": "DUNGEON 1: Goblin Grotto",
        "room": room,
        "dragons": {
            "d1": (5, 5)   # Dragon at row 5, col 5
        },
        "items": {
            "chalice_1": (10, 10)  # Chalice piece at row 10, col 10
        },
        "spawn_row": 13,
        "spawn_col": 1,
        "colors": {
            "wall": arcade.color.DARK_GREEN,
            "floor": arcade.color.MEDIUM_SEA_GREEN,
            "door": arcade.color.SEA_GREEN
        }
    }

# ===== TODO: DUNGEON 2 - STUDENT NAME =====
# Design your dungeon! Replace the room array with your own layout.
# Tip: One of the three dungeons will have the SWORD. Which one is yours?
def create_dungeon_2():
    """Example dungeon 2: The Crystal Cavern (contains the SWORD!)."""
    room = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
    return {
        "name": "DUNGEON 2: Crystal Cavern",
        "room": room,
        "dragons": {
            "d2": (6, 7)   # Dragon at row 6, col 7
        },
        "items": {
            "sword": (5, 15),      # SWORD here! Students find it by exploring.
            "chalice_2": (2, 2)    # Chalice piece at row 2, col 2
        },
        "spawn_row": 13,
        "spawn_col": 1,
        "colors": {
            "wall": arcade.color.DARK_BLUE,
            "floor": arcade.color.LIGHT_BLUE,
            "door": arcade.color.ROYAL_BLUE
        }
    }

# ===== TODO: DUNGEON 3 - STUDENT NAME =====
# Design your dungeon! Replace the room array with your own layout.
# Tip: Try adding 2 dragons, or a harder maze!
def create_dungeon_3():
    """Example dungeon 3: The Dragon's Den."""
    room = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
        [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]
    return {
        "name": "DUNGEON 3: Dragon's Den",
        "room": room,
        "dragons": {
            "d3a": (4, 10),
            "d3b": (9, 5)   # Two dragons!
        },
        "items": {
            "chalice_3": (6, 16)   # Chalice piece at row 6, col 16
        },
        "spawn_row": 13,
        "spawn_col": 1,
        "colors": {
            "wall": arcade.color.MAROON,
            "floor": arcade.color.DARK_RED,
            "door": arcade.color.RED
        }
    }

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def grid_to_pixel(row, col):
    """Convert grid coordinates (row, col) to pixel coordinates (x, y)."""
    x = col * CELL_SIZE + CELL_SIZE // 2
    y = SCREEN_HEIGHT - row * CELL_SIZE + CELL_SIZE // 2
    return x, y

def is_walkable(room, row, col):
    """Check if a grid cell is passable (not a wall)."""
    if row < 0 or row >= ROOM_HEIGHT or col < 0 or col >= ROOM_WIDTH:
        return False
    return room[row][col] != WALL

def move_dragon(room, current_row, current_col, target_row, target_col):
    """Move a dragon one step along the shortest walkable path to the player."""
    start = (current_row, current_col)
    target = (target_row, target_col)
    if start == target:
        return start

    paths = {start: None}
    frontier = deque([start])

    while frontier and target not in paths:
        row, col = frontier.popleft()
        for row_delta, col_delta in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            neighbor = (row + row_delta, col + col_delta)
            if neighbor not in paths and is_walkable(room, *neighbor):
                paths[neighbor] = (row, col)
                frontier.append(neighbor)

    if target not in paths:
        return start

    next_step = target
    while paths[next_step] != start:
        next_step = paths[next_step]
    return next_step

# ============================================================================
# MAIN GAME CLASS
# ============================================================================

class AdventureGame(arcade.Window):
    """Main game class. Runs the continuous game loop."""
    
    def __init__(self):
        super().__init__(SCREEN_WIDTH, SCREEN_HEIGHT, "Adventure Game")
        
        # Set background color
        self.background_color = arcade.color.BLACK
        
        # ===== GAME STATE =====
        
        # Current room name (key into self.dungeons dict)
        self.current_room_name = "HUB"
        
        # Player position (grid coordinates)
        self.player_row = 0
        self.player_col = 0
        
        # Player inventory
        self.has_sword = False
        self.chalice_pieces = 0
        self.total_chalice_pieces = 3
        
        # Dragon positions per room: {"DUNGEON1": {"d1": (r, c), ...}, ...}
        self.dragon_positions = {}
        
        # Dragon original spawn positions (for respawn on death)
        self.dragon_spawns = {}
        
        # Items on floor per room: {"DUNGEON1": {"chalice_1": (r, c), "sword": (r, c), ...}, ...}
        self.items = {}
        
        # Sword original position (for respawn on death)
        self.sword_spawn = None
        
        # Whether each item has been picked up (persists across deaths)
        self.item_picked_up = {}
        
        # Game over state
        self.game_won = False
        
        # Dragon move counter (dragons move every 10 frames)
        self.frame_count = 0
        
        # ===== INITIALIZE DUNGEONS =====
        self.dungeons = {
            "HUB": create_hub_room(),
            "DUNGEON1": create_dungeon_1(),
            "DUNGEON2": create_dungeon_2(),
            "DUNGEON3": create_dungeon_3(),
        }
        
        # Initialize dragon positions and item tracking
        for room_name, dungeon in self.dungeons.items():
            self.dragon_positions[room_name] = dungeon["dragons"].copy()
            self.dragon_spawns[room_name] = dungeon["dragons"].copy()
            self.items[room_name] = dungeon["items"].copy()
            
            # Find sword spawn location
            if "sword" in dungeon["items"]:
                self.sword_spawn = dungeon["items"]["sword"]
        
        # Start in hub
        self.spawn_player_at_current_room()
    
    def spawn_player_at_current_room(self):
        """Spawn player at the designated spawn point for the current room."""
        dungeon = self.dungeons[self.current_room_name]
        self.player_row = dungeon["spawn_row"]
        self.player_col = dungeon["spawn_col"]
    
    def on_update(self, delta_time):
        """Called ~60 times per second. Update game logic here."""
        
        if self.game_won:
            return  # Stop updating if game is won
        
        # ===== MOVE DRAGONS =====
        self.frame_count += 1
        if self.frame_count >= 10:
            self.frame_count = 0
            
            # Move all dragons in current room
            room = self.dungeons[self.current_room_name]["room"]
            for dragon_name in self.dragon_positions[self.current_room_name]:
                r, c = self.dragon_positions[self.current_room_name][dragon_name]
                new_r, new_c = move_dragon(
                    room, r, c, self.player_row, self.player_col
                )
                self.dragon_positions[self.current_room_name][dragon_name] = (new_r, new_c)
        
        # ===== CHECK FOR ITEM PICKUP =====
        for item_name, (item_r, item_c) in list(self.items[self.current_room_name].items()):
            if self.player_row == item_r and self.player_col == item_c:
                # Pick up item
                self.item_picked_up[item_name] = True
                
                if item_name == "sword":
                    self.has_sword = True
                    del self.items[self.current_room_name][item_name]
                elif "chalice" in item_name:
                    self.chalice_pieces += 1
                    del self.items[self.current_room_name][item_name]
        
        # ===== CHECK FOR DRAGON COLLISION =====
        for dragon_name, (dragon_r, dragon_c) in self.dragon_positions[self.current_room_name].items():
            if self.player_row == dragon_r and self.player_col == dragon_c:
                if self.has_sword:
                    # Kill the dragon
                    del self.dragon_positions[self.current_room_name][dragon_name]
                    break  # Only kill one dragon per frame
                else:
                    # Player dies! Reset game state.
                    self.die()
                    return
        
        # ===== CHECK FOR WIN CONDITION =====
        if self.chalice_pieces >= self.total_chalice_pieces:
            self.game_won = True
    
    def on_draw(self):
        """Called ~60 times per second. Draw everything here."""
        self.clear()
        
        if self.game_won:
            # Draw win screen
            arcade.draw_text(
                "YOU WIN!",
                SCREEN_WIDTH // 2 - 100,
                SCREEN_HEIGHT // 2,
                arcade.color.YELLOW,
                60
            )
            arcade.draw_text(
                "You collected all chalice pieces!",
                SCREEN_WIDTH // 2 - 200,
                SCREEN_HEIGHT // 2 - 80,
                arcade.color.WHITE,
                24
            )
            return
        
        # ===== DRAW ROOM =====
        dungeon = self.dungeons[self.current_room_name]
        room = dungeon["room"]
        colors = dungeon["colors"]
        
        for row in range(ROOM_HEIGHT):
            for col in range(ROOM_WIDTH):
                x, y = grid_to_pixel(row, col)
                
                if room[row][col] == WALL:
                    arcade.draw_rect_filled(
                        arcade.XYWH(x - CELL_SIZE // 2, y - CELL_SIZE // 2, CELL_SIZE, CELL_SIZE),
                        colors["wall"]
                    )
                elif room[row][col] == DOOR:
                    arcade.draw_rect_filled(
                        arcade.XYWH(x - CELL_SIZE // 2, y - CELL_SIZE // 2, CELL_SIZE, CELL_SIZE),
                        colors["door"]
                    )
                else:  # FLOOR
                    arcade.draw_rect_filled(
                        arcade.XYWH(x - CELL_SIZE // 2, y - CELL_SIZE // 2, CELL_SIZE, CELL_SIZE),
                        colors["floor"]
                    )
                
                # Draw grid lines
                arcade.draw_rect_outline(
                    arcade.XYWH(x - CELL_SIZE // 2, y - CELL_SIZE // 2, CELL_SIZE, CELL_SIZE),
                    arcade.color.DARK_GRAY,
                    1
                )
        
        # ===== DRAW ITEMS =====
        for item_name, (item_r, item_c) in self.items[self.current_room_name].items():
            x, y = grid_to_pixel(item_r, item_c)
            if item_name == "sword":
                # Draw sword as a star-like shape
                arcade.draw_text(
                    "↗",
                    x - 52,
                    y - 47,
                    COLOR_SWORD,
                    52
                )
            else:
                # Draw chalice shard
                arcade.draw_triangle_filled(x-48, y-48, x-24, y, x, y-24, COLOR_CHALICE)
        
        # ===== DRAW DRAGONS =====
        for dragon_name, (dragon_r, dragon_c) in self.dragon_positions[self.current_room_name].items():
            x, y = grid_to_pixel(dragon_r, dragon_c)
            x, y = x-25, y-23 # Altered to fix offset
            arcade.draw_parabola_filled(x-24, y-64, x+30, 72, COLOR_DRAGON, 180)
            arcade.draw_parabola_outline(x-24, y-70, x+30, 95, COLOR_DRAGON, 15, 180)
            # Draw eyes and eyebrows
            arcade.draw_ellipse_filled(x - 3, y+4, 12, 18, arcade.color.YELLOW_ROSE)
            arcade.draw_ellipse_filled(x + 6, y+4, 12, 18, arcade.color.YELLOW_ROSE)
            arcade.draw_ellipse_filled(x - 4, y+3, 5, 10, arcade.color.BLACK)
            arcade.draw_ellipse_filled(x + 5, y+3, 5, 10, arcade.color.BLACK)
            arcade.draw_parabola_outline(x-12, y-3, x+12, 25, arcade.color.SEAL_BROWN, 15, 180)
            # Draw mouth
            arcade.draw_parabola_filled(x-8, y-40, x+14, 20, arcade.color.DEEP_CARMINE, 0)

        # ===== DRAW PLAYER =====
        px, py = grid_to_pixel(self.player_row, self.player_col)
        arcade.draw_circle_filled(px-24, py-24, 24, COLOR_PLAYER)
        # Draw eyes
        arcade.draw_circle_filled(px-30, py-20, 3, arcade.color.BLACK)
        arcade.draw_circle_filled(px-18, py-20, 3, arcade.color.BLACK)
        # Draw mouth
        arcade.draw_parabola_outline(px-32, py-36, px-16, 3, arcade.color.BLACK, 9, 180)
        
        # ===== DRAW HUD =====
        hud_y = SCREEN_HEIGHT - 40
        
        # Room name
        arcade.draw_text(
            f"Room: {self.current_room_name}",
            20,
            hud_y,
            COLOR_TEXT,
            18
        )
        
        # Sword status
        sword_text = "Sword: YES" if self.has_sword else "Sword: NO"
        arcade.draw_text(
            sword_text,
            320,
            hud_y,
            COLOR_TEXT,
            18
        )
        
        # Chalice pieces collected
        arcade.draw_text(
            f"Chalice: {self.chalice_pieces}/{self.total_chalice_pieces}",
            640,
            hud_y,
            COLOR_TEXT,
            18
        )
    
    def on_key_press(self, key, modifiers):
        """Called when a key is pressed."""
        
        if self.game_won:
            return  # Ignore input if game is won
        
        room = self.dungeons[self.current_room_name]["room"]
        new_row, new_col = self.player_row, self.player_col
        
        # Move based on arrow key
        if key == arcade.key.UP:
            new_row -= 1
        elif key == arcade.key.DOWN:
            new_row += 1
        elif key == arcade.key.LEFT:
            new_col -= 1
        elif key == arcade.key.RIGHT:
            new_col += 1
        
        # ===== CHECK FOR EDGE TRANSITION =====
        # Exiting left
        if new_col < 0:
            if self.current_room_name == "DUNGEON1":
                self.current_room_name = "HUB"
                self.spawn_player_at_current_room()
            elif self.current_room_name == "DUNGEON2":
                self.current_room_name = "HUB"
                self.spawn_player_at_current_room()
            elif self.current_room_name == "DUNGEON3":
                self.current_room_name = "HUB"
                self.spawn_player_at_current_room()
            return
        
        # Exiting right
        if new_col >= ROOM_WIDTH:
            if self.current_room_name == "HUB":
                if self.player_row == 3:
                    self.current_room_name = "DUNGEON1"
                elif self.player_row == 7:
                    self.current_room_name = "DUNGEON2"
                elif self.player_row == 11:
                    self.current_room_name = "DUNGEON3"
                else:
                    return  # Not at a door row, can't exit
                self.spawn_player_at_current_room()
                return
            else:
                new_col = ROOM_WIDTH - 1  # Can't exit right from dungeons
        
        # ===== WALL COLLISION =====
        if not is_walkable(room, new_row, new_col):
            return  # Can't move into walls
        
        # ===== EXECUTE MOVE =====
        self.player_row = new_row
        self.player_col = new_col
    
    def die(self):
        """Player dies! Reset to hub."""
        # Reset position
        self.current_room_name = "HUB"
        self.spawn_player_at_current_room()
        
        # Reset inventory
        self.has_sword = False
        self.chalice_pieces = 0
        
        # Reset items on floor (for items not yet picked up)
        for room_name, dungeon in self.dungeons.items():
            self.items[room_name] = dungeon["items"].copy()
        
        # Restore sword to spawn location
        if self.sword_spawn:
            dungeon_name = "DUNGEON2"  # Sword is in dungeon 2
            self.items[dungeon_name]["sword"] = self.sword_spawn
        
        # Revive all dragons
        for room_name in self.dragon_positions:
            self.dragon_positions[room_name] = self.dragon_spawns[room_name].copy()

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    game = AdventureGame()
    arcade.run()

import pygame
import random
from array import *
import tkinter as tk
import time

def assignColor(value):
      #if (value < 5)
        #    return (0,200,23)
      return (255,255,255)

#def freezeNumbers (board):
      
#def switchNumbers(board):

      
      #killNumbers(


#def killNumbers(board):




def checkNumbers(board):
      active_tiles = 0

      for r in range(5):
            for c in range(5):
                  if board[r][c] is not None:
                        active_tiles += 1
                        if board[r][c] >= 12:
                              return False

      if active_tiles <= 1:
            return False

      return True

def cycleNumbers(board, frozen=None):
      # Rotate the outside ring counterclockwise and the next ring clockwise.
      oldBoard = [row[:] for row in board]
      oldFrozen = dict(frozen or {})
      nextFrozen = dict(oldFrozen)
      for layer, direction in ((0, 1), (1, -1)):
            last = 4 - layer
            positions = []

            for column in range(layer, last + 1):
                  positions.append((layer, column))
            for row in range(layer + 1, last + 1):
                  positions.append((row, last))
            for column in range(last - 1, layer - 1, -1):
                  positions.append((last, column))
            for row in range(last - 1, layer, -1):
                  positions.append((row, layer))

            for position in positions:
                  nextFrozen.pop(position, None)

            for index, (row, column) in enumerate(positions):
                  source = positions[(index + direction) % len(positions)]
                  source_value = oldBoard[source[0]][source[1]]
                  board[row][column] = source_value
                  source_position = (source[0], source[1])
                  if source_position in oldFrozen:
                        nextFrozen[(row, column)] = oldFrozen[source_position]

      for r in range(5):
            for c in range(5):
                  if board[r][c] is not None and (r, c) not in nextFrozen:
                        board[r][c] = board[r][c] + 1

      if frozen is not None:
            frozen.clear()
            frozen.update(
                  (position, remaining - 1)
                  for position, remaining in nextFrozen.items()
                  if remaining > 1
            )

      return board, nextFrozen

#def displayBoard(board):


      

def __init__(self, parent, **kwargs):
      super().__init__(parent, **kwargs)

      # Bind the mouse click and drag events
      self.bind("<Button-1>", self.on_start)
      self.bind("<B1-Motion>", self.on_drag)

def on_start(self, event):

      # Store the initial mouse pointer position relative to the widget
      self.start_x = event.x
      self.start_y = event.y

def on_drag(self, event):

      # Calculate how far the mouse has moved
      deltax = event.x - self.start_x
      deltay = event.y - self.start_y
# Determine the widget's new absolute position
      x = self.winfo_x() + deltax
      y = self.winfo_y() + deltay

# Move the widget to the new position
      self.place(x=x, y=y)

def get_cell_at_mouse(pos):
      mouse_x, mouse_y = pos
      if mouse_x < BOARD_LEFT or mouse_y < BOARD_TOP:
            return None
      column = (mouse_x - BOARD_LEFT) // (CELL_SIZE + CELL_GAP)
      row = (mouse_y - BOARD_TOP) // (CELL_SIZE + CELL_GAP)
      if 0 <= row < 5 and 0 <= column < 5:
            cell_x = BOARD_LEFT + column * (CELL_SIZE + CELL_GAP)
            cell_y = BOARD_TOP + row * (CELL_SIZE + CELL_GAP)
            if cell_x <= mouse_x <= cell_x + CELL_SIZE and cell_y <= mouse_y <= cell_y + CELL_SIZE:
                  return (row, column)
      return None


def draw_board(board, selected=None, frozen=None):
      selected = set(selected or [])
      frozen = set(frozen or [])
      for row in range(5):
            for column in range(5):
                  x = BOARD_LEFT + column * (CELL_SIZE + CELL_GAP)
                  y = BOARD_TOP + row * (CELL_SIZE + CELL_GAP)
                  value = board[row][column]
                  if value is None:
                        cell_color = red if (row, column) in selected else lightTan
                        pygame.draw.rect(screen, cell_color, [x, y, CELL_SIZE, CELL_SIZE])
                        pygame.draw.rect(screen, white, [x, y, CELL_SIZE, CELL_SIZE], 2)
                        continue
                  if (row, column) in frozen:
                        cell_color = blue
                  elif (row, column) in selected:
                        cell_color = red
                  else:
                        cell_color = lightTan
                  pygame.draw.rect(screen, cell_color, [x, y, CELL_SIZE, CELL_SIZE])
                  pygame.draw.rect(screen, white, [x, y, CELL_SIZE, CELL_SIZE], 2)
                  draw_tile_number(value, x, y)
      draw_help_button()


def draw_tile_number(value, x, y):
      font = pygame.font.SysFont(None, 180)
      if value >= 10:
            font = pygame.font.SysFont(None, 170)

      text = font.render(str(value), True, black)
      offset_x = 0 if value >= 10 else 15
      offset_y = 15 if value >= 10 else 15
      screen.blit(text, [x + offset_x, y + offset_y])


def draw_help_button():
      pygame.draw.circle(screen, white, HELP_BUTTON_RECT.center, 20, 2)
      font = pygame.font.SysFont(None, 36)
      question_mark = font.render("?", True, white)
      screen.blit(question_mark, question_mark.get_rect(center=HELP_BUTTON_RECT.center))


def draw_back_button():
      pygame.draw.line(screen, white, (55, 40), (25, 40), 4)
      pygame.draw.line(screen, white, (25, 40), (38, 27), 4)
      pygame.draw.line(screen, white, (25, 40), (38, 53), 4)


def handle_help_click(position, board, selected=None, frozen=None):
      if not HELP_BUTTON_RECT.collidepoint(position):
            return False
      screen.fill(darkBlue)
      draw_back_button()
      font = pygame.font.SysFont(None, 52)
      title_font = pygame.font.SysFont(None, 72)
      title = title_font.render("Rules:", True, white)
      screen.blit(title, (430, 20))

      Text = font.render("1. The objective is to eliminate all tiles until there is", True, white)
      screen.blit(Text, (20, 110))
      Text = font.render("one tile left and to not let any tile's number reach 12.", True, white)
      screen.blit(Text, (20, 157))

      Text = font.render("2. To start a turn, select two tiles to swap, then", True, white)
      screen.blit(Text, (20, 224))
      Text = font.render("select two tiles to freeze for one turn.", True, white)
      screen.blit(Text, (20, 271))

      Text = font.render("3. If two tiles that are adjacent and have the same", True, white)
      screen.blit(Text, (20, 338))
      Text = font.render("number swap, then both tiles will be eliminated.", True, white)
      screen.blit(Text, (20, 385))

      Text = font.render("4. After the player's turn ends, tiles on the outer circle", True, white)
      screen.blit(Text, (20, 452))
      Text = font.render("will move counter-clockwise, tiles on the inner circle", True, white)
      screen.blit(Text, (20, 499))
      Text = font.render("will move clockwise, and the middle tile will not move.", True, white)
      screen.blit(Text, (20, 546))
      Text = font.render("All non-eliminated tiles will then count up one number.", True, white)
      screen.blit(Text, (20, 593))

      Text = font.render("5. Repeat until either all but one tile is left or a tile", True, white)
      screen.blit(Text, (20, 650))
      Text = font.render("reaches 15.", True, white)
      screen.blit(Text, (20, 697))
      pygame.display.flip()
      while True:
            for event in pygame.event.get():
                  if event.type == pygame.QUIT:
                        pygame.quit()
                        raise SystemExit
                  if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                        if BACK_BUTTON_RECT.collidepoint(event.pos):
                              screen.fill(darkBlue)
                              draw_board(board, selected, frozen)
                              pygame.display.flip()
                              return True
            pygame.time.delay(20)


def is_adjacent(a, b):
      return abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1


def freezeAfterSwap(board, frozen, freeze_count=1):
      selected_freezes = []
      while True:
            for event in pygame.event.get():
                  if event.type == pygame.QUIT:
                        pygame.quit()
                        raise SystemExit
                  if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                        if handle_help_click(event.pos, board, frozen=frozen):
                              continue
                        cell = get_cell_at_mouse(event.pos)
                        if cell is None or board[cell[0]][cell[1]] is None:
                              continue
                        if cell in selected_freezes:
                              selected_freezes.remove(cell)
                              frozen.pop(cell, None)
                        elif cell in frozen:
                              continue
                        elif len(selected_freezes) < freeze_count:
                              selected_freezes.append(cell)
                              frozen[cell] = 1
                        draw_board(board, frozen=frozen)
                        pygame.display.flip()
                        if len(selected_freezes) >= freeze_count:
                              return
            pygame.time.delay(20)


def playerTurn(board, frozen):
      selected = []
      while len(selected) < 2:
            for event in pygame.event.get():
                  if event.type == pygame.QUIT:
                        pygame.quit()
                        raise SystemExit
                  if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                        if handle_help_click(event.pos, board, selected, frozen):
                              continue
                        cell = get_cell_at_mouse(event.pos)
                        if cell is not None and cell not in frozen:
                              if cell in selected:
                                    selected.remove(cell)
                              elif len(selected) < 2:
                                    selected.append(cell)
                              draw_board(board, selected, frozen)
                              pygame.display.flip()

            pygame.time.delay(20)

      first_row, first_col = selected[0]
      second_row, second_col = selected[1]

      first_value = board[first_row][first_col]
      second_value = board[second_row][second_col]
      first_position = (first_row, first_col)
      second_position = (second_row, second_col)
      first_frozen = frozen.pop(first_position, None)
      second_frozen = frozen.pop(second_position, None)

      board[first_row][first_col], board[second_row][second_col] = second_value, first_value
      if second_frozen is not None:
            frozen[first_position] = second_frozen
      if first_frozen is not None:
            frozen[second_position] = first_frozen

      matched = first_value == second_value and is_adjacent(selected[0], selected[1])
      if matched:
            board[first_row][first_col] = None
            board[second_row][second_col] = None
            if sum(1 for row in board for cell in row if cell is not None) <= 1:
                  return "won"
            draw_board(board, frozen=frozen)
            pygame.display.flip()
            pygame.time.delay(300)
            freezeAfterSwap(board, frozen, 2)
            old_board = [row[:] for row in board]
            _, animation_frozen = cycleNumbers(board, frozen)
            animate_cycle(old_board, board, animation_frozen)
            return True

      draw_board(board, frozen=frozen)
      pygame.display.flip()
      freezeAfterSwap(board, frozen, 2)
      draw_board(board, frozen=frozen)
      pygame.display.flip()
      pygame.time.delay(300)
      return False


def animate_cycle(old_board, new_board, frozen=None):
      frozen_positions = set(frozen or {})
      moving_tiles = []
      moving_positions = set()
      for layer, direction in ((0, 1), (1, -1)):
            last = 4 - layer
            positions = []
            for column in range(layer, last + 1):
                  positions.append((layer, column))
            for row in range(layer + 1, last + 1):
                  positions.append((row, last))
            for column in range(last - 1, layer - 1, -1):
                  positions.append((last, column))
            for row in range(last - 1, layer, -1):
                  positions.append((row, layer))
            moving_positions.update(positions)
            for index, destination in enumerate(positions):
                  source = positions[(index + direction) % len(positions)]
                  source_value = old_board[source[0]][source[1]]
                  moving_tiles.append((source_value, source, destination))

      clock = pygame.time.Clock()
      for progress in range(0, 101, 4):
            screen.fill(darkBlue)
            for row in range(5):
                  for column in range(5):
                        x = BOARD_LEFT + column * (CELL_SIZE + CELL_GAP)
                        y = BOARD_TOP + row * (CELL_SIZE + CELL_GAP)
                        if (row, column) in moving_positions:
                              cell_color = darkBlue
                        elif (row, column) in frozen_positions:
                              cell_color = blue
                        else:
                              cell_color = lightTan
                        pygame.draw.rect(screen, cell_color, [x, y, CELL_SIZE, CELL_SIZE])
                        value = new_board[row][column]
                        if value is not None and (row, column) not in moving_positions:
                              draw_tile_number(value, x, y)

            amount = progress / 100
            for value, source, destination in moving_tiles:
                  source_x = BOARD_LEFT + source[1] * (CELL_SIZE + CELL_GAP)
                  source_y = BOARD_TOP + source[0] * (CELL_SIZE + CELL_GAP)
                  destination_x = BOARD_LEFT + destination[1] * (CELL_SIZE + CELL_GAP)
                  destination_y = BOARD_TOP + destination[0] * (CELL_SIZE + CELL_GAP)
                  x = source_x + (destination_x - source_x) * amount
                  y = source_y + (destination_y - source_y) * amount

                  cell_color = blue if destination in frozen_positions else lightTan
                  pygame.draw.rect(screen, cell_color, [round(x), round(y), CELL_SIZE, CELL_SIZE])
                  if value is not None:
                        display_value = value if destination in frozen_positions else value + 1
                        draw_tile_number(display_value, round(x), round(y))

            pygame.display.flip()
            for event in pygame.event.get():
                  if event.type == pygame.QUIT:
                        pygame.quit()
                        raise SystemExit
            clock.tick(40)

def initialize_game():
    screen.fill(darkBlue)
    global board, frozen
    board = [[random.randint(1, 3) for _ in range(5)] for _ in range(5)]
    frozen = {}
    return board, frozen


def play_game():
    global board, frozen
    initialize_game()
    while True:
        while any(cell is not None for row in board for cell in row) and checkNumbers(board):
            draw_board(board, frozen=frozen)
            pygame.display.flip()
            turn_result = playerTurn(board, frozen)
            if turn_result == "won":
                if not gameOver("won"):
                    break
                initialize_game()
                continue
            if turn_result is False:
                old_board = [row[:] for row in board]
                _, animation_frozen = cycleNumbers(board, frozen)
                animate_cycle(old_board, board, animation_frozen)
        if not checkNumbers(board):
            active_tiles = sum(1 for row in board for cell in row if cell is not None)
            if active_tiles <= 1:
                if not gameOver("won"):
                    break
            else:
                if not gameOver("lost"):
                    break

def gameOver(outcome="lost"):
    font = pygame.font.SysFont(None, 70)
    screen.fill(darkBlue)
    if outcome == "won":
        endText = font.render("You won", True, white)
    else:
        endText = font.render("Game over, you lost", True, white)
    screen.blit(endText, (100, 300))
    endText = font.render("Press Enter to play again", True, white)
    screen.blit(endText, (100, 400))
    pygame.display.flip()
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return False
            if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
                initialize_game()
                return True

# Set up the window
#root = tk.Tk()
#root.geometry("400x400")

# Create a draggable widget
#label = DraggableLabel(root, text="Drag Me!", bg="lightblue", width=10, height=2)
#label.place(x=50, y=50)

#root.mainloop()

      
       

#def assignColor(n):
      

      # goes from light blue (good) to white (middle)
      # to red (bad) with higher numbers being worse
      
#def createBoard(board):

# eventually add way for player to stop suspend timers from 
# going up and player wins by suspending for long enough
# or eliminating threat

pygame.init()

white = (255,255,255)
black = (0,0,0)
green = (0,150,30)
blue = (0,200,230)
red = (255,0,0)
purple = (150,0,150)
yellow = (255,200,0)
lime = (0,200,0)
darkTan = (200,200,230)
lightTan = (250,250,230)
darkBlue = (20,20,150)


size = (1000,800)
pygame.display.set_caption("Survival")
screen = pygame.display.set_mode(size)
screen.fill(darkBlue)

CELL_SIZE = 130
CELL_GAP = 20
BOARD_LEFT = 150
BOARD_TOP = 20
HELP_BUTTON_RECT = pygame.Rect(940, 20, 40, 40)
BACK_BUTTON_RECT = pygame.Rect(15, 15, 55, 50)


play_game()

pygame.quit()

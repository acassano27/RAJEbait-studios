"""A simple tic-tac-toe game built with Tkinter.

Copilot coded the core of this as a text-based game.
I made some changes, then asked it how to make it a GUI game. It did.
Then I fiddled with that, just to understand how it works. I also
asked it to simplify some Python that I didn't understand, using more 
explicit syntax like nested for loops instead of list comprehensions.

"""
import random
import tkinter as tk
from tkinter import messagebox

BOARD_SIZE = 3
COMPUTER_MISTAKE_CHANCE = 0.05


def create_board():
    board = []

    for i in range(BOARD_SIZE):
        row = []
        for j in range(BOARD_SIZE):
            row.append(i * BOARD_SIZE + j + 1)
        board.append(row)

    return board


def is_occupied(cell):
    return cell == "X" or cell == "O"


def print_board(board):
    print()
    for i, row in enumerate(board):
        print(" " + " | ".join(str(cell) for cell in row))
        if i < len(board) - 1:
            print("-" * 12)
    print()


def check_winner(board):
    # Check rows
    for row in board:
        if is_occupied(row[0]) and row[0] == row[1] == row[2]:
            return row[0]

    # Check columns
    for col in range(BOARD_SIZE):
        if is_occupied(board[0][col]) and board[0][col] == board[1][col] == board[2][col]:
            return board[0][col]

    # Check diagonals
    if is_occupied(board[0][0]) and board[0][0] == board[1][1] == board[2][2]:
        return board[0][0]

    if is_occupied(board[0][2]) and board[0][2] == board[1][1] == board[2][0]:
        return board[0][2]

    return None


def is_full(board):
    return all(is_occupied(cell) for row in board for cell in row)


def available_moves(board):
    moves = []

    for row in range(BOARD_SIZE):
        for col in range(BOARD_SIZE):
            if board[row][col] not in ("X", "O"):
                moves.append(row * BOARD_SIZE + col + 1)

    return moves


def clone_board(board):
    cloned_board = []

    for row in board:
        cloned_board.append(row[:])

    return cloned_board


def place_move(board, position, player):
    row = (position - 1) // BOARD_SIZE
    col = (position - 1) % BOARD_SIZE

    if is_occupied(board[row][col]):
        return False

    board[row][col] = player
    return True


def minimax(board, current_player):
    winner = check_winner(board)

    if winner == "O":
        return 1

    if winner == "X":
        return -1

    if is_full(board):
        return 0

    if current_player == "O":
        best_score = -10

        for move in available_moves(board):
            next_board = clone_board(board)
            place_move(next_board, move, "O")
            score = minimax(next_board, "X")
            best_score = max(best_score, score)

        return best_score

    best_score = 10

    for move in available_moves(board):
        next_board = clone_board(board)
        place_move(next_board, move, "X")
        score = minimax(next_board, "O")
        best_score = min(best_score, score)

    return best_score


def choose_best_move(board):
    scored_moves = []

    for move in available_moves(board):
        next_board = clone_board(board)
        place_move(next_board, move, "O")
        score = minimax(next_board, "X")
        scored_moves.append((move, score))

    if not scored_moves:
        return None

    best_score = max(score for _, score in scored_moves)
    best_moves = [move for move, score in scored_moves if score == best_score]

    # Let the computer make a small number of "mistakes" so the player
    # has a reasonable chance of winning.
    if random.random() < COMPUTER_MISTAKE_CHANCE:
        non_best_moves = [move for move, score in scored_moves if score != best_score]

        if non_best_moves:
            return random.choice(non_best_moves)

    return random.choice(best_moves)


def main():
    root = tk.Tk()
    root.title("Tic-Tac-Toe")
    root.geometry("405x480")
    root.resizable(False, False)

    root.withdraw()
    one_player_mode = messagebox.askyesno(
        "Game Mode",
        "Would you like to play against the computer?",
    )
    root.deiconify()

    board = create_board()
    current_player = "X"
    buttons = []

    status_label = tk.Label(root, text="Player X's turn", font=("Arial", 12))
    status_label.grid(row=3, column=0, columnspan=3, pady=(10, 0))

    def disable_buttons():
        for button in buttons:
            button.config(state=tk.DISABLED)

    def reset_game():
        nonlocal current_player

        board[:] = create_board()
        current_player = "X"

        for button in buttons:
            button.config(text="", state=tk.NORMAL)

        status_label.config(text="Player X's turn")

    def computer_turn():
        move = choose_best_move(board)

        if move is not None:
            handle_move(move)

    def handle_move(position):
        nonlocal current_player

        if not place_move(board, position, current_player):
            return

        button_index = position - 1

        if current_player == "X":
            buttons[button_index].config(
                text=current_player,
                state=tk.DISABLED,
                disabledforeground="#00ABAA",
            )
        else:
            buttons[button_index].config(
                text=current_player,
                state=tk.DISABLED,
                disabledforeground="#F7A05B",
            )

        winner = check_winner(board)
        if winner:
            status_label.config(text=f"Player {winner} wins!")
            disable_buttons()
            return

        if is_full(board):
            status_label.config(text="It's a draw!")
            disable_buttons()
            return

        current_player = "O" if current_player == "X" else "X"

        if one_player_mode and current_player == "O":
            status_label.config(text="Computer's turn")
            root.after(300, computer_turn)
        else:
            status_label.config(text=f"Player {current_player}'s turn")

    def on_click(index):
        if one_player_mode and current_player == "O":
            return

        handle_move(index + 1)

    for i in range(9):
        button = tk.Button(
            root,
            text="",
            font=("Arial", 28, "bold"),
            fg="#877A78",
            bg="#FEDF86",
            width=5,
            height=2,
            command=lambda index=i: on_click(index),
        )
        button.grid(row=i // 3, column=i % 3, padx=5, pady=5)
        buttons.append(button)

    reset_button = tk.Button(root, text="Reset", command=reset_game, font=("Arial", 11))
    reset_button.grid(row=4, column=0, columnspan=3, pady=(10, 0))

    root.mainloop()


if __name__ == "__main__":
    main()

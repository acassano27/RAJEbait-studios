import random
import tkinter as tk

quotes = [
    "Your GPA is just a number. It doesn't define you.",
    "An acorn can grow into a mighty oak.",
    "Go Bucs!",
    "A Buccaneer is never alone.",
    "You are an academic superstar.",
    "Don't forget that Bucky loves you!",
    "You are COUNTRY DAY READY!"

]

def show_quote():
    quote = random.choice(quotes)
    result_label.config(text=quote)

root = tk.Tk()
root.title("Mental Health Booster")
root.geometry("500x250")
root.resizable(False, False)

title = tk.Label(root, text="Mental Health Booster", font=("Arial", 18))
title.pack(pady=(20, 10))

result_label = tk.Label(
    root,
    text="Press the button for a little encouragement.",
    wraplength=420,
    justify="center",
    font=("Arial", 16, "bold"),
)
result_label.pack(pady=10)

button = tk.Button(
    root,
    text="Give me encouragement",
    command=show_quote,
    font=("Arial", 12),
    padx=20,
    pady=10,
)
button.pack()

root.mainloop()
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const todos = useQuery(api.todos.list)
  const addTodo = useMutation(api.todos.add)
  const toggleTodo = useMutation(api.todos.toggle)
  const removeTodo = useMutation(api.todos.remove)
  const [text, setText] = useState('')

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-6 text-3xl font-semibold">Todos</h1>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = text.trim()
          if (!trimmed) return
          addTodo({ text: trimmed })
          setText('')
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a todo…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          Add
        </button>
      </form>

      {todos === undefined ? (
        <p className="text-gray-500">Loading…</p>
      ) : todos.length === 0 ? (
        <p className="text-gray-500">No todos yet.</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo._id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo({ id: todo._id })}
              />
              <span
                className={
                  todo.completed ? 'flex-1 text-gray-400 line-through' : 'flex-1'
                }
              >
                {todo.text}
              </span>
              <button
                onClick={() => removeTodo({ id: todo._id })}
                className="text-gray-400 hover:text-red-500"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

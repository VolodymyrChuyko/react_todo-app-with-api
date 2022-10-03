/* eslint-disable jsx-a11y/control-has-associated-label */
import classNames from 'classnames';
import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  deleteTodo,
  getTodos,
  patchTodoStatus,
  patchTodoTitle,
  postTodo,
} from './api/todos';
import { AuthContext } from './components/Auth/AuthContext';
import { Filter } from './components/Filter';
import { TodoList } from './components/TodoList';

import { FilterStatus } from './types/Filter';
import { Todo } from './types/Todo';

const getTodoById = (todos: Todo[], todoId: number) => {
  return todos.find(({ id }) => id === todoId) || null;
};

const filterTodos = (todos: Todo[], filterStatus: FilterStatus) => {
  switch (filterStatus) {
    case 'all': return todos;
    case 'active': return todos.filter(({ completed }) => !completed);
    case 'completed': return todos.filter(({ completed }) => completed);
    default: throw new Error('Error: Filter todos');
  }
};

export const App: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const user = useContext(AuthContext);
  const newTodoField = useRef<HTMLInputElement>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [visibleTodos, setVisibleTodos] = useState<Todo[]>(todos);
  const [newTodoTitle, setNewTodoTitle] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState<number[]>([]);
  const [error, setError] = useState('');

  const activeTodosCount = filterTodos(todos, 'active').length;

  const showErrorMessage = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 3000);
  };

  const handleNewTodoTitle = (event: React.ChangeEvent<HTMLInputElement>) => (
    setNewTodoTitle(event.target.value)
  );

  const handleStatusChange = async (todoId: number) => {
    setError('');
    setIsProcessing(prevIds => [...prevIds, todoId]);
    try {
      const targetTodo = getTodoById(todos, todoId);

      if (targetTodo) {
        await patchTodoStatus(
          todoId,
          { completed: !targetTodo.completed },
        );

        setTodos(prevTodos => {
          targetTodo.completed = !targetTodo.completed;

          return prevTodos;
        });
      }
    } catch {
      showErrorMessage('Unable to update a todo');
    } finally {
      setIsProcessing(prevIds => prevIds.filter(id => id !== todoId));
    }
  };

  const handleTitleChange = async (todoId: number, newTitle: string) => {
    const targetTodo = getTodoById(todos, todoId);

    if (targetTodo) {
      setError('');
      setIsProcessing(prevIds => [...prevIds, todoId]);
      try {
        await patchTodoTitle(
          todoId,
          { title: newTitle },
        );

        setTodos(prevTodos => {
          targetTodo.title = newTitle;

          return prevTodos;
        });
      } catch {
        showErrorMessage('Unable to update a todo');
      } finally {
        setIsProcessing(prevIds => prevIds.filter(id => id !== todoId));
      }
    }
  };

  const handleToggleAll = () => {
    todos.forEach(todo => {
      if (activeTodosCount === 0 || !todo.completed) {
        handleStatusChange(todo.id);
      }
    });
  };

  const handleCloseError = () => {
    setError('');
  };

  const handleAddNewTodo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!newTodoTitle) {
      showErrorMessage('Title can\'t be empty');

      return;
    }

    if (user) {
      const newTodoData = {
        id: 0,
        userId: user.id,
        title: newTodoTitle,
        completed: false,
      };

      setIsAdding(true);
      setTodos(prevTodos => [...prevTodos, newTodoData]);
      try {
        const newTodo = await postTodo(newTodoData);

        setTodos(prevTodos => [...prevTodos, newTodo]);
        setNewTodoTitle('');
      } catch {
        showErrorMessage('Unable to add a todo');
      } finally {
        setTodos(copyTodos => copyTodos.filter(todo => todo.id !== 0));
      }

      setIsAdding(false);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    setError('');
    setIsProcessing(prevIds => [...prevIds, todoId]);

    try {
      await deleteTodo(todoId);
      setTodos(copyTodos => copyTodos.filter(todo => todo.id !== todoId));
    } catch {
      showErrorMessage('Unable to delete a todo');
    } finally {
      setIsProcessing(prevIds => prevIds.filter(id => id !== todoId));
    }
  };

  const handleClearCompleted = () => {
    setError('');
    todos.forEach(todo => {
      if (todo.completed) {
        handleDeleteTodo(todo.id);
      }
    });
  };

  useEffect(() => {
    const loadTodos = async () => {
      if (user) {
        try {
          const todosFromServer = await getTodos(user.id);

          setTodos(todosFromServer);
        } catch {
          showErrorMessage('Unable to load a todos');
        }
      }
    };

    loadTodos();
  }, []);

  useEffect(() => {
    setVisibleTodos(filterTodos(todos, filterStatus));
  }, [todos, filterStatus, error]);

  useEffect(() => {
    // focus the element with `ref={newTodoField}`
    if (newTodoField.current) {
      newTodoField.current.focus();
    }
  }, [todos]);

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              data-cy="ToggleAllButton"
              type="button"
              className={classNames(
                'todoapp__toggle-all',
                { active: activeTodosCount === 0 },
              )}
              onClick={handleToggleAll}
            />
          )}

          <form
            onSubmit={handleAddNewTodo}
          >
            <input
              data-cy="NewTodoField"
              type="text"
              ref={newTodoField}
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={handleNewTodoTitle}
              disabled={isAdding}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          <TodoList
            todos={visibleTodos}
            isProcessing={isProcessing}
            onStatusChange={handleStatusChange}
            onTitleChange={handleTitleChange}
            onDeleteTodo={handleDeleteTodo}
          />
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="todosCounter">
              {`${activeTodosCount} items left`}
            </span>

            <Filter filterStatus={filterStatus} onFilter={setFilterStatus} />

            <button
              data-cy="ClearCompletedButton"
              type="button"
              className="todoapp__clear-completed"
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification',
          'is-danger',
          'is-light',
          'has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={handleCloseError}
        />

        {error}
      </div>
    </div>
  );
};
